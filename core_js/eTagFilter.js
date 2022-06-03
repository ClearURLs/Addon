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

/**
 * Filters headers containing eTag values from web requests.
 */
function eTagFilter(requestDetails) {
    if(!requestDetails.requestHeaders || !storage.eTagFiltering
        || storage.localHostsSkipping && checkLocalURL(new URL(requestDetails.url))) return {};
    const requestHeaders = requestDetails.requestHeaders;

    const filteredHeaders = requestHeaders.filter(header => {
        // Browsers may automatically send an If-None-Match header with
        return header.name.toLowerCase() !== "if-none-match";
    });

    if(filteredHeaders.length < requestHeaders.length) {
        pushToLog(requestDetails.url, requestDetails.url, translate("eTag_filtering_log"));
        increaseBadged(false, requestDetails);
        increaseGlobalURLCounter(1);

        return {requestHeaders: filteredHeaders};
    }
}

browser.webRequest.onBeforeSendHeaders.addListener(
    eTagFilter,
    {urls: ["<all_urls>"]},
    ["blocking", "requestHeaders"]
);
