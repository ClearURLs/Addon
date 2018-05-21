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
    });
}

/**
* Initialize the UI.
*
*/
function init()
{
    setHashStatus();
    setGlobalStatus();
    changeStatistics();
    setTabcounter();
    setLogging();
}

/**
* Get the globalCounter value from the browser storage
* @param  {(data){}    Return value form browser.storage.local.get
*/
function changeStatistics(){
    globalPercentage = ((globalCounter/globalurlcounter)*100).toFixed(3);

    if(isNaN(Number(globalPercentage))) globalPercentage = 0;

    element.text(globalCounter.toLocaleString());
    elGlobalPercentage.text(globalPercentage+"%");
    elProgressbar_blocked.css('width', globalPercentage+'%');
    elProgressbar_non_blocked.css('width', (100-globalPercentage)+'%');
    elTotal.text(globalurlcounter.toLocaleString());
}

/**
* Change the value of the globalStatus.
* Call by onChange()
*
*/
function changeGlobalStatus() {
    var element = $('#globalStatus').is(':checked');

    core(function (ref){
        ref.setData('globalStatus', element);
        ref.saveOnExit();
    });
}

/**
* Set the values for the global status switch
*/
function setGlobalStatus() {
    var element = $('#globalStatus');
    element.prop('checked', globalStatus);
}

/**
* Change the value of the badgedStatus.
* Call by onChange()
*
*/
function changeTabcounter() {
    var element = $('#tabcounter').is(':checked');

    core(function (ref){
        ref.setData('badgedStatus', element);
        ref.saveOnExit();
    });
}

/**
* Set the values for the tabcounter switch
*/
function setTabcounter() {
    var element = $('#tabcounter');
    element.prop('checked', badgedStatus);
}

/**
* Change the value of the logging switch
*/
function changeLogging()
{
    var element = $('#logging').is(':checked');
    core(function (ref){
        ref.setData('loggingStatus', element);
        ref.saveOnExit();
    });
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
* Set the value for the logging switch
*/
function setLogging()
{
    var element = $('#logging');
    element.prop('checked', loggingStatus);
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
    });
}

getData();
$(document).ready(function(){
    init();
    $("#globalStatus").on("change", changeGlobalStatus);
    $('#reset_counter_btn').on("click", resetGlobalCounter);
    $('#tabcounter').on('change', changeTabcounter);
    $('#logging').on('change', changeLogging);
    $('#loggingPage').attr('href', browser.extension.getURL('./html/log.html'));

    setText();

    browser.storage.onChanged.addListener(changeStatistics);
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
