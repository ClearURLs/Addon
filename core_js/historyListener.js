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
 * This script is responsible for listen on history changes.
 * This technique is often used to inject tracking code into the location bar,
 * because all feature events will use the updated URL.
 */

function historyListenerStart() {
    // In MV3, listeners should be registered at top level.
    // This function now just serves as a compatibility entry point.
    // The actual listener is registered below.
}

/**
 * Function that is triggered on history changes. Uses chrome.scripting.executeScript
 * to clean links pushed to the history stack via history.replaceState.
 */
function historyCleaner(details) {
    if (storage.globalStatus && storage.historyListenerEnabled) {
        const urlBefore = details.url;
        const urlAfter = pureCleaning(details.url);

        if (urlBefore !== urlAfter) {
            chrome.scripting.executeScript({
                target: { tabId: details.tabId, frameIds: [details.frameId] },
                func: (cleanUrl) => {
                    history.replaceState(null, "", cleanUrl);
                },
                args: [urlAfter]
            }).catch(onError);
        }
    }
}

function onError(error) {
    console.log(`[ClearURLs] Error: ${error}`);
}

// Register listener at top level for MV3 service worker
browser.webNavigation.onHistoryStateUpdated.addListener(historyCleaner);
