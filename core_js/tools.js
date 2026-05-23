/*
* ClearURLs
* Copyright (c) 2017-2025 Kevin Röbert
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
* This script is responsible for some tools.
*/

// Needed by the sha256 method
const enc = new TextEncoder();
let currentURL = "";
let tabURLs = {};

// Max amount of log entries to prevent performance issues
const logThreshold = 5000;

/*
* To support Waterfox.
*/
Array.prototype.rmEmpty = function () {
    return this.filter(v => v);
};

/*
* To support Waterfox.
*/
Array.prototype.flatten = function () {
    return this.reduce((a, b) => a.concat(b), []);
};

/**
 * Check if an object is empty.
 * @param  {Object}  obj
 * @return {Boolean}
 */
function isEmpty(obj) {
    return (Object.getOwnPropertyNames(obj).length === 0);
}

/**
 * Translate a string with the i18n API.
 *
 * @param {string} string           Name of the attribute used for localization
 * @param {string[]} placeholders   Array of placeholders
 */
function translate(string, ...placeholders) {
    return browser.i18n.getMessage(string, placeholders);
}

/**
 * Reloads the extension.
 */
function reload() {
    browser.runtime.reload();
}

/**
 * Check if it is an android device.
 * @return bool
 */
async function checkOSAndroid() {
    if (os === undefined || os === null || os === "") {
        await chrome.runtime.getPlatformInfo(function (info) {
            os = info.os;
        });
    }

    return os === "android";
}

/**
 * Extract the host without port from an url.
 * @param  {URL} url URL as String
 * @return {String}     host as string
 */
function extractHost(url) {
    return url.hostname;
}

/**
 * Returns true if the url has a local host.
 * @param  {URL} url URL as object
 * @return {boolean}
 */
function checkLocalURL(url) {
    let host = extractHost(url);

    if (!host.match(/^\d/) && host !== 'localhost') {
        return false;
    }

    return ipRangeCheck(host, ["10.0.0.0/8", "172.16.0.0/12",
            "192.168.0.0/16", "100.64.0.0/10",
            "169.254.0.0/16", "127.0.0.1"]) ||
        host === 'localhost';
}

/**
 * Return the number of parameters query strings.
 * @param  {String}     url URL as String
 * @return {int}        Number of Parameters
 */
function countFields(url) {
    return [...new URL(url).searchParams].length
}

/**
 * Extract the fragments from an url.
 * @param  {URL} url URL as object
 * @return {URLHashParams}     fragments as URLSearchParams object
 */
function extractFragments(url) {
    return new URLHashParams(url)
}

/**
 * Returns the given URL without searchParams and hash.
 * @param {URL} url the URL as object
 * @return {URL} the url without searchParams and hash
 */
function urlWithoutParamsAndHash(url) {
    let newURL = url.toString();

    if (url.search) {
        newURL = newURL.replace(url.search, "");
    }

    if (url.hash) {
        newURL = newURL.replace(url.hash, "");
    }

    return new URL(newURL);
}

/**
 * Load local saved data, if the browser is offline or
 * some other network trouble.
 */
function loadOldDataFromStore() {
    localDataHash = storage.dataHash;
}

/**
 * Increase by {number} the total counter
 * @param  {int} number
 */
function increaseTotalCounter(number) {
    if (storage.statisticsStatus) {
        storage.totalCounter += number;
        deferSaveOnDisk('totalCounter');
    }
}

/**
 * Increase by one the cleaned counter
 */
function increaseCleanedCounter() {
    if (storage.statisticsStatus) {
        storage.cleanedCounter++;
        deferSaveOnDisk('cleanedCounter');
    }
}

/**
 * Change the icon.
 */
function changeIcon() {
    checkOSAndroid().then((res) => {
        if (!res) {
            if (storage.globalStatus) {
                browser.browserAction.setIcon({path: "img/clearurls_128x128.png"}).catch(handleError);
            } else {
                browser.browserAction.setIcon({path: "img/clearurls_gray_128x128.png"}).catch(handleError);
            }
        }
    });
}

/**
 * Get the badged status from the browser storage and put the value
 * into a local variable.
 *
 */
function setBadgedStatus() {
    checkOSAndroid().then((res) => {
        if (!res && storage.badgedStatus) {
            let color = storage.badged_color;
            if (storage.badged_color.charAt(0) !== '#')
                color = '#' + storage.badged_color;
            browser.browserAction.setBadgeBackgroundColor({
                'color': color
            }).catch(handleError);

            // Works only in Firefox: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setBadgeTextColor#Browser_compatibility
            if (getBrowser() === "Firefox") {
                browser.browserAction.setBadgeTextColor({
                    color: "#FFFFFF"
                }).catch(handleError);
            }
        }
    });
}

/**
 * Returns the current URL.
 * @return {String} [description]
 */
function getCurrentURL() {
    return currentURL;
}

function normalizeHostname(hostname) {
    return (hostname || "").trim().toLowerCase();
}

function extractHostnameFromURL(url) {
    try {
        return normalizeHostname(new URL(url).hostname);
    } catch (error) {
        return "";
    }
}

function getDisabledDomains() {
    return storage.disabledDomains || [];
}

function setDisabledDomain(hostname, disabled = true) {
    const normalizedHostname = normalizeHostname(hostname);

    if (!normalizedHostname) {
        return false;
    }

    const domains = new Set(getDisabledDomains());

    if (disabled) {
        domains.add(normalizedHostname);
    } else {
        domains.delete(normalizedHostname);
    }

    storage.disabledDomains = Array.from(domains).sort((left, right) => left.localeCompare(right));

    return true;
}

function isDomainDisabled(hostname) {
    const normalizedHostname = normalizeHostname(hostname);

    if (!normalizedHostname) {
        return false;
    }

    return getDisabledDomains().includes(normalizedHostname);
}

function isURLDisabled(url) {
    return isDomainDisabled(extractHostnameFromURL(url));
}

function setTabURL(tabId, url) {
    if (typeof tabId !== "number" || tabId < 0 || !url) {
        return;
    }

    tabURLs[tabId] = url;
}

function getTabURL(tabId) {
    if (typeof tabId !== "number" || tabId < 0) {
        return "";
    }

    return tabURLs[tabId] || "";
}

function removeTabURL(tabId) {
    delete tabURLs[tabId];
}

function refreshCurrentURL() {
    browser.tabs.query({
        active: true,
        currentWindow: true
    }).then((tabs) => {
        if (tabs.length > 0) {
            currentURL = tabs[0].url || "";
            setTabURL(tabs[0].id, currentURL);
        } else {
            currentURL = "";
        }
    }).catch(handleError);
}

function getRequestContextURL(request) {
    if (request.type === "main_frame") {
        return request.url;
    }

    const tabURL = getTabURL(request.tabId);

    if (tabURL) {
        return tabURL;
    }

    if (request.documentUrl) {
        return request.documentUrl;
    }

    if (request.originUrl) {
        return request.originUrl;
    }

    if (request.initiator) {
        return request.initiator;
    }

    return "";
}

function initializeTabURLs() {
    browser.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => {
            setTabURL(tab.id, tab.url);
        });
    }).catch(handleError);

    refreshCurrentURL();
}

/**
 * Check for browser.
 */
function getBrowser() {
    if (typeof InstallTrigger !== 'undefined') {
        return "Firefox";
    } else {
        return "Chrome";
    }
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        setTabURL(tabId, changeInfo.url);
    } else if (tab && tab.url) {
        setTabURL(tabId, tab.url);
    }

    if (tab && tab.active) {
        currentURL = tab.url || changeInfo.url || currentURL;
    }
});

browser.tabs.onActivated.addListener((activeInfo) => {
    browser.tabs.get(activeInfo.tabId).then((tab) => {
        currentURL = tab.url || "";
        setTabURL(tab.id, currentURL);
    }).catch(handleError);
});

browser.tabs.onRemoved.addListener((tabId) => {
    removeTabURL(tabId);
});

/**
 * Decodes an URL, also one that is encoded multiple times.
 *
 * @see https://stackoverflow.com/a/38265168
 *
 * @param url   the url, that should be decoded
 */
function decodeURL(url) {
    let rtn = decodeURIComponent(url);

    while (isEncodedURI(rtn)) {
        rtn = decodeURIComponent(rtn);
    }

    // Required (e.g., to fix https://github.com/ClearURLs/Addon/issues/71)
    if (!rtn.startsWith('http')) {
        rtn = 'http://' + rtn
    }

    return rtn;
}

/**
 * Returns true, iff the given URI is encoded
 * @see https://stackoverflow.com/a/38265168
 */
function isEncodedURI(uri) {
    return uri !== decodeURIComponent(uri || '')
}

/**
 * Gets the value of at `key` an object. If the resolved value is `undefined`, the `defaultValue` is returned in its place.
 *
 * @param {string} key the key of the object
 * @param {object} defaultValue the default value
 */
Object.prototype.getOrDefault = function (key, defaultValue) {
    return this[key] === undefined ? defaultValue : this[key];
};

function handleError(error) {
    console.error("[ClearURLs ERROR]:" + error);
}

/**
 * Function to log all activities from ClearUrls.
 * Only logging when activated.
 *
 * @param beforeProcessing  the url before the clear process
 * @param afterProcessing   the url after the clear process
 * @param rule              the rule that triggered the process
 */
function pushToLog(beforeProcessing, afterProcessing, rule) {
    const limit = Math.max(0, storage.logLimit);
    if (storage.loggingStatus && limit !== 0 && !isNaN(limit)) {
        while (storage.log.log.length >= limit
        || storage.log.log.length >= logThreshold) {
            storage.log.log.shift();
        }

        storage.log.log.push(
            {
                "before": beforeProcessing,
                "after": afterProcessing,
                "rule": rule,
                "timestamp": Date.now()
            }
        );
        deferSaveOnDisk('log');
    }
}

/**
 * Checks if the storage is available.
 */
function isStorageAvailable() {
    return storage.ClearURLsData.length !== 0;
}

/**
 * This method calculates the SHA-256 hash as HEX string of the given message.
 * This method uses the native hashing implementations of the SubtleCrypto interface which is supported by all browsers
 * that implement the Web Cryptography API specification and is based on:
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 *
 * @param message message for which the hash should be calculated
 * @returns {Promise<string>} SHA-256 of the given message
 */
async function sha256(message) {
    const msgUint8 = enc.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a non-secure random ASCII string of length {@code len}.
 * 
 * @returns non-secure random ASCII
 */
function randomASCII(len) {
    return [...Array(len)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
}

/**
 * Returns an URLSearchParams as string.
 * Does handle spaces correctly.
 */
function urlSearchParamsToString(searchParams) {
    const rtn = []

    searchParams.forEach((value, key) => {
        if (value) {
            rtn.push(key + '=' + encodeURIComponent(value))
        } else {
            rtn.push(key)
        }
    })

    return rtn.join('&')
}
