/*
 * ClearURLs
 * Copyright (c) 2017-2021 Kevin Röbert
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jshint esversion: 6 */
/*
* This script is responsible for the core functionalities.
*/
var providers = [];
var prvKeys = [];
var siteBlockedAlert = 'javascript:void(0)';
var dataHash;
var localDataHash;
var os;

/**
 * Helper function which remove the tracking fields
 * for each provider given as parameter.
 *
 * @param  {Provider} provider      Provider-Object
 * @param pureUrl                   URL as String
 * @param {boolean} quiet           if the action should be displayed in log and statistics
 * @param {requestDetails} request  the request details
 * @return {Array}                  Array with changes and url fields
 */
function removeFieldsFormURL(provider, pureUrl, quiet = false, request = null) {
    let url = pureUrl;
    let domain = "";
    let fragments = "";
    let fields = "";
    let rules = provider.getRules();
    let changes = false;
    let rawRules = provider.getRawRules();
    let urlObject = new URL(url);

    if (storage.localHostsSkipping && checkLocalURL(urlObject)) {
        return {
            "changes": false,
            "url": url,
            "cancel": false
        }
    }

    /*
    * Expand the url by provider redirections. So no tracking on
    * url redirections form sites to sites.
    */
    let re = provider.getRedirection(url);
    if (re !== null) {
        url = decodeURL(re);

        //Log the action
        if (!quiet) {
            pushToLog(pureUrl, url, translate('log_redirect'));
            increaseTotalCounter(1);
            increaseBadged(false, request)
        }

        return {
            "redirect": true,
            "url": url
        }
    }

    if (provider.isCaneling() && storage.domainBlocking) {
        if (!quiet) pushToLog(pureUrl, pureUrl, translate('log_domain_blocked'));
        increaseTotalCounter(1);
        increaseBadged(quiet, request);
        return {
            "cancel": true,
            "url": url
        }
    }

    /*
    * Apply raw rules to the URL.
    */
    rawRules.forEach(function (rawRule) {
        let beforeReplace = url;
        url = url.replace(new RegExp(rawRule, "gi"), "");

        if (beforeReplace !== url) {
            //Log the action
            if (storage.loggingStatus && !quiet) {
                pushToLog(beforeReplace, url, rawRule);
            }

            increaseBadged(quiet, request);
            changes = true;
        }
    });

    urlObject = new URL(url);
    fields = urlObject.searchParams;
    fragments = extractFragments(urlObject);
    domain = urlWithoutParamsAndHash(urlObject).toString();

    /**
     * Only test for matches, if there are fields or fragments that can be cleaned.
     */
    if (fields.toString() !== "" || fragments.toString() !== "") {
        rules.forEach(rule => {
            const beforeFields = fields.toString();
            const beforeFragments = fragments.toString();
            let localChange = false;

            for (const field of fields.keys()) {
                if (new RegExp("^"+rule+"$", "gi").test(field)) {
                    fields.delete(field);
                    changes = true;
                    localChange = true;
                }
            }

            for (const fragment of fragments.keys()) {
                if (new RegExp("^"+rule+"$", "gi").test(fragment)) {
                    fragments.delete(fragment);
                    changes = true;
                    localChange = true;
                }
            }

            //Log the action
            if (localChange && storage.loggingStatus) {
                let tempURL = domain;
                let tempBeforeURL = domain;

                if (fields.toString() !== "") tempURL += "?" + fields.toString();
                if (fragments.toString() !== "") tempURL += "#" + fragments.toString();
                if (beforeFields.toString() !== "") tempBeforeURL += "?" + beforeFields.toString();
                if (beforeFragments.toString() !== "") tempBeforeURL += "#" + beforeFragments.toString();

                if (!quiet) pushToLog(tempBeforeURL, tempURL, rule);

                increaseBadged(quiet, request);
            }
        });

        let finalURL = domain;

        if (fields.toString() !== "") finalURL += "?" + urlSearchParamsToString(fields);
        if (fragments.toString() !== "") finalURL += "#" + fragments.toString();

        url = finalURL.replace(/\?&/, "?").replace(/#&/, "#");
    }



    return {
        "changes": changes,
        "url": url
    }
}

const DNR_ETAG_RULE_ID = 99999;
const DNR_MAX_REGEX_RULES = 1000;
const DNR_MAX_UNSAFE_RULES = 5000;
const DNR_RESOURCE_TYPES = [
    "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
    "object", "xmlhttprequest", "ping", "media", "websocket", "other"
];
const DNR_LOCAL_HOST_EXCLUSIONS = ["localhost", "127.0.0.1"];
let rulesReadyPromise = Promise.resolve();
let dnrRebuildPromise = Promise.resolve();

/**
 * Represents one provider from the downloaded ClearURLs rule catalog.
 */
function Provider(_name, _completeProvider = false, _forceRedirection = false, _isActive = true) {
    const name = _name;
    let urlPattern;
    const enabledRules = {};
    const disabledRules = {};
    const enabledExceptions = {};
    const disabledExceptions = {};
    const enabledRedirections = {};
    const disabledRedirections = {};
    const enabledRawRules = {};
    const disabledRawRules = {};
    const enabledReferralMarketing = {};
    const disabledReferralMarketing = {};
    const methods = [];
    const canceling = _completeProvider;
    const active = _isActive;

    if (_completeProvider) {
        enabledRules[".*"] = true;
    }

    this.shouldForceRedirect = function () {
        return _forceRedirection;
    };

    this.getName = function () {
        return name;
    };

    this.setURLPattern = function (urlPatterns) {
        urlPattern = new RegExp(urlPatterns, "i");
    };

    this.isCaneling = function () {
        return canceling;
    };

    this.matchURL = function (url) {
        return active && urlPattern.test(url) && !this.matchException(url);
    };

    this.applyRule = function (enabledRuleArray, disabledRuleArray, rule, isActive = true) {
        if (isActive) {
            enabledRuleArray[rule] = true;
            delete disabledRuleArray[rule];
        } else {
            disabledRuleArray[rule] = true;
            delete enabledRuleArray[rule];
        }
    };

    this.addRule = function (rule, isActive = true) {
        this.applyRule(enabledRules, disabledRules, rule, isActive);
    };

    this.getRules = function () {
        if (!storage.referralMarketing) {
            return Object.keys({...enabledRules, ...enabledReferralMarketing});
        }
        return Object.keys(enabledRules);
    };

    this.addRawRule = function (rule, isActive = true) {
        this.applyRule(enabledRawRules, disabledRawRules, rule, isActive);
    };

    this.getRawRules = function () {
        return Object.keys(enabledRawRules);
    };

    this.addReferralMarketing = function (rule, isActive = true) {
        this.applyRule(enabledReferralMarketing, disabledReferralMarketing, rule, isActive);
    };

    this.addException = function (exception, isActive = true) {
        this.applyRule(enabledExceptions, disabledExceptions, exception, isActive);
    };

    this.addMethod = function (method) {
        if (!methods.includes(method)) {
            methods.push(method);
        }
    };

    this.matchMethod = function (details) {
        return methods.length === 0 || methods.includes(details.method);
    };

    this.matchException = function (url) {
        if (url === siteBlockedAlert) {
            return true;
        }
        return Object.keys(enabledExceptions).some(
            exception => new RegExp(exception, "i").test(url)
        );
    };

    this.addRedirection = function (redirection, isActive = true) {
        this.applyRule(enabledRedirections, disabledRedirections, redirection, isActive);
    };

    this.getRedirections = function () {
        return Object.keys(enabledRedirections);
    };

    this.getRedirection = function (url) {
        for (const redirection of this.getRedirections()) {
            const result = new RegExp(redirection, "i").exec(url);
            if (result?.[1]) {
                return result[1];
            }
        }
        return null;
    };
}

/**
 * Returns the provider keys without mutating global state.
 */
function getKeys(obj) {
    return Object.keys(obj || {});
}

function addProviderRules(provider, providerData) {
    getOrDefault(providerData, "rules", []).forEach(rule => provider.addRule(rule));
    getOrDefault(providerData, "rawRules", []).forEach(rule => provider.addRawRule(rule));
    getOrDefault(providerData, "referralMarketing", [])
        .forEach(rule => provider.addReferralMarketing(rule));
    getOrDefault(providerData, "exceptions", [])
        .forEach(exception => provider.addException(exception));
    getOrDefault(providerData, "redirections", [])
        .forEach(redirection => provider.addRedirection(redirection));
    getOrDefault(providerData, "methods", [])
        .forEach(method => provider.addMethod(method));
}

function createProviders() {
    const providerCatalog = storage.ClearURLsData?.providers || {};
    prvKeys = getKeys(providerCatalog);
    providers = prvKeys.map(key => {
        const providerData = providerCatalog[key];
        const provider = new Provider(
            key,
            getOrDefault(providerData, "completeProvider", false),
            getOrDefault(providerData, "forceRedirection", false)
        );
        provider.setURLPattern(getOrDefault(providerData, "urlPattern", ""));
        addProviderRules(provider, providerData);
        return provider;
    });
}

function hasRuleData() {
    return Boolean(storage.ClearURLsData?.providers);
}

function optimizeDnrRegex(regexFilter) {
    // RE2 expands long fixed repetitions and can exceed Chrome's 2KB compiled
    // regex budget. This segment is an opaque hexadecimal hash, so accepting
    // one or more hex characters preserves the redirect boundary safely.
    return regexFilter.replace(/\[0-9a-f\]\{64\}/gi, "[0-9a-f]+");
}

function getDnrCondition(providerData, regexFilter, resourceTypes = DNR_RESOURCE_TYPES) {
    const condition = {
        regexFilter: optimizeDnrRegex(regexFilter),
        resourceTypes
    };
    const methods = getOrDefault(providerData, "methods", [])
        .map(method => String(method).toLowerCase());

    if (methods.length > 0) {
        condition.requestMethods = methods;
    }
    if (storage.localHostsSkipping) {
        condition.excludedRequestDomains = DNR_LOCAL_HOST_EXCLUSIONS;
    }
    return condition;
}

function createExceptionRules(providerData) {
    return getOrDefault(providerData, "exceptions", []).map(regexFilter => ({
        priority: 1000,
        action: {type: "allow"},
        condition: getDnrCondition(providerData, regexFilter)
    }));
}

function makeCapturesNonCapturing(pattern) {
    return pattern.replace(/(^|[^\\])\((?!\?)/g, "$1(?:");
}

function getProviderPrefixRegex(urlPattern) {
    if (urlPattern === ".*") {
        return "https?://";
    }

    const unanchored = urlPattern
        .replace(/^\^/, "")
        .replace(/\$$/, "")
        .replace(/\\\?$/, "");
    return makeCapturesNonCapturing(unanchored);
}

function createLiteralParameterRule(parameterRules, providerData, regexFilter) {
    const removeParams = parameterRules.filter(rule => /^[a-zA-Z0-9_-]+$/.test(rule));
    if (removeParams.length === 0) {
        return null;
    }
    return {
        priority: 10,
        action: {
            type: "redirect",
            redirect: {
                transform: {
                    queryTransform: {removeParams}
                }
            }
        },
        condition: getDnrCondition(providerData, regexFilter)
    };
}

function createRegexParameterRules(parameterRules, providerData, urlPattern) {
    const providerPrefix = getProviderPrefixRegex(urlPattern);
    return parameterRules
        .filter(rule => !/^[a-zA-Z0-9_-]+$/.test(rule))
        .flatMap(rule => {
            const parameterPattern = makeCapturesNonCapturing(rule);
            return [
                {
                    priority: 10,
                    action: {
                        type: "redirect",
                        redirect: {regexSubstitution: String.raw`\1\2`}
                    },
                    condition: getDnrCondition(
                        providerData,
                        "^((?:" + providerPrefix + ")[^#]*[?&])(?:" +
                            parameterPattern + ")=[^&#]*&(.+)$"
                    )
                },
                {
                    priority: 10,
                    action: {
                        type: "redirect",
                        redirect: {regexSubstitution: String.raw`\1\2`}
                    },
                    condition: getDnrCondition(
                        providerData,
                        "^((?:" + providerPrefix + ")[^#]*)(?:[?&])(?:" +
                            parameterPattern + ")=[^&#]*(#.*)?$"
                    )
                }
            ];
        });
}

function createParameterRules(provider, providerData, regexFilter) {
    const parameterRules = provider.getRules();
    const rules = createRegexParameterRules(parameterRules, providerData, regexFilter);
    const literalRule = createLiteralParameterRule(
        parameterRules,
        providerData,
        regexFilter
    );
    if (literalRule) {
        rules.unshift(literalRule);
    }
    return rules;
}

function createRedirectionRules(provider, providerData) {
    const redirectPage = chrome.runtime.getURL("html/redirect.html?target=");
    return provider.getRedirections().map(regexFilter => ({
        priority: 50,
        action: {
            type: "redirect",
            redirect: {regexSubstitution: redirectPage + String.raw`\1`}
        },
        condition: getDnrCondition(
            providerData,
            regexFilter,
            ["main_frame", "sub_frame"]
        )
    }));
}

function createRawRules(provider, providerData, urlPattern) {
    const providerPrefix = getProviderPrefixRegex(urlPattern);
    return provider.getRawRules().map(rawRule => ({
        priority: 10,
        action: {
            type: "redirect",
            redirect: {regexSubstitution: String.raw`\1\2`}
        },
        condition: getDnrCondition(
            providerData,
            "^((?:" + providerPrefix + ").*?)(?:" +
                makeCapturesNonCapturing(rawRule) + ")(.*)$"
        )
    }));
}

function createProviderDnrRules(provider, providerData) {
    const regexFilter = getOrDefault(providerData, "urlPattern", "");
    if (!regexFilter) {
        return [];
    }

    const rules = createExceptionRules(providerData);
    if (provider.isCaneling()) {
        if (storage.domainBlocking) {
            rules.push({
                priority: 100,
                action: {
                    type: "redirect",
                    redirect: {
                        regexSubstitution: chrome.runtime.getURL(
                            "html/siteBlockedAlert.html?source="
                        ) + String.raw`\0`
                    }
                },
                condition: getDnrCondition(
                    providerData,
                    regexFilter,
                    ["main_frame"]
                )
            }, {
                priority: 100,
                action: {type: "block"},
                condition: getDnrCondition(
                    providerData,
                    regexFilter,
                    DNR_RESOURCE_TYPES.filter(type => type !== "main_frame")
                )
            });
        }
        return rules;
    }

    rules.push(
        ...createParameterRules(provider, providerData, regexFilter),
        ...createRedirectionRules(provider, providerData),
        ...createRawRules(provider, providerData, regexFilter)
    );
    return rules;
}

function collectDeclarativeNetRequestRules() {
    if (!storage.globalStatus || !hasRuleData()) {
        return [];
    }

    const providerCatalog = storage.ClearURLsData.providers;
    const rules = providers.flatMap(
        (provider, index) => createProviderDnrRules(provider, providerCatalog[prvKeys[index]])
    );

    if (storage.localHostsSkipping) {
        rules.unshift({
            priority: 2000,
            action: {type: "allow"},
            condition: {
                regexFilter: String.raw`^https?://(?:localhost|\[::1\]|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?(?:/|$)`,
                resourceTypes: DNR_RESOURCE_TYPES
            }
        });
    }

    if (storage.pingBlocking) {
        rules.push({
            priority: 3000,
            action: {type: "block"},
            condition: {
                urlFilter: "*",
                resourceTypes: ["ping"]
            }
        });
    }
    return rules;
}

async function isSupportedRegexRule(rule) {
    if (!rule.condition.regexFilter ||
        !chrome.declarativeNetRequest.isRegexSupported) {
        return true;
    }

    try {
        const result = await chrome.declarativeNetRequest.isRegexSupported({
            regex: rule.condition.regexFilter,
            requireCapturing: Boolean(rule.action.redirect?.regexSubstitution)
        });
        if (!result.isSupported) {
            console.warn(
                "[ClearURLs] Skipping unsupported DNR regex:",
                rule.condition.regexFilter,
                result.reason
            );
        }
        return result.isSupported;
    } catch (error) {
        console.warn("[ClearURLs] Could not validate DNR regex:", error);
        return false;
    }
}

async function enforceDeclarativeNetRequestLimits(rules) {
    const support = await Promise.all(rules.map(isSupportedRegexRule));
    let regexCount = 0;
    let unsafeCount = 0;

    return rules.filter((rule, index) => {
        if (!support[index]) {
            return false;
        }
        if (rule.condition.regexFilter && ++regexCount > DNR_MAX_REGEX_RULES) {
            return false;
        }
        if (["redirect", "modifyHeaders"].includes(rule.action.type) &&
            ++unsafeCount > DNR_MAX_UNSAFE_RULES) {
            return false;
        }
        return true;
    });
}

function isCleaningRule(rule) {
    return rule.id !== DNR_ETAG_RULE_ID;
}

/**
 * Builds and atomically replaces only ClearURLs cleaning rules.
 * The reserved ETag rule is deliberately preserved.
 */
async function buildDeclarativeNetRequestRules() {
    const candidates = collectDeclarativeNetRequestRules();
    const rules = await enforceDeclarativeNetRequestLimits(candidates);
    rules.forEach((rule, index) => {
        rule.id = index + 1;
    });
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.filter(isCleaningRule).map(rule => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: rules
    });
    console.log("[ClearURLs] Installed " + rules.length + " DNR cleaning rules");
    return rules.length;
}

function rebuildDeclarativeNetRequestRules() {
    dnrRebuildPromise = dnrRebuildPromise
        .catch(handleError)
        .then(buildDeclarativeNetRequestRules);
    return dnrRebuildPromise;
}

function installRuleData() {
    createProviders();
    return rebuildDeclarativeNetRequestRules();
}

/**
 * Deactivates ClearURLs only when neither remote nor cached rules are available.
 */
function deactivateOnFailure() {
    if (hasRuleData()) {
        return installRuleData();
    }

    storage.globalStatus = false;
    storage.dataHash = "";
    changeIcon();
    storeHashStatus(5);
    return saveOnExit();
}

async function downloadRuleData(expectedHash) {
    const response = await fetch(storage.ruleURL);
    const textData = (await response.text()).trim();
    if (!response.ok || !textData) {
        throw new Error("The rule download returned an invalid response.");
    }

    const actualHash = await sha256(textData);
    if (actualHash !== expectedHash.trim()) {
        storeHashStatus(3);
        throw new Error(
            "Rule hash mismatch. Expected " + expectedHash.trim() +
            " but received " + actualHash
        );
    }

    storage.ClearURLsData = JSON.parse(textData);
    storage.dataHash = actualHash;
    storeHashStatus(2);
    await saveOnDisk(["ClearURLsData", "dataHash", "hashStatus"]);
    return installRuleData();
}

async function refreshRuleData(rulesAlreadyInstalled = false) {
    try {
        const response = await fetch(storage.hashURL);
        const remoteHash = (await response.text()).trim();
        if (!response.ok || !remoteHash) {
            throw new Error("The rule hash endpoint returned an invalid response.");
        }

        dataHash = remoteHash;
        if (remoteHash !== localDataHash.trim() || !hasRuleData()) {
            return await downloadRuleData(remoteHash);
        }

        storeHashStatus(1);
        await saveOnDisk(["hashStatus"]);
        return rulesAlreadyInstalled ? providers.length : installRuleData();
    } catch (error) {
        console.error("[ClearURLs] Could not refresh rules:", error);
        dataHash = false;
        if (rulesAlreadyInstalled && hasRuleData()) {
            return providers.length;
        }
        return deactivateOnFailure();
    }
}

function ensureRulesReady() {
    return rulesReadyPromise;
}

function start() {
    loadOldDataFromStore();
    setBadgedStatus();
    if (hasRuleData()) {
        rulesReadyPromise = installRuleData();
        rulesReadyPromise
            .then(() => refreshRuleData(true))
            .catch(handleError);
    } else {
        rulesReadyPromise = refreshRuleData();
    }
    return rulesReadyPromise;
}
