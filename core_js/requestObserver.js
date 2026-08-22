/*
 * ClearURLs
 * Copyright (c) 2017-2025 Kevin Röbert
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/*jshint esversion: 6 */

function countQueryFields(url) {
    if (!URL.canParse(url)) {
        return 0;
    }
    return [...new URL(url).searchParams].length;
}

function observeRequest(details) {
    ensureStorageLoaded().then(() => {
        if (storage.globalStatus) {
            increaseTotalCounter(countQueryFields(details.url));
        }
    }).catch(handleError);
}

function hasRemovedLiteralParameter(before, after, details) {
    if (!URL.canParse(before) || !URL.canParse(after)) {
        return false;
    }
    const beforeUrl = new URL(before);
    const afterUrl = new URL(after);

    if (beforeUrl.origin !== afterUrl.origin || beforeUrl.pathname !== afterUrl.pathname) {
        return false;
    }

    return providers.some(provider => {
        if (!provider.matchMethod(details) || !provider.matchURL(before)) {
            return false;
        }
        return provider.getRules().some(rule =>
            /^[a-zA-Z0-9_-]+$/.test(rule) &&
            beforeUrl.searchParams.has(rule) &&
            !afterUrl.searchParams.has(rule)
        );
    });
}

function isClearUrlsRedirect(details) {
    const redirectUrl = details.redirectUrl;
    if (!redirectUrl || redirectUrl === details.url) {
        return false;
    }
    if (redirectUrl.startsWith(browser.runtime.getURL("html/redirect.html?target=")) ||
        redirectUrl.startsWith(browser.runtime.getURL("html/siteBlockedAlert.html?source="))) {
        return true;
    }

    const cleanedUrl = pureCleaning(details.url, true);
    return cleanedUrl === redirectUrl ||
        hasRemovedLiteralParameter(details.url, redirectUrl, details);
}

function observeRedirect(details) {
    ensureStorageLoaded().then(ensureRulesReady).then(() => {
        if (!storage.globalStatus || !isClearUrlsRedirect(details)) {
            return;
        }
        const removedFields = Math.max(
            1,
            countQueryFields(details.url) - countQueryFields(details.redirectUrl)
        );
        increaseBadged(false, details, removedFields);
    }).catch(handleError);
}

function wouldBlockRequest(details) {
    if (storage.pingBlocking && details.type === "ping") {
        return true;
    }
    if (!storage.domainBlocking) {
        return false;
    }
    return providers.some(provider =>
        provider.isCaneling() &&
        provider.matchMethod(details) &&
        provider.matchURL(details.url)
    );
}

function observeBlockedRequest(details) {
    if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") {
        return;
    }

    ensureStorageLoaded().then(ensureRulesReady).then(() => {
        if (storage.globalStatus && wouldBlockRequest(details)) {
            increaseBadged(false, details);
        }
    }).catch(handleError);
}

browser.webRequest.onBeforeRequest.addListener(
    observeRequest,
    {urls: ["<all_urls>"]}
);
browser.webRequest.onBeforeRedirect.addListener(
    observeRedirect,
    {urls: ["<all_urls>"]}
);
browser.webRequest.onErrorOccurred.addListener(
    observeBlockedRequest,
    {urls: ["<all_urls>"]}
);
