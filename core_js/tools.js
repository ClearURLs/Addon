/*jshint esversion: 6 */
/*
 * This script is responsible for some tools.
*/

/**
* Check if an object is empty.
* @param  {Object}  obj
* @return {Boolean}
*/
function isEmpty(obj)
{
    return (Object.getOwnPropertyNames(obj).length === 0);
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
* Reloads the extension.
*/
function reload()
{
    browser.runtime.reload();
}

/**
* Check if it is an android device.
* @return bool
*/
function checkOSAndroid()
{
    if(os == "android")
    {
        return true;
    }
    else{
        return false;
    }
}

/**
* Return the number of parameters query strings.
* @param  {String}     url URL as String
* @return {int}        Number of Parameters
*/
function countFields(url)
{
    var matches = (url.match(/[^\/|\?|&]+=[^\/|\?|&]+/gi) || []);
    var count = matches.length;

    return count;
}

/**
* Returns true if fields exists.
* @param  {String}     url URL as String
* @return {boolean}
*/
function existsFields(url)
{
    var matches = (url.match(/\?.+/i) || []);
    var count = matches.length;

    return (count > 0);
}

/**
* Load local saved data, if the browser is offline or
* some other network trouble.
*/
function loadOldDataFromStore()
{
    localDataHash = storage.dataHash;
}

/**
* Save the hash status to the local storage.
* The status can have the following values:
*  1 "up to date"
*  2 "updated"
*  3 "update available"
*  @param status_code the number for the status
*/
function storeHashStatus(status_code)
{
    switch(status_code)
    {
        case 1: status_code = "hash_status_code_1";
        break;
        case 2: status_code = "hash_status_code_2";
        break;
        case 3: status_code = "hash_status_code_3";
        break;
        default: status_code = "hash_status_code_4";
    }

    storage.hashStatus = status_code;
}

/**
* Increase by {number} the GlobalURLCounter
* @param  {int} number
*/
function increaseGlobalURLCounter(number)
{
    if(storage.statisticsStatus)
    {
        storage.globalurlcounter += number;
    }
}

/**
* Increase by one the URLCounter
*/
function increaseURLCounter()
{
    if(storage.statisticsStatus)
    {
        storage.globalCounter++;
    }
}

/**
* Change the icon.
*/
function changeIcon()
{
    if(storage.globalStatus){
        browser.browserAction.setIcon({path: "img/clearurls.svg"});
    } else{
        browser.browserAction.setIcon({path: "img/clearurls_gray.svg"});
    }
}

/**
* Get the badged status from the browser storage and put the value
* into a local variable.
*
*/
function setBadgedStatus()
{
    if(!checkOSAndroid() && storage.badgedStatus){
        browser.browserAction.setBadgeBackgroundColor({
            'color': '#'+storage.badged_color
        });
    }
}

/**
* Returns the current URL.
* @return {String} [description]
*/
function getCurrentURL()
{
    return currentURL;
}
