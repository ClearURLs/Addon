/*
* ClearURLs
* Copyright (c) 2017-2019 Kevin Röbert
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
* This script is responsible for context menu cleaning functions
* and based on: https://github.com/mdn/webextensions-examples/tree/master/context-menu-copy-link-with-types
*/

browser.contextMenus.create({
    id: "copy-link-to-clipboard",
    title: translate("clipboard_copy_link"),
    contexts: ["link"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "copy-link-to-clipboard") {
        const url = contextCleaning(info.linkUrl);
        const code = "copyToClipboard(" +
        JSON.stringify(url)+");";

        browser.tabs.executeScript({
            code: "typeof copyToClipboard === 'function';",
        }).then((results) => {
            if (!results || results[0] !== true) {
                return browser.tabs.executeScript(tab.id, {
                    file: "external_js/clipboard-helper.js",
                });
            }
        }).then(() => {
            return browser.tabs.executeScript(tab.id, {
                code,
            });
        }).catch((error) => {
            console.error("Failed to copy text: " + error);
        });
    }
});

/**
* Cleans links for the context menue. Also do automatic redirection.
*
* @param  {[type]} url url as string
* @return {Array}     redirectUrl or none
*/
function contextCleaning(url) {
    // The URL is already cleaned
    if(lastVisited === url) {
        return url;
    }

    var cleanURL = url;

    for (var i = 0; i < providers.length; i++) {
        var result = {
            "changes": false,
            "url": "",
            "redirect": false,
            "cancel": false
        };

        if(providers[i].matchURL(cleanURL))
        {
            result = removeFieldsFormURL(providers[i], cleanURL);
            cleanURL = result.url;
        }

        if(result.redirect)
        {
            return result.url;
        }
    }

    return cleanURL;
}
