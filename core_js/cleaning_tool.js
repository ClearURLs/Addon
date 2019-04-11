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
var cleanedURLs = [];
var i = 0;
var length = 0;

/**
* Load only when document is ready
*/
$(document).ready(function(){
    setText();
    $('#cleaning_tool_btn').on("click", cleanURLs);
});

/**
* This function cleans all URLs line by line in the textarea.
*/
function cleanURLs() {
    var cleanTArea = $('#cleanURLs');
    var dirtyTArea = $('#dirtyURLs');
    var urls = dirtyTArea.val().split('\n');
    cleanedURLs = [];
    length = urls.length;

    for(i=0; i < length; i++) {
        browser.runtime.sendMessage({
            function: "pureCleaning",
            params: [urls[i]]
        }).then((data) => {
            cleanedURLs.push(data.response);
            if(i >= length-1) {
                console.log("End of loop.");
                cleanTArea.val(cleanedURLs.join('\n'));
            }
        }, handleError);
    }
}

/**
* Translate a string with the i18n API.
*
* @param {string} string Name of the attribute used for localization
*/
function translate(string)
{
    return browser.i18n.getMessage(string);
}

/**
* Set the text for the UI.
*/
function setText()
{
    document.title = translate('cleaning_tool_page_title');
    $('#page_title').text(translate('cleaning_tool_page_title'));
    $('#cleaning_tool_description').text(translate('cleaning_tool_description'));
    $('#cleaning_tool_btn').text(translate('cleaning_tool_btn'));
    $('#cleaning_tool_dirty_urls_label').text(translate('cleaning_tool_dirty_urls_label'));
    $('#cleaning_tool_clean_urls_label').text(translate('cleaning_tool_clean_urls_label'));
}

function handleError(error) {
    console.log(`Error: ${error}`);
}
