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

/**
 * Sets up ETag filtering via declarativeNetRequest.
 * In MV3, we can't modify headers synchronously. Instead, we use
 * a declarativeNetRequest rule to remove ETag headers entirely.
 * 
 * Note: MV3 DNR cannot replace ETags with random values (only remove).
 * Removing ETags still prevents ETag-based tracking.
 */
async function setupETagFilter() {
    if (getBrowser() === "Firefox") return; // Firefox handles ETag partitioning natively since v85

    const ETAG_RULE_ID = 99999; // Reserved ID for ETag rule

    try {
        if (storage.eTagFiltering) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ETAG_RULE_ID],
                addRules: [{
                    id: ETAG_RULE_ID,
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        responseHeaders: [
                            { header: "ETag", operation: "remove" }
                        ]
                    },
                    condition: {
                        urlFilter: "*",
                        resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
                    }
                }]
            });
            console.log('[ClearURLs] ETag filtering enabled via declarativeNetRequest');
        } else {
            // Remove the ETag rule if filtering is disabled
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ETAG_RULE_ID],
                addRules: []
            });
            console.log('[ClearURLs] ETag filtering disabled');
        }
    } catch (e) {
        console.error('[ClearURLs] Failed to setup ETag filter:', e);
    }
}

// Setup ETag filtering (called after storage is initialized)
if (getBrowser() !== "Firefox") {
    // Will be called by genesis() after storage is loaded
    // For now, register as a function that storage.js can call
}