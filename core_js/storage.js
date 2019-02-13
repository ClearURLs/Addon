/*jshint esversion: 6 */
/*
 * This script is responsible for the storage.
*/
var storage = [];

/**
* Writes the storage variable to the disk.
*/
function saveOnExit()
{
    var json = {};

    Object.entries(storage).forEach(([key, value]) => {
        switch (key) {
            case "ClearURLsData":
            case "log":
            json[key] = JSON.stringify(value);
            break;
            case "types":
            json[key] = value.toString();
            break;
            default:
            json[key] = value;
        }
    });
    console.log(translate('core_save_on_disk'));
    browser.storage.local.set(json);
}

/**
* Save the value under the key on the disk.
* @param  {String} key
* @param  {Object} value
*/
function saveOnDisk(key, value)
{
    browser.storage.local.set({key: value});
}

/**
* Retrieve everything and save on the RAM.
*/
function getDataFromDisk()
{
    browser.storage.local.get().then(initStorage, error);
}

/**
* Return the value under the key.
* @param  {String} key
* @return {Object}
*/
function getData(key)
{
    return storage[key];
}

/**
 * Return the entire storage object.
 * @return {Object}
 */
function getEntireData()
{
    return storage;
}

/**
* Save the value under the key on the RAM.
* @param {String} key
* @param {Object} value
*/
function setData(key, value)
{
    switch (key) {
        case "ClearURLsData":
        case "log":
        storage[key] = JSON.parse(value);
        break;
        case "hashURL":
        case "ruleURL":
        storage[key] = replaceOldGithubURLs(value);
        break;
        case "types":
        storage[key] = value.split(',');
        break;
        default:
        storage[key] = value;
    }
}

/**
* Write error on console.
*/
function error(e)
{
    console.log(translate('core_error'));
    console.error(e);
}

/**
* Set default values, if the storage is empty.
* @param  {Object} items
*/
function initStorage(items)
{
    initSettings();

    if(!isEmpty(items)) {
        Object.entries(items).forEach(([key, value]) => {
            setData(key, value);
        });
    }

    // Start the clearurls.js
    start();
}

/**
* Set default values for the settings.
*/
function initSettings()
{
    storage.ClearURLsData = [];
    storage.dataHash = "";
    storage.badgedStatus = true;
    storage.globalStatus = true;
    storage.globalurlcounter = 0;
    storage.globalCounter = 0;
    storage.hashStatus = "error";
    storage.loggingStatus = false;
    storage.log = {"log": []};
    storage.statisticsStatus = true;
    storage.badged_color = "ffa500";
    storage.hashURL = "https://gitlab.com/KevinRoebert/ClearUrls/raw/master/data/rules.hash";
    storage.ruleURL = "https://gitlab.com/KevinRoebert/ClearUrls/raw/master/data/data.json";
    storage.types = ["font", "image", "imageset", "main_frame", "media", "object", "object_subrequest", "other", "script", "stylesheet", "sub_frame", "websocket", "xbl", "xml_dtd", "xmlhttprequest", "xslt"];
    storage.reportServer = "https://clearurls.xn--rb-fka.it";
}

/**
* Replace the old GitHub URLs with the
* new GitLab URLs.
*/
function replaceOldGithubURLs(url)
{
    switch (url) {
        case "https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/data/rules.hash?flush_cache=true":
        return "https://gitlab.com/KevinRoebert/ClearUrls/raw/master/data/rules.hash";
        case "https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/data/data.json?flush_cache=true":
        return "https://gitlab.com/KevinRoebert/ClearUrls/raw/master/data/data.json";
        default:
        return url;
    }
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
* Save every minute the temporary data to the disk.
*/
setInterval(saveOnExit, 60000);

// Start storage
getDataFromDisk();
