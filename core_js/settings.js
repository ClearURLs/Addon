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

var settings = [];

getData();

/**
* Load only when document is ready
*/
$(document).ready(function(){
    setText();
    $(".pick-a-color").pickAColor();
    $('#reset_settings_btn').on("click", reset);
    $('#export_settings_btn').on("click", exportSettings);
    $('#importSettings').on("change", importSettings);
    $('#save_settings_btn').on("click", save);

    $("#badged_color input").on("change", function () {
        settings.badged_color = $(this).val();

        browser.runtime.sendMessage({
            function: "setData",
            params: ["badged_color", settings.badged_color]
        }).then(handleResponse, handleError);

        browser.runtime.sendMessage({
            function: "setBadgedStatus",
            params: []
        }).then(handleResponse, handleError);

        browser.runtime.sendMessage({
            function: "saveOnExit",
            params: []
        }).then(handleResponse, handleError);
    });
});

/**
* Reset everything.
* Set everthing to the default values.
*/
function reset()
{
    browser.runtime.sendMessage({
        function: "initSettings",
        params: []
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "saveOnExit",
        params: []
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "reload",
        params: []
    }).then(handleResponse, handleError);
}

/**
* Saves the settings.
*/
function save()
{
    browser.runtime.sendMessage({
        function: "setData",
        params: ["badged_color", $('input[name=badged_color]').val()]
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "setBadgedStatus",
        params: []
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "setData",
        params: ["ruleURL", $('input[name=rule_url]').val()]
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "setData",
        params: ["hashURL", $('input[name=hash_url]').val()]
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "setData",
        params: ["types", $('input[name=types]').val()]
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "setData",
        params: ["logLimit", $('input[name=logLimit]').val()]
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "saveOnExit",
        params: []
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "reload",
        params: []
    }).then(handleResponse, handleError);
}

/**
 * Translate a string with the i18n API.
 *
 * @param {string} string           Name of the attribute used for localization
 * @param {string[]} placeholders   Array of placeholders
*/
function translate(string, ...placeholders)
{
    return browser.i18n.getMessage(string, placeholders);
}

/**
* Get the data.
*/
function getData()
{
    browser.runtime.sendMessage({
        function: "getData",
        params: ["badged_color"]
    }).then((data) => handleResponseData(data, "badged_color", "badged_color"), handleError);

    browser.runtime.sendMessage({
        function: "getData",
        params: ["ruleURL"]
    }).then((data) => handleResponseData(data, "rule_url", "rule_url"), handleError);

    browser.runtime.sendMessage({
        function: "getData",
        params: ["hashURL"]
    }).then((data) => handleResponseData(data, "hash_url", "hash_url"), handleError);

    browser.runtime.sendMessage({
        function: "getData",
        params: ["types"]
    }).then((data) => handleResponseData(data, "types", "types"), handleError);

    browser.runtime.sendMessage({
        function: "getData",
        params: ["logLimit"]
    }).then((data) => {
        handleResponseData(data, "logLimit", "logLimit");
        if(data.response === undefined || data.response === -1) {
            $('#logLimit_label').text(translate('setting_log_limit_label', "∞"));
        } else {
            $('#logLimit_label').text(translate('setting_log_limit_label', data.response));
        }
    }, handleError);

    browser.runtime.sendMessage({
        function: "getData",
        params: ["contextMenuEnabled"]
    }).then((data) => {
        handleResponseData(data, "contextMenuEnabled", "contextMenuEnabled");
        browser.runtime.sendMessage({
            function: "getData",
            params: ["historyListenerEnabled"]
        }).then((data) => {
            handleResponseData(data, "historyListenerEnabled", "historyListenerEnabled");
            browser.runtime.sendMessage({
                function: "getData",
                params: ["localHostsSkipping"]
            }).then((data) => {
                handleResponseData(data, "localHostsSkipping", "localHostsSkipping");
                browser.runtime.sendMessage({
                    function: "getData",
                    params: ["referralMarketing"]
                }).then((data) => {
                    handleResponseData(data, "referralMarketing", "referralMarketing");
                    changeSwitchButton("contextMenuEnabled", "contextMenuEnabled");
                    changeSwitchButton("historyListenerEnabled", "historyListenerEnabled");
                    changeSwitchButton("localHostsSkipping", "localHostsSkipping");
                    changeSwitchButton("referralMarketing", "referralMarketing");
                }, handleError);
            }, handleError);
        }, handleError);
    }, handleError);
}

/**
* Set the text for the UI.
*/
function setText()
{
    document.title = translate('settings_html_page_title');
    $('#page_title').text(translate('settings_html_page_title'));
    $('#badged_color_label').text(translate('badged_color_label'));
    $('#reset_settings_btn').text(translate('setting_html_reset_button'))
        .prop('title', translate('setting_html_reset_button_title'));
    $('#rule_url_label').text(translate('setting_rule_url_label'));
    $('#hash_url_label').text(translate('setting_hash_url_label'));
    $('#types_label').html(translate('setting_types_label'));
    $('#save_settings_btn').text(translate('settings_html_save_button'))
        .prop('title', translate('settings_html_save_button_title'));
    injectText("context_menu_enabled", "context_menu_enabled");
    $('#history_listener_enabled').html(translate('history_listener_enabled'));
    injectText("local_hosts_skipping", "local_hosts_skipping");
    $('#export_settings_btn_text').text(translate('setting_html_export_button'));
    $('#export_settings_btn').prop('title', translate('setting_html_export_button_title'));
    $('#import_settings_btn_text').text(translate('setting_html_import_button'));
    $('#import_settings_btn').prop('title', translate('setting_html_import_button_title'));
    injectText("referral_marketing_enabled", "referral_marketing_enabled");
}

/**
 * This function exports all ClearURLs settings with statistics and rules.
 */
function exportSettings() {
    browser.runtime.sendMessage({
        function: "storageAsJSON",
        params: []
    }).then((data) => {
        let blob = new Blob([JSON.stringify(data.response)], {type: 'application/json'});

        browser.downloads.download({
            'url': URL.createObjectURL(blob),
            'filename': 'ClearURLs.conf',
            'saveAs': true
        });
    });
}

/**
 * This function imports an exported ClearURLs setting and overwrites the old one.
 */
function importSettings(evt) {
    let file = evt.target.files[0];
    let fileReader = new FileReader();

    fileReader.onload = function(e) {
        let data = JSON.parse(e.target.result);
        const length = Object.keys(data).length;
        let i=0;

        Object.entries(data).forEach(([key, value]) => {
            browser.runtime.sendMessage({
                function: "setData",
                params: [key, value]
            }).then(() => {
                i++;
                if(i === length) {
                    location.reload();
                }
            }, handleError);
        });
    };
    fileReader.readAsText(file);
}

/**
 * Handle the response from the storage and saves the data.
 * @param  {JSON-Object} data Data JSON-Object
 * @param varName
 * @param inputID
 */
function handleResponseData(data, varName, inputID)
{
    settings[varName] = data.response;
    $('input[name='+inputID+']').val(data.response);
}

function handleResponse(message) {
    console.log(`Message from the background script:  ${message.response}`);
}

function handleError(error) {
    console.log(`Error: ${error}`);
}

/**
* Change the value of a switch button.
* @param  {string} id        HTML id
* @param  {string} storageID storage internal id
*/
function changeSwitchButton(id, storageID)
{
    let element = $('#'+id);

    element.on('change', function(){
        browser.runtime.sendMessage({
            function: "setData",
            params: [storageID, element.is(':checked')]
        }).then((data) => {
            if(storageID === "globalStatus"){
                browser.runtime.sendMessage({
                    function: "changeIcon",
                    params: []
                });
            }

            browser.runtime.sendMessage({
                function: "saveOnExit",
                params: []
            });
        });
    });
    setSwitchButton(id, storageID);
}

/**
* Helper function to inject the translated text and tooltip.
*
* @param   {string}    id ID of the HTML element
* @param   {string}    attribute Name of the attribute used for localization
* @param   {boolean}   tooltip
*/
function injectText(id, attribute, tooltip = "")
{
    let object = $('#'+id);
    object.text(translate(attribute));

    /*
    This function will throw an error if no translation
    is found for the tooltip. This is a planned error.
    */
    tooltip = translate(attribute+"_title");

    if(tooltip !== "")
    {
        object.prop('title', tooltip);
    }
}

/**
* Set the value of a switch button.
* @param {string} id      HTML id
* @param {string} varname js internal variable name
*/
function setSwitchButton(id, varname)
{
    let element = $('#'+id);
    element.prop('checked', settings[varname]);
}
