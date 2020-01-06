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
/*
* This script is responsible for the blocked alert page.
*/

/**
 * Set the text for the UI.
 */
function setText()
{
    document.title = translate('blocked_html_title');
    $('#title').html(translate('blocked_html_title'));
    $('#body').html(translate('blocked_html_body'));
    $('#page').text(translate('blocked_html_button'));

}

$(document).ready(function(){
    setText();

    let source = new URLSearchParams(window.location.search).get("source");
    $('#page').attr('href', decodeURIComponent(source));
});

/**
 * Translate a string with the i18n API.
 *
 * @param {string} string Name of the attribute used for localization
 */
function translate(string)
{
    return browser.i18n.getMessage(string);
}