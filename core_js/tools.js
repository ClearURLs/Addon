/*
* ClearURLs
* Copyright (c) 2017-2020 Kevin Röbert
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
function translate(string, ...placeholders)
{
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
 * @param  {String} url URL as String
 * @return {String}     host as string
 */
function extractHost(url) {
    let parsed_url = new URL(url);

    return parsed_url.hostname;
}

/**
 * Returns true if the url has a local host.
 * @param  {String} url URL as String
 * @return {boolean}
 */
function checkLocalURL(url) {
    let host = extractHost(url);

    if(!host.match(/^\d/) && host !== 'localhost') {
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
    return extractFileds(url).length;
}

/**
 * Returns true if fields exists.
 * @param  {String}     url URL as String
 * @return {boolean}
 */
function existsFields(url) {
    let matches = (url.match(/\?.+/i) || []);
    let count = matches.length;

    return (count > 0);
}

/**
 * Extract the fields from an url.
 * @param  {String} url URL as String
 * @return {Array}     Fields as array
 */
function extractFileds(url) {
    if (existsFields(url)) {
        let fields = url.replace(new RegExp(".*?\\?", "i"), "");
        if (existsFragments(url)) {
            fields = fields.replace(new RegExp("#.*", "i"), "");
        }

        return (fields.match(/[^\/|\?|&]+=?[^&]*/gi) || []);
    }

    return [];
}

/**
 * Return the number of fragments query strings.
 * @param  {String}     url URL as String
 * @return {int}        Number of fragments
 */
function countFragments(url) {
    return extractFragments(url).length;
}

/**
 * Extract the fragments from an url.
 * @param  {String} url URL as String
 * @return {Array}     fragments as array
 */
function extractFragments(url) {
    if (existsFragments(url)) {
        let fragments = url.replace(new RegExp(".*?#", "i"), "");
        return (fragments.match(/[^&]+=?[^&]*/gi) || []);
    }

    return [];
}

/**
 * Returns true if fragments exists.
 * @param  {String}     url URL as String
 * @return {boolean}
 */
function existsFragments(url) {
    let matches = (url.match(/\#.+/i) || []);
    let count = matches.length;

    return (count > 0);
}

/**
 * Load local saved data, if the browser is offline or
 * some other network trouble.
 */
function loadOldDataFromStore() {
    localDataHash = storage.dataHash;
}

/**
 * Increase by {number} the GlobalURLCounter
 * @param  {int} number
 */
function increaseGlobalURLCounter(number) {
    if (storage.statisticsStatus) {
        storage.globalurlcounter += number;
        deferSaveOnDisk('globalurlcounter');
    }
}

/**
 * Increase by one the URLCounter
 */
function increaseURLCounter() {
    if (storage.statisticsStatus) {
        storage.globalCounter++;
        deferSaveOnDisk('globalCounter');
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

/**
 * Decodes an URL, also one that is encoded multiple times.
 *
 * @see https://stackoverflow.com/a/38265168
 *
 * @param url   the url, that should be decoded
 */
function decodeURL(url) {
    let rtn = decodeURIComponent(url);

    while(isEncodedURI(rtn)) {
        rtn = decodeURIComponent(rtn);
    }

    // Required (e.g., to fix https://github.com/ClearURLs/Addon/issues/71)
    if(rtn.substr(0, 4) !== 'http') {
        rtn = 'http://'+rtn
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