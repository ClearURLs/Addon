var element = $("#statistics_value");
var elGlobalPercentage = $("#statistics_value_global_percentage");
var elProgressbar_blocked = $('#progress_blocked');
var elProgressbar_non_blocked = $('#progress_non_blocked');
var elTotal = $('#statistics_total_elements');
var globalPercentage = 0;
var globalCounter;
var globalurlcounter;
var globalStatus;
var badgedStatus;
var hashStatus;
var loggingStatus;
var statisticsStatus;
var currentURL;
var reportServer;

var core = function (func) {
    return browser.runtime.getBackgroundPage().then(func);
};

function getData()
{
    core(function (ref){
        globalCounter = ref.getData('globalCounter');
        globalurlcounter = ref.getData('globalurlcounter');
        globalStatus = ref.getData('globalStatus');
        badgedStatus = ref.getData('badgedStatus');
        hashStatus = ref.getData('hashStatus');
        loggingStatus = ref.getData('loggingStatus');
        statisticsStatus = ref.getData('statisticsStatus');
        currentURL = ref.getCurrentURL();
        reportServer = ref.getData('reportServer');
    });
}

/**
* Initialize the UI.
*
*/
function init()
{
    setSwitchButton("globalStatus", "globalStatus");
    setSwitchButton("tabcounter", "badgedStatus");
    setSwitchButton("logging", "loggingStatus");
    setSwitchButton("statistics", "statisticsStatus");
    setHashStatus();
    changeStatistics();
}

/**
* Get the globalCounter value from the browser storage
* @param  {(data){}    Return value form browser.storage.local.get
*/
function changeStatistics()
{
    globalPercentage = ((globalCounter/globalurlcounter)*100).toFixed(3);

    if(isNaN(Number(globalPercentage))) globalPercentage = 0;

    element.text(globalCounter.toLocaleString());
    elGlobalPercentage.text(globalPercentage+"%");
    elProgressbar_blocked.css('width', globalPercentage+'%');
    elProgressbar_non_blocked.css('width', (100-globalPercentage)+'%');
    elTotal.text(globalurlcounter.toLocaleString());
}

/**
* Set the value for the hashStatus on startUp.
*/
function setHashStatus()
{
    var element = $('#hashStatus');

    if(hashStatus)
    {
        element.text(translate(hashStatus));
    }
    else {
        element.text(translate('hash_status_code_5'));
    }

}

/**
* Change the value of a switch button.
* @param  {string} id        HTML id
* @param  {string} storageID storage internal id
*/
function changeSwitchButton(id, storageID)
{
    var element = $('#'+id);

    changeVisibility(id, storageID);

    element.on('change', function(){
        core(function (ref){
            ref.setData(storageID, element.is(':checked'));
            if(storageID == "globalStatus") ref.changeIcon();
            changeVisibility(id, storageID);

            ref.saveOnExit();
        });
    });
}

/**
 * Change the visibility of sections.
 */
function changeVisibility(id, storageID)
{
    var element;

    switch(storageID)
    {
        case "loggingStatus":
            element = $('#log_section');
            break;
        case "statisticsStatus":
            element = $('#statistic_section');
            break;
        default:
            element = "undefine";
    }

    if(element != "undefine")
    {
        if($('#'+id).is(':checked'))
        {
            element.css('display', '');
            element.css('display', '');
        }
        else {
            element.css('display', 'none');
            element.css('display', 'none');
        }
    }
}

/**
 * Set the value of a switch button.
 * @param {string} id      HTML id
 * @param {string} varname js internal variable name
 */
function setSwitchButton(id, varname)
{
    var element = $('#'+id);
    element.prop('checked', this[varname]);
}

/**
* Reset the global statistic
*/
function resetGlobalCounter(){
    core(function (ref){
        globalurlcounter = 0;
        globalCounter = 0;
        ref.setData('globalCounter', 0);
        ref.setData('globalurlcounter', 0);
        ref.saveOnExit();

        changeStatistics();
    });
}

if(!browser.extension.inIncognitoContext)
{
    getData();
}

$(document).ready(function(){
    if(!browser.extension.inIncognitoContext)
    {
        init();
        $('#reset_counter_btn').on("click", resetGlobalCounter);
        changeSwitchButton("globalStatus", "globalStatus");
        changeSwitchButton("tabcounter", "badgedStatus");
        changeSwitchButton("logging", "loggingStatus");
        changeSwitchButton("statistics", "statisticsStatus");
        $('#loggingPage').attr('href', browser.extension.getURL('./html/log.html'));
        $('#settings').attr('href', browser.extension.getURL('./html/settings.html'));
        $('#reportButton').on("click", reportURL);
        setText();
    } else {
        $('#config_section').remove();
        $('#statistic_section').remove();
        $('#status_section').remove();
        $('#log_section').remove();
        $('#incognito').css('display', '');
    }

});

/**
* Set the text for the UI.
*/
function setText()
{
    injectText('loggingPage','popup_html_log_head');
    injectText('reset_counter_btn','popup_html_statistics_reset_button');
    injectText('rules_status_head','popup_html_rules_status_head');
    injectText('statistics_percentage','popup_html_statistics_percentage');
    injectText('statistics_blocked','popup_html_statistics_blocked');
    injectText('statistics_elements','popup_html_statistics_elements');
    injectText('statistics_head','popup_html_statistics_head');
    injectText('configs_switch_badges','popup_html_configs_switch_badges');
    injectText('configs_switch_log','popup_html_configs_switch_log');
    injectText('configs_switch_filter','popup_html_configs_switch_filter');
    injectText('configs_head','popup_html_configs_head');
    injectText('configs_switch_statistics','configs_switch_statistics');
    injectText('reportButton', 'popup_html_report_button', true);
}

/**
 * Helper function to inject the translated text and tooltip.
 *
 * @param   {string}    id ID of the HTML element
 * @param   {string}    attribute Name of the attribute used for localization
 * @param   {boolean}   tooltip
 */
function injectText(id, attribute, tooltip)
{
    object = $('#'+id);
    object.text(translate(attribute));

    /*
        This function will throw an error if no translation
        is found for the tooltip. This is a planned error.
     */
    tooltip = translate(attribute+"_title");

    if(tooltip != "")
    {
        object.prop('title', tooltip);
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
 * Send the url to the DB on clearurls.röb.it to checked for tracking fields.
 */
function reportURL()
{
    $.ajax({
        url: reportServer+'/report_url.php?url='+encodeURI(currentURL),
        success: function(result) {
            window.alert(translate('success_report_url'));
        },
        error: function(result) {
            window.alert(translate('error_report_url'));
        }
    });
}
