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
    const newURL = new URL(url);
    newURL.search = "";
    newURL.hash = "";
    return newURL;
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
 * Unwraps a redirect target without decoding escapes that belong to its URL.
 *
 * @param {string} target the captured target
 * @return {string|null} the valid HTTP(S) target, if one was found
 */
function decodeURL(target) {
    while (true) {
        // A bare HTTP-like token has no visible host/path boundary to infer from.
        if (/^https?(?:-[^/?#\\]*)?$/i.test(target)) return null;

        const prefix = /^(?:([a-z][a-z0-9+.-]*)(?::|%(?:25)*3a))?(?:\/|%(?:25)*2f){2}/i.exec(target);
        if (prefix) {
            if (prefix[1] && !/^https?$/i.test(prefix[1])) return null;

            const candidate = redirectURLWithScheme(prefix[1] || "http", target.slice(prefix[0].length),
                /[:/]/.test(prefix[0]));
            if (candidate !== null) return candidate;
        } else if (isRedirectHostPath(target)) {
            const candidate = redirectURLWithScheme("http", target);
            if (candidate !== null) return candidate;
        }

        let decoded;
        try {
            decoded = decodeURIComponent(target);
        } catch (error) {
            return null;
        }

        if (decoded === target) return null;
        target = decoded;
    }
}

function redirectURLWithScheme(scheme, rest, hasLiteralPrefixDelimiter = false) {
    const prefix = scheme + "://";
    const candidate = prefix + rest;
    if (isValidRedirectURL(candidate)) return candidate;

    const boundary = rest.search(/[/?#]/);
    // A fully wrapped target can still be unwrapped one layer at a time.
    if (boundary < 0 && !hasLiteralPrefixDelimiter) return null;

    const head = boundary < 0 ? rest : rest.slice(0, boundary);
    const separator = /%(?:25)*(2f|3f|23)/i.exec(head);
    if (boundary < 0 && !separator) return null;

    let authority = separator ? head.slice(0, separator.index) : head;
    const rawSuffix = separator
        ? decodeURIComponent("%" + separator[1]) + rest.slice(separator.index + separator[0].length)
        : rest.slice(boundary);
    const repairedQuery = hasLiteralPrefixDelimiter && (boundary < 0 || rest[boundary] === "#")
        ? repairEncodedRedirectQuery(rawSuffix)
        : null;
    const suffix = repairedQuery ?? (boundary >= 0 || rawSuffix.startsWith("#") ? rawSuffix : null);
    if (suffix === null) return null;

    try {
        while (true) {
            const repaired = prefix + authority + suffix;
            if (isValidRedirectURL(repaired)) return repaired;

            const decoded = decodeURIComponent(authority);
            if (decoded === authority) return null;
            authority = decoded;
        }
    } catch (error) {
        return null;
    }
}

function repairEncodedRedirectQuery(suffix) {
    const fragmentStart = suffix.indexOf("#");
    const body = fragmentStart < 0 ? suffix : suffix.slice(0, fragmentStart);
    const fragment = fragmentStart < 0 ? "" : suffix.slice(fragmentStart);
    const start = /\?|%3f|%23/i.exec(body);
    if (!start || !/^(?:\?|%3f)$/i.test(start[0])) return null;

    const query = body.slice(start.index + start[0].length);
    const separator = /%3d|%26|%23|%3f/i.exec(query);
    if (!separator || separator[0].toLowerCase() !== "%3d") return null;

    const value = query.slice(separator.index + separator[0].length);
    // A nested escape or a second named field can signal one outer encoding layer.
    if (/%25[0-9a-f]{2}/i.test(body) || /%26(?:[^%]|%(?!26|23|3d))+%3d/i.test(value)) {
        try {
            const encoded = body.slice(1);
            const decoded = decodeURIComponent(encoded);
            if (encodeURIComponent(decoded) === encoded.replace(/%[0-9a-f]{2}/gi, escape => escape.toUpperCase())) {
                return body[0] + decoded + fragment;
            }
        } catch (error) {
            // Legacy escaped bytes can still belong to a valid URL.
        }
    }

    // In a partly wrapped URL, escaped separators can also be query data.
    return body.slice(0, start.index) + "?" + query.slice(0, separator.index) + "=" + value + fragment;
}

function isValidRedirectURL(url) {
    if (!/^https?:\/\//i.test(url)) return false;
    try {
        return new URL(url).hostname !== "";
    } catch (error) {
        return false;
    }
}

function isRedirectHostPath(target) {
    if (!/^[^/?#\\]/.test(target)) return false;

    // A colon in a scheme-less authority can introduce a port or password.
    const colon = /^([a-z][a-z0-9+.-]*):/i.exec(target);
    if (!colon) return true;
    const afterColon = target.slice(colon[0].length);
    const hasHostName = colon[1].includes(".") || /^localhost$/i.test(colon[1]);
    const port = /^\d+([/?#]|$)/.exec(afterColon);
    return /^[^/?#\\]+@[^/?#\\]+\//.test(afterColon) ||
        (port !== null && (hasHostName || port[1] !== "")) ||
        (colon[1].includes(".") && /^(?:\/(?!\/)|[?#]|$)/.test(afterColon));
}

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
