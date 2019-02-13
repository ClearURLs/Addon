var settings = [];

getData();

/**
* Load only when document is ready
*/
$(document).ready(function(){
    setText();
    $(".pick-a-color").pickAColor();
    $('#reset_settings_btn').on("click", reset);
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
        params: ["reportServer", $('input[name=report_server]').val()]
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "saveOnExit",
        params: []
    }).then(handleResponse, handleError);

    browser.runtime.sendMessage({
        function: "reload",
        params: []
    }).then(handleResponse, handleError);

    //location.reload();
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
        params: ["reportServer"]
    }).then((data) => handleResponseData(data, "reportServer", "report_server"), handleError);
}

/**
 * Set the text for the UI.
 */
function setText()
{
    document.title = translate('settings_html_page_title');
    $('#page_title').text(translate('settings_html_page_title'));
    $('#badged_color_label').text(translate('badged_color_label'));
    $('#reset_settings_btn').text(translate('setting_html_reset_button'));
    $('#reset_settings_btn').prop('title', translate('setting_html_reset_button_title'));
    $('#rule_url_label').text(translate('setting_rule_url_label'));
    $('#hash_url_label').text(translate('setting_hash_url_label'));
    $('#types_label').html(translate('setting_types_label'));
    $('#save_settings_btn').text(translate('settings_html_save_button'));
    $('#save_settings_btn').prop('title', translate('settings_html_save_button_title'));
    $('#report_server_label').html(translate('setting_report_server_label'));
}

/**
 * Handle the response from the storage and saves the data.
 * @param  {JSON-Object} data Data JSON-Object
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
