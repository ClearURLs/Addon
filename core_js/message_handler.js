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
 * This script is responsible for the communication between background and content_scripts.
 */

// Explicit dispatch map for MV3 service worker (no `window` object available)
const messageHandlers = {};

/**
 * Register a function to be callable via runtime.sendMessage.
 * @param {string} name - The function name
 * @param {Function} fn - The function to register
 */
function registerMessageHandler(name, fn) {
    messageHandlers[name] = fn;
}

/**
 * @param  request      The message itself.
 * @param  sender       A runtime.MessageSender object.
 * @param  sendResponse A function to call to send a response.
 */
async function handleMessage(request, sender, sendResponse) {
    if (typeof ensureStorageLoaded === "function") {
        await ensureStorageLoaded();
    }

    const fn = messageHandlers[request.function];

    if (typeof fn === "function") {
        const response = await fn.apply(null, request.params || []);
        return {response};
    }
    return {response: undefined};
}

browser.runtime.onMessage.addListener(handleMessage);
