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
* Get the log and display the data as table.
*/
var log = {};

/**
* Reset the global log
*/
function resetGlobalLog(){
    let obj = {"log": []};

    browser.runtime.sendMessage({
        function: "setData",
        params: ['log', JSON.stringify(obj)]
    }).catch(handleError);

    location.reload();
}

/**
* Get the log and display to the user
*/
function getLog()
{
    browser.runtime.sendMessage({
        function: "getData",
        params: ['log']
    }).then((data) => {
        log = data.response;

        // Sort the log | issue #70
        log.log.sort(function(a,b) {
            return b.timestamp - a.timestamp;
        });

        const length = Object.keys(log.log).length;
        let row;
        if(length !== 0)
        {
            for(let i=0; i<length;i++)
            {
                row = "<tr>" +
                "<td>"+log.log[i].before+"</td>" +
                "<td>"+log.log[i].after+"</td>" +
                "<td>"+log.log[i].rule+"</td>" +
                "<td>"+toDate(log.log[i].timestamp)+"</td>";
                $('#tbody').append(row);
            }
        }
        $('#logTable').DataTable({
            "pageLength": 10,
            "language": {
                "url": getDataTableTranslation()
            }
        } ).order([3, 'desc']).draw();
    }).catch(handleError);
}

/**
 * Get the translation file for the DataTable
 */
function getDataTableTranslation()
{
    let lang = browser.i18n.getUILanguage();
    lang = lang.substring(0,2);
    return browser.extension.getURL('./external_js/dataTables/i18n/' + lang + '.lang');
}

/**
* Convert timestamp to date
*/
function toDate(time)
{
    return new Date(time).toLocaleString();
}

/**
 * This function export the global log as json file.
 */
function exportGlobalLog() {
    browser.runtime.sendMessage({
        function: "getData",
        params: ['log']
    }).then((data) => {
        let blob = new Blob([JSON.stringify(data.response)], {type: 'application/json'});

        browser.downloads.download({
            'url': URL.createObjectURL(blob),
            'filename': 'ClearURLsLogExport.json',
            'saveAs': true
        }).catch(handleError);
    }).catch(handleError);
}

/**
 * This function imports an exported global log and overwrites the old one.
 */
function importGlobalLog(evt) {
    let file = evt.target.files[0];
    let fileReader = new FileReader();

    fileReader.onload = function(e) {
        browser.runtime.sendMessage({
            function: "setData",
            params: ["log", e.target.result]
        }).then(() => {
            location.reload();
        }, handleError);
    };
    fileReader.readAsText(file);
}

/**
* Load only when document is ready
*/
$(document).ready(function(){
    setText();
    getLog();
    $('#reset_log_btn').on("click", resetGlobalLog);
    $('#export_log_btn').on("click", exportGlobalLog);
    $('#importLog').on("change", importGlobalLog);
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

/**
 * Set the text for the UI.
 */
function setText()
{
    document.title = translate('log_html_page_title');
    $('#page_title').text(translate('log_html_page_title'));
    $('#reset_log_btn').text(translate('log_html_reset_button'))
        .prop('title', translate('log_html_reset_button_title'));
    $('#head_1').text(translate('log_html_table_head_1'));
    $('#head_2').text(translate('log_html_table_head_2'));
    $('#head_3').text(translate('log_html_table_head_3'));
    $('#head_4').text(translate('log_html_table_head_4'));
    $('#export_log_btn_text').text(translate('log_html_export_button'));
    $('#export_log_btn').prop('title', translate('log_html_export_button_title'));
    $('#import_log_btn_text').text(translate('log_html_import_button'));
    $('#importLog').prop('title', translate('log_html_import_button_title'));
}

function handleError(error) {
    console.log(`Error: ${error}`);
}
