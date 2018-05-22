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

    element.on('change', function(){
        core(function (ref){
            ref.setData(storageID, element.is(':checked'));
            if(storageID == "globalStatus") ref.changeIcon();

            ref.saveOnExit();
        });
    });
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

getData();
$(document).ready(function(){
    init();
    $('#reset_counter_btn').on("click", resetGlobalCounter);
    changeSwitchButton("globalStatus", "globalStatus");
    changeSwitchButton("tabcounter", "badgedStatus");
    changeSwitchButton("logging", "loggingStatus");
    changeSwitchButton("statistics", "statisticsStatus");
    $('#loggingPage').attr('href', browser.extension.getURL('./html/log.html'));
    $('#settings').attr('href', browser.extension.getURL('./html/settings.html'));
    setText();
});

/**
* Set the text for the UI.
*/
function setText()
{
    $('#loggingPage').text(translate('popup_html_log_head'));
    $('#loggingPage').prop('title', translate('popup_html_log_head_title'));
    $('#reset_counter_btn').text(translate('popup_html_statistics_reset_button'));
    $('#reset_counter_btn').prop('title', translate('popup_html_statistics_reset_button_title'));
    $('#rules_status_head').text(translate('popup_html_rules_status_head'));
    $('#statistics_percentage').text(translate('popup_html_statistics_percentage'));
    $('#statistics_blocked').text(translate('popup_html_statistics_blocked'));
    $('#statistics_elements').text(translate('popup_html_statistics_elements'));
    $('#statistics_head').text(translate('popup_html_statistics_head'));
    $('#configs_switch_badges').text(translate('popup_html_configs_switch_badges'));
    $('#configs_switch_log').text(translate('popup_html_configs_switch_log'));
    $('#configs_switch_log').prop('title', translate('popup_html_configs_switch_log_title'));
    $('#configs_switch_filter').text(translate('popup_html_configs_switch_filter'));
    $('#configs_head').text(translate('popup_html_configs_head'));
    $('#configs_switch_statistics').text(translate('configs_switch_statistics'));
    $('#configs_switch_statistics').prop('title', translate('configs_switch_statistics_title'));
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
