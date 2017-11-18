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
    var element = $("#statistics_value");
    var elGlobalPercentage = $("#statistics_value_global_percentage");
    var elProgressbar_blocked = $('#progress_blocked');
    var elProgressbar_non_blocked = $('#progress_non_blocked');
    var elTotal = $('#statistics_total_elements');
    var globalPercentage = 0;
    var globalCounter;
    var globalurlcounter;

    browser.storage.local.get('globalCounter', function(data){
        if(data.globalCounter){
            globalCounter = data.globalCounter;
        }
        else {
            globalCounter = 0;
        }

        element.text(globalCounter.toLocaleString());
    });

    browser.storage.local.get('globalurlcounter', function(data){
        if(data.globalurlcounter){
            globalurlcounter = data.globalurlcounter;
        }
        else {
            globalurlcounter = 0;
        }

        globalPercentage = ((globalCounter/globalurlcounter)*100).toFixed(3);

        if(isNaN(Number(globalPercentage))) globalPercentage = 0;

        elGlobalPercentage.text(globalPercentage+"%");
        elProgressbar_blocked.css('width', globalPercentage+'%');
        elProgressbar_non_blocked.css('width', (100-globalPercentage)+'%');
        elTotal.text(globalurlcounter.toLocaleString());
    });
}

/**
* Change the value of the globalStatus.
* Call by onChange()
*
*/
function changeGlobalStatus() {
    var element = $('#globalStatus').is(':checked');

    browser.storage.local.set({'globalStatus': element});
}

/**
* Set the values for the global status switch
*/
function setGlobalStatus() {
    var element = $('#globalStatus');

    browser.storage.local.get('globalStatus', function(data) {
        if(data.globalStatus) {
            element.prop('checked', true);
        }
        else if(data.globalStatus === null || typeof(data.globalStatus) == "undefined"){
            element.prop('checked', true);
            browser.storage.local.set({'globalStatus': true});
        }
        else {
            element.prop('checked', false);
        }
    });
}

/**
* Change the value of the badgedStatus.
* Call by onChange()
*
*/
function changeTabcounter() {
    var element = $('#tabcounter').is(':checked');

    browser.storage.local.set({'badgedStatus': element});
}

/**
* Set the values for the tabcounter switch
*/
function setTabcounter() {
    var element = $('#tabcounter');

    browser.storage.local.get('badgedStatus', function(data) {
        if(data.badgedStatus)
        {
            element.prop('checked', true);
        }
        else if(data.badgedStatus === null || typeof(data.badgedStatus) == "undefined"){
            element.prop('checked', true);
            browser.storage.local.set({'badgedStatus': true});
        }
        else {
            element.prop('checked', false);
        }
    });
}

/**
* Change the value of the logging switch
*/
function changeLogging()
{
    var element = $('#logging').is(':checked');

    browser.storage.local.set({'loggingStatus': element});
}

/**
 * Set the value for the hashStatus on startUp.
 */
function setHashStatus()
{
    var element = $('#hashStatus');

    browser.storage.local.get('hashStatus', function(data) {
        if(data.hashStatus)
        {
            element.text(data.hashStatus);
        }
        else {
            element.text('Oops something went wrong!');
        }
    });
}

/**
* Set the value for the logging switch
*/
function setLogging()
{
    var element = $('#logging');

    browser.storage.local.get('loggingStatus', function(data) {
        if(data.loggingStatus)
        {
            element.prop('checked', true);
        }
        else if(data.loggingStatus === null || typeof(data.loggingStatus) == "undefined"){
            element.prop('checked', false);
            browser.storage.local.set({'loggingStatus': false});
        }
        else {
            element.prop('checked', false);
        }
    });
}

/**
* Reset the global statistic
*
*/
function resetGlobalCounter(){
    browser.storage.local.set({"globalCounter": 0});
    browser.storage.local.set({"globalurlcounter": 0});
}

$(document).ready(function(){
    init();
    $("#globalStatus").on("change", changeGlobalStatus);
    $('#reset_counter_btn').on("click", resetGlobalCounter);
    $('#tabcounter').on('change', changeTabcounter);
    $('#logging').on('change', changeLogging);
    $('#loggingPage').attr('href', browser.extension.getURL('./log.html'));

    browser.storage.onChanged.addListener(changeStatistics);
});
