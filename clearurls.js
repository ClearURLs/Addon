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
 * Return only the provider names defined directly on the rules object.
 * Object.prototype is extended with helper methods elsewhere in the add-on.
 */
function getProviderKeys(obj) {
    return Object.keys(obj);
}

function getOrDefault(obj, key, defaultValue) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
        return obj[key];
    }

    return defaultValue;
}

/**
 * Build a URL from its separate query and fragment components.
 */
function buildURLFromParts(domain, fields, fragments, hasQuery, hasHash) {
    let url = domain;

    if (hasQuery) url += "?" + fields;
    if (hasHash) url += "#" + fragments;

    return url;
}

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
    const redirectUrl = provider.getRedirection(url);
    if (redirectUrl !== null) {
        //Log the action
        if (!quiet) {
            pushToLog(pureUrl, redirectUrl, translate('log_redirect'));
            increaseTotalCounter(1);
            increaseBadged(false, request)
        }

        return {
            "redirect": true,
            "url": redirectUrl
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
    // Keep escaped query segments alongside the standard API's decoded names.
    fields = urlObject.search.slice(1);
    // Empty components have delimiters even when their getters return an empty string.
    let hasQuery = fields !== "" || urlObject.href.split("#", 1)[0].endsWith("?");
    const preserveEmptyHash = urlObject.hash === "" && urlObject.href.endsWith("#");
    const rawFields = fields.split("&");
    const originalFieldNames = Array.from(urlObject.searchParams.keys());
    const remainingFieldNames = new Set(originalFieldNames);
    fragments = extractFragments(urlObject);
    domain = urlWithoutParamsAndHash(urlObject).toString();

    /**
     * Only test for matches, if there are fields or fragments that can be cleaned.
     */
    if (originalFieldNames.length > 0 || fragments.size > 0) {
        rules.forEach(rule => {
            const fieldPattern = new RegExp("^"+rule+"$", "i");
            const beforeFields = fields.toString();
            const beforeHasQuery = hasQuery;
            const beforeFragments = fragments.toString();
            const beforeHasHash = fragments.size > 0 || preserveEmptyHash;
            let localChange = false;

            const beforeFieldCount = remainingFieldNames.size;
            if (beforeFieldCount) {
                for (const field of remainingFieldNames) {
                    if (fieldPattern.test(field)) {
                        remainingFieldNames.delete(field);
                        changes = true;
                        localChange = true;
                    }
                }
            }
            if (remainingFieldNames.size !== beforeFieldCount) {
                let fieldIndex = 0;
                // URLSearchParams skips empty segments; only non-empty entries consume a name.
                const retainedFields = rawFields.filter(field => field === "" ||
                    remainingFieldNames.has(originalFieldNames[fieldIndex++]));
                fields = retainedFields.join("&");
                hasQuery = retainedFields.length > 0;
            }

            const fragmentsChanged = fragments.deleteMatching((fragment, value) => {
                if (fieldPattern.test(fragment)) return true;
                // Preserve bare anchors and literal fragment query markers during decoded matching.
                if (value === null || fragment.startsWith("?")) return false;

                let decodedFragment;
                try {
                    decodedFragment = decodeURIComponent(fragment);
                } catch (error) {
                    return false;
                }

                // Do not apply raw encoded rules to an already decoded nested encoding.
                if (/%[0-9a-f]{2}/i.test(decodedFragment)) return false;
                // Catalog rules may use the raw %3F spelling for a decoded leading '?'.
                return fieldPattern.test(decodedFragment) ||
                    fieldPattern.test(decodedFragment.replace(/^\?/, "%3F"));
            });
            if (fragmentsChanged) {
                changes = true;
                localChange = true;
            }

            //Log the action
            if (localChange && storage.loggingStatus) {
                const tempURL = buildURLFromParts(domain, fields, fragments.toString(), hasQuery,
                    fragments.size > 0 || preserveEmptyHash);
                const tempBeforeURL = buildURLFromParts(domain, beforeFields, beforeFragments,
                    beforeHasQuery, beforeHasHash);

                if (!quiet) pushToLog(tempBeforeURL, tempURL, rule);

                increaseBadged(quiet, request);
            }
        });

        url = buildURLFromParts(domain, fields, fragments.toString(), hasQuery,
            fragments.size > 0 || preserveEmptyHash);
    }



    return {
        "changes": changes,
        "url": changes ? url : pureUrl
    }
}

function start() {
    /**
     * Initialize the JSON provider object keys.
     *
     * @param {object} obj
     */
    function getKeys(obj) {
        prvKeys = getProviderKeys(obj);
    }

    /**
     * Initialize the providers form the JSON object.
     *
     */
    function createProviders() {
        let data = storage.ClearURLsData;

        for (let p = 0; p < prvKeys.length; p++) {
            //Create new provider
            providers.push(new Provider(prvKeys[p], getOrDefault(data.providers[prvKeys[p]], 'completeProvider', false),
                getOrDefault(data.providers[prvKeys[p]], 'forceRedirection', false)));

            //Add URL Pattern
            providers[p].setURLPattern(getOrDefault(data.providers[prvKeys[p]], 'urlPattern', ''));

            let rules = getOrDefault(data.providers[prvKeys[p]], 'rules', []);
            //Add rules to provider
            for (let r = 0; r < rules.length; r++) {
                providers[p].addRule(rules[r]);
            }

            let rawRules = getOrDefault(data.providers[prvKeys[p]], 'rawRules', []);
            //Add raw rules to provider
            for (let raw = 0; raw < rawRules.length; raw++) {
                providers[p].addRawRule(rawRules[raw]);
            }

            let referralMarketingRules = getOrDefault(data.providers[prvKeys[p]], 'referralMarketing', []);
            //Add referral marketing rules to provider
            for (let referralMarketing = 0; referralMarketing < referralMarketingRules.length; referralMarketing++) {
                providers[p].addReferralMarketing(referralMarketingRules[referralMarketing]);
            }

            let exceptions = getOrDefault(data.providers[prvKeys[p]], 'exceptions', []);
            //Add exceptions to provider
            for (let e = 0; e < exceptions.length; e++) {
                providers[p].addException(exceptions[e]);
            }

            providers[p].setRedirections(
                getOrDefault(data.providers[prvKeys[p]], 'redirections', []),
                getOrDefault(data.providers[prvKeys[p]], 'redirectRules', [])
            );

            let methods = getOrDefault(data.providers[prvKeys[p]], 'methods', []);
            //Add HTTP methods list to provider
            for (let re = 0; re < methods.length; re++) {
                providers[p].addMethod(methods[re]);
            }
        }
    }

    /**
     * Convert the external data to Objects and
     * call the create provider function.
     *
     * @param  {String} retrievedText - pure data form github
     */
    function toObject(retrievedText) {
        getKeys(storage.ClearURLsData.providers);
        createProviders();
    }

    /**
     * Deactivates ClearURLs, if no rules can be downloaded and also no old rules in storage
     */
    function deactivateOnFailure() {
        if (storage.ClearURLsData.length === 0) {
            storage.globalStatus = false;
            storage.dataHash = "";
            changeIcon();
            storeHashStatus(5);
            saveOnExit();
        }
    }

    /**
     * Get the hash for the rule file on GitLab.
     * Check the hash with the hash form the local file.
     * If the hash has changed, then download the new rule file.
     * Else do nothing.
     */
    function getHash() {
        //Get the target hash from GitLab
        const response = fetch(storage.hashURL).then(async response => {
            return {
                hash: (await response.text()).trim(),
                status: response.status
            }
        });

        response.then(result => {
            if (result.status === 200 && result.hash) {
                dataHash = result.hash;

                if (dataHash !== localDataHash.trim()) {
                    fetchFromURL();
                } else {
                    toObject(storage.ClearURLsData);
                    storeHashStatus(1);
                    saveOnDisk(['hashStatus']);
                }
            } else {
                throw "The status code was not okay or the given hash were empty.";
            }
        }).catch(error => {
            console.error("[ClearURLs]: Could not download the rules hash from the given URL due to the following error: ", error);
            dataHash = false;
            deactivateOnFailure();
        });
    }

    /*
    * ##################################################################
    * # Fetch Rules & Exception from URL                               #
    * ##################################################################
    */
    function fetchFromURL() {
        const response = fetch(storage.ruleURL).then(async response => {
            return {
                data: (await response.clone().text()).trim(),
                hash: await sha256((await response.text()).trim()),
                status: response.status
            }
        })

        response.then(result => {
            if (result.status === 200 && result.data) {
                if (result.hash === dataHash.trim()) {
                    storage.ClearURLsData = result.data;
                    storage.dataHash = result.hash;
                    storeHashStatus(2);
                } else {
                    storeHashStatus(3);
                    console.error("The hash does not match. Expected `" + result.hash + "` got `" + dataHash.trim() + "`");
                }
                storage.ClearURLsData = JSON.parse(storage.ClearURLsData);
                toObject(storage.ClearURLsData);
                saveOnDisk(['ClearURLsData', 'dataHash', 'hashStatus']);
            } else {
                throw "The status code was not okay or the given rules were empty."
            }
        }).catch(error => {
            console.error("[ClearURLs]: Could not download the rules from the given URL due to the following error: ", error);
            deactivateOnFailure();
        });
    }

    // ##################################################################

    /** Compile explicit redirects first so they shadow identical legacy patterns. */
    function compileRedirections(legacyRules, explicitRules) {
        const compiled = [];
        const legacyPatternsToSkip = new Set();
        const explicitIds = new Set();

        if (Array.isArray(explicitRules)) {
            for (const rule of explicitRules) {
                const redirect = compileDeclaredRedirect(rule);
                if (!redirect || explicitIds.has(redirect.id)) continue;

                explicitIds.add(redirect.id);
                legacyPatternsToSkip.add(redirect.pattern);
                compiled.push(redirect);
            }
        }
        if (Array.isArray(legacyRules)) {
            for (const pattern of legacyRules) {
                if (typeof pattern !== "string" || !pattern || legacyPatternsToSkip.has(pattern)) continue;

                let expression;
                try {
                    expression = new RegExp(pattern, "i");
                } catch (error) {
                    continue;
                }
                legacyPatternsToSkip.add(pattern);
                compiled.push({
                    expression,
                    resolve: ([target]) => target ? decodeRedirectTarget(target) : null
                });
            }
        }
        return compiled;
    }

    /*
    * ##################################################################
    * # Supertyp Provider                                              #
    * ##################################################################
    */
    /**
     * Declare constructor
     *
     * @param {String} _name                Provider name
     * @param {boolean} _completeProvider    Set URL Pattern as rule
     * @param {boolean} _forceRedirection    Whether redirects should be enforced via a "tabs.update"
     * @param {boolean} _isActive            Is the provider active?
     */
    function Provider(_name, _completeProvider = false, _forceRedirection = false, _isActive = true) {
        let name = _name;
        let urlPattern;
        let enabled_rules = Object.create(null);
        let disabled_rules = Object.create(null);
        let enabled_exceptions = Object.create(null);
        let disabled_exceptions = Object.create(null);
        let canceling = _completeProvider;
        let redirections = [];
        let active = _isActive;
        let enabled_rawRules = Object.create(null);
        let disabled_rawRules = Object.create(null);
        let enabled_referralMarketing = Object.create(null);
        let disabled_referralMarketing = Object.create(null);
        let methods = [];

        if (_completeProvider) {
            enabled_rules[".*"] = true;
        }

        /**
         * Returns whether redirects should be enforced via a "tabs.update"
         * @return {boolean}    whether redirects should be enforced
         */
        this.shouldForceRedirect = function () {
            return _forceRedirection;
        };

        /**
         * Returns the provider name.
         * @return {String}
         */
        this.getName = function () {
            return name;
        };

        /**
         * Add URL pattern.
         *
         * @require urlPatterns as RegExp
         */
        this.setURLPattern = function (urlPatterns) {
            urlPattern = new RegExp(urlPatterns, "i");
        };

        /**
         * Return if the Provider Request is canceled
         * @return {Boolean} isCanceled
         */
        this.isCaneling = function () {
            return canceling;
        };

        /**
         * Check the url is matching the ProviderURL.
         *
         * @return {boolean}    ProviderURL as RegExp
         */
        this.matchURL = function (url) {
            return urlPattern.test(url) && !(this.matchException(url));
        };

        /**
         * Apply a rule to a given tuple of rule array.
         * @param enabledRuleArray      array for enabled rules
         * @param disabledRulesArray    array for disabled rules
         * @param {String} rule         RegExp as string
         * @param {boolean} isActive    Is this rule active?
         */
        this.applyRule = (enabledRuleArray, disabledRulesArray, rule, isActive = true) => {
            if (isActive) {
                enabledRuleArray[rule] = true;

                if (disabledRulesArray[rule] !== undefined) {
                    delete disabledRulesArray[rule];
                }
            } else {
                disabledRulesArray[rule] = true;

                if (enabledRuleArray[rule] !== undefined) {
                    delete enabledRuleArray[rule];
                }
            }
        };

        /**
         * Add a rule to the rule array
         * and replace old rule with new rule.
         *
         * @param {String} rule        RegExp as string
         * @param {boolean} isActive   Is this rule active?
         */
        this.addRule = function (rule, isActive = true) {
            this.applyRule(enabled_rules, disabled_rules, rule, isActive);
        };

        /**
         * Return all active rules as an array.
         *
         * @return Array RegExp strings
         */
        this.getRules = function () {
            if (!storage.referralMarketing) {
                return Object.keys(Object.assign(Object.create(null), enabled_rules, enabled_referralMarketing));
            }

            return Object.keys(enabled_rules);
        };

        /**
         * Add a raw rule to the raw rule array
         * and replace old raw rule with new raw rule.
         *
         * @param {String} rule        RegExp as string
         * @param {boolean} isActive   Is this rule active?
         */
        this.addRawRule = function (rule, isActive = true) {
            this.applyRule(enabled_rawRules, disabled_rawRules, rule, isActive);
        };

        /**
         * Return all active raw rules as an array.
         *
         * @return Array RegExp strings
         */
        this.getRawRules = function () {
            return Object.keys(enabled_rawRules);
        };

        /**
         * Add a referral marketing rule to the referral marketing array
         * and replace old referral marketing rule with new referral marketing rule.
         *
         * @param {String} rule        RegExp as string
         * @param {boolean} isActive   Is this rule active?
         */
        this.addReferralMarketing = function (rule, isActive = true) {
            this.applyRule(enabled_referralMarketing, disabled_referralMarketing, rule, isActive);
        };

        /**
         * Add a exception to the exceptions array
         * and replace old with new exception.
         *
         * @param {String} exception   RegExp as string
         * @param {Boolean} isActive   Is this exception active?
         */
        this.addException = function (exception, isActive = true) {
            if (isActive) {
                enabled_exceptions[exception] = true;

                if (disabled_exceptions[exception] !== undefined) {
                    delete disabled_exceptions[exception];
                }
            } else {
                disabled_exceptions[exception] = true;

                if (enabled_exceptions[exception] !== undefined) {
                    delete enabled_exceptions[exception];
                }
            }
        };

        /**
         * Add a HTTP method to methods list.
         *
         * @param {String} method HTTP Method Name
         */
        this.addMethod = function (method) {
            if (methods.indexOf(method) === -1) {
                methods.push(method);
            }
        }

        /**
         * Check the requests' method.
         *
         * @param {requestDetails} details Requests details
         * @returns {boolean} should be filtered or not
         */
        this.matchMethod = function (details) {
            if (!methods.length) return true;
            return methods.indexOf(details['method']) > -1;
        }

        /**
         * Private helper method to check if the url
         * an exception.
         *
         * @param  {String} url     RegExp as string
         * @return {boolean}        if matching? true: false
         */
        this.matchException = function (url) {
            let result = false;

            //Add the site blocked alert to every exception
            if (url === siteBlockedAlert) return true;

            for (const exception of Object.keys(enabled_exceptions)) {
                if (result) break;

                let exception_regex = new RegExp(exception, "i");
                result = exception_regex.test(url);
            }

            return result;
        };

        this.setRedirections = function (legacyRules, explicitRules) {
            redirections = compileRedirections(legacyRules, explicitRules);
        };

        /**
         * Return the decoded target of the first matching redirection.
         *
         * @return {string|null}
         */
        this.getRedirection = function (url) {
            for (const { expression, resolve } of redirections) {
                const match = expression.exec(url);
                if (!match) continue;

                const redirectUrl = resolve(match.slice(1));
                if (redirectUrl !== null) return redirectUrl;
            }

            return null;
        };
    }

    // ##################################################################

    /**
     * Function which called from the webRequest to
     * remove the tracking fields from the url.
     *
     * @param  {requestDetails} request     webRequest-Object
     * @return {Array}                  redirectUrl or none
     */
    function clearUrl(request) {
        const URLbeforeReplaceCount = countFields(request.url);

        //Add Fields form Request to global url counter
        increaseTotalCounter(URLbeforeReplaceCount);

        if (storage.globalStatus) {
            let result = {
                "changes": false,
                "url": "",
                "redirect": false,
                "cancel": false
            };

            if (storage.pingBlocking && storage.pingRequestTypes.includes(request.type)) {
                pushToLog(request.url, request.url, translate('log_ping_blocked'));
                increaseBadged(false, request);
                increaseTotalCounter(1);
                return {cancel: true};
            }

            /*
            * Call for every provider the removeFieldsFormURL method.
            */
            for (let i = 0; i < providers.length; i++) {
                if (!providers[i].matchMethod(request)) continue;
                if (providers[i].matchURL(request.url)) {
                    result = removeFieldsFormURL(providers[i], request.url, false, request);
                }

                /*
                * Expand urls and bypass tracking.
                * Cancel the active request.
                */
                if (result.redirect) {
                    if (providers[i].shouldForceRedirect() &&
                        request.type === 'main_frame') {
                        browser.tabs.update(request.tabId, {url: result.url}).catch(handleError);
                        return {cancel: true};
                    }

                    return {
                        redirectUrl: result.url
                    };
                }

                /*
                * Cancel the Request and redirect to the site blocked alert page,
                * to inform the user about the full url blocking.
                */
                if (result.cancel) {
                    if (request.type === 'main_frame') {
                        const blockingPage = browser.runtime.getURL("html/siteBlockedAlert.html?source=" + encodeURIComponent(request.url));
                        browser.tabs.update(request.tabId, {url: blockingPage}).catch(handleError);

                        return {cancel: true};
                    } else {
                        return {
                            redirectUrl: siteBlockedAlert
                        };
                    }
                }

                /*
                * Ensure that the function go not into
                * a loop.
                */
                if (result.changes) {
                    return {
                        redirectUrl: result.url
                    };
                }
            }
        }

        // Default case
        return {};
    }

    /**
     * Call loadOldDataFromStore, getHash, counter, status and log functions
     */

    loadOldDataFromStore();
    getHash();
    setBadgedStatus();

    /**
     * Check the request.
     */
    function promise(requestDetails) {
        if (isDataURL(requestDetails)) {
            return {};
        } else {
            return clearUrl(requestDetails);
        }
    }

    /**
     * To prevent long loading on data urls
     * we will check here for data urls.
     *
     * @type {requestDetails}
     * @return {boolean}
     */
    function isDataURL(requestDetails) {
        const s = requestDetails.url;

        return s.substring(0, 4) === "data";
    }

    /**
     * Call by each Request and checking the url.
     *
     * @type {Array}
     */
    browser.webRequest.onBeforeRequest.addListener(
        promise,
        {urls: ["<all_urls>"], types: getData("types").concat(getData("pingRequestTypes"))},
        ["blocking"]
    );
}
