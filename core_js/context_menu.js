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
* This script is responsible for context menu cleaning functions.
*/

browser.contextMenus.create({
    id: "copy-link-to-clipboard",
    title: translate("clipboard.copy-link"),
    contexts: ["link"],
    icons: {
        "16": "img/clearurls_16x16.png",
        "19": "img/clearurls_19x19.png",
        "20": "img/clearurls_20x20.png",
        "24": "img/clearurls_24x24.png",
        "30": "img/clearurls_30x30.png",
        "32": "img/clearurls_32x32.png",
        "38": "img/clearurls_38x38.png",
        "48": "img/clearurls_48x48.png",
        "64": "img/clearurls_64x64.png",
        "96": "img/clearurls_96x96.png",
        "128": "img/clearurls_128x128.png"
    }
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "copy-link-to-clipboard") {
        const url = contextCleaning(info.linkUrl);
        navigator.clipboard.writeText(url).then(() => {
            console.log("[ClearURLs] Copied cleaned url to clipboard.");
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
