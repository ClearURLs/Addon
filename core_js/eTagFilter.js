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
 * Filters eTag headers from web requests.
 */
function eTagFilter(requestDetails) {
    if(!requestDetails.responseHeaders || !storage.eTagFiltering
        || storage.localHostsSkipping && checkLocalURL(requestDetails.url)) return {};
    const responseHeaders = requestDetails.responseHeaders;

    const filteredHeaders = responseHeaders.filter(header => {
       return header.name.toLowerCase() !== "etag";
    });

    if(filteredHeaders.length < responseHeaders.length) {
        pushToLog(requestDetails.url, requestDetails.url, translate("eTag_filtering_log"));
        increaseBadged(false, requestDetails);
        increaseGlobalURLCounter(1);

        return {responseHeaders: filteredHeaders};
    }
}

browser.webRequest.onHeadersReceived.addListener(
    eTagFilter,
    {urls: ["<all_urls>"]},
    ["blocking", "responseHeaders"]
);