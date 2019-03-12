/*
* ##################################################################
* # Fetch Rules & Exception from URL                               #
* ##################################################################
*/
var providers = [];
var prvKeys = [];
var badges = [];
var tabid = 0;
var siteBlockedAlert = 'javascript:void(0)';
var dataHash;
var localDataHash;
var os;
var currentURL;

var storage = [];

getDataFromDisk();

function start(items)
{
    initStorage(items);

    /**
    * Save OS Version
    */
    chrome.runtime.getPlatformInfo(function(info) {

        os = info.os;


        /**
        * Initialize the JSON provider object keys.
        *
        * @param {JSON Object} obj
        */
        function getKeys(obj){
            for(var key in obj){
                prvKeys.push(key);
            }
        }

        /**
        * Initialize the providers form the JSON object.
        *
        */
        function createProviders()
        {
            data = storage.ClearURLsData;

            for(var p = 0; p < prvKeys.length; p++)
            {
                //Create new provider
                providers.push(new Provider(prvKeys[p],data.providers[prvKeys[p]].completeProvider));

                //Add URL Pattern
                providers[p].setURLPattern(data.providers[prvKeys[p]].urlPattern);

                //Add rules to provider
                for(var r = 0; r < data.providers[prvKeys[p]].rules.length; r++)
                {
                    providers[p].addRule(data.providers[prvKeys[p]].rules[r]);
                }

                //Add exceptions to provider
                for(var e = 0; e < data.providers[prvKeys[p]].exceptions.length; e++)
                {
                    providers[p].addException(data.providers[prvKeys[p]].exceptions[e]);
                }

                //Add redirections to provider
                for(var re = 0; re < data.providers[prvKeys[p]].redirections.length; re++)
                {
                    providers[p].addRedirection(data.providers[prvKeys[p]].redirections[re]);
                }
            }
        }

        /**
        * Convert the external data to Objects and
        * call the create provider function.
        *
        * @param  {String} retrievedText - pure data form github
        */
        function toObject(retrievedText) {
            getKeys(storage.ClearURLsData.providers);
            createProviders();
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
        * Get the hash for the rule file on github.
        * Check the hash with the hash form the local file.
        * If the hash has changed, then download the new rule file.
        * Else do nothing.
        */
        function getHash()
        {
            //Get the target hash from github
            fetch(storage.hashURL)
            .then(function(response){
                var responseTextHash = response.clone().text().then(function(responseTextHash){
                    if(response.ok)
                    {
                        dataHash = responseTextHash;

                        if($.trim(dataHash) !== $.trim(localDataHash))
                        {
                            fetchFromURL();
                        }
                        else {
                            toObject(storage.ClearURLsData);
                            storeHashStatus(1);
                        }
                    }
                    else {
                        dataHash = false;
                    }
                });
            });
        }

        /**
        * Fetch the Rules & Exception from github.
        */
        function fetchFromURL()
        {
            fetch(storage.ruleURL)
            .then(checkResponse);

            function checkResponse(response)
            {
                var responseText = response.clone().text().then(function(responseText){
                    if(response.ok)
                    {
                        var downloadedFileHash = $.sha256(responseText);

                        if($.trim(downloadedFileHash) === $.trim(dataHash))
                        {
                            storage.ClearURLsData = responseText;
                            storage.dataHash = downloadedFileHash;
                            storeHashStatus(2);
                        }
                        else {
                            storeHashStatus(3);
                        }
                        storage.ClearURLsData = JSON.parse(storage.ClearURLsData);
                        toObject(storage.ClearURLsData);
                    }
                });
            }
        }

        // ##################################################################

        /*
        * ##################################################################
        * # Supertyp Provider                                              #
        * ##################################################################
        */
        /**
        * Declare constructor
        *
        * @param {String} _name                Provider name
        * @param {boolean} completeProvider    Set URL Pattern as rule
        */
        function Provider(_name,_completeProvider = false){
            var name = _name;
            var urlPattern;
            var rules = [];
            var exceptions = [];
            var canceling = _completeProvider;
            var redirections = [];

            if(_completeProvider){
                rules.push(".*");
            }

            /**
            * Returns the provider name.
            * @return {String}
            */
            this.getName = function() {
                return name;
            };

            /**
            * Add URL pattern.
            *
            * @require urlPatterns as RegExp
            */
            this.setURLPattern = function(urlPatterns) {
                urlPattern = new RegExp(urlPatterns, "i");
            };

            /**
            * Return if the Provider Request is canceled
            * @return {Boolean} isCanceled
            */
            this.isCaneling = function() {
                return canceling;
            };

            /**
            * Check the url is matching the ProviderURL.
            *
            * @return {boolean}    ProviderURL as RegExp
            */
            this.matchURL = function(url) {
                return !(this.matchException(url)) && urlPattern.test(url);
            };

            /**
            * Add a rule to the rule array.
            *
            * @param String rule   RegExp as string
            */
            this.addRule = function(rule) {
                rules.push(rule);
            };

            /**
            * Return all rules as an array.
            *
            * @return Array RegExp strings
            */
            this.getRules = function() {
                return rules;
            };

            /**
            * Add a exception to the exceptions array.
            *
            * @param String exception   RegExp as string
            */
            this.addException = function(exception) {
                exceptions.push(exception);
            };

            /**
            * Private helper method to check if the url
            * an exception.
            *
            * @param  {String} url     RegExp as string
            * @return {boolean}        if matching? true: false
            */
            this.matchException = function(url) {
                var result = false;

                //Add the site blocked alert to every exception
                if(url == siteBlockedAlert) return true;

                for (var i = 0; i < exceptions.length; i++) {
                    if(result) { break; }

                    exception_regex = new RegExp(exceptions[i], "i");
                    result = exception_regex.test(url);
                }

                return result;
            };

            /**
            * Add a redirection to the redirections array.
            *
            * @param String redirection   RegExp as string
            */
            this.addRedirection = function(redirection) {
                redirections.push(redirection);
            };

            /**
            * Return all redirection.
            *
            * @return url
            */
            this.getRedirection = function(url) {
                var re = null;

                for(var i = 0; i < redirections.length; i++)
                {
                    result = (url.match(new RegExp(redirections[i], "i")));

                    if (result && result.length > 0)
                    {
                        re = (new RegExp(redirections[i], "i")).exec(url)[1];

                        break;
                    }
                }

                return re;
            };
        }
        // ##################################################################

        /**
        * Helper function which remove the tracking fields
        * for each provider given as parameter.
        *
        * @param  {Provider} provider      Provider-Object
        * @param  {webRequest} request     webRequest-Object
        * @return {Array}                  Array with changes and url fields
        */
        function removeFieldsFormURL(provider, request)
        {
            var url = request.url;
            var domain = url.replace(new RegExp("\\?.*", "i"), "");
            var fields = "";
            var rules = provider.getRules();
            var changes = false;
            var cancel = false;

            /*
            * Expand the url by provider redirections. So no tracking on
            * url redirections form sites to sites.
            */
            var re = provider.getRedirection(url);
            if(re !== null)
            {
                url = decodeURIComponent(re);
                //Log the action
                pushToLog(request.url, re, translate('log_redirect'));

                return {
                    "redirect": true,
                    "url": url
                };
            }

            /**
             * Only test for matches, if there are fields that can be cleaned.
             */
            if(existsFields(url))
            {
                /**
                 * It must be non-greedy, because by default .* will match
                 * all ? chars. So the replace function delete everything
                 * before the last ?. With adding a ? on the quantifier *,
                 * we fixed this problem.
                 */
                fields = url.replace(new RegExp(".*?\\?", "i"), "");

                for (var i = 0; i < rules.length; i++) {
                    var beforReplace = fields;

                    fields = fields.replace(new RegExp(rules[i], "i"), "");

                    if(beforReplace != fields)
                    {
                        //Log the action
                        pushToLog(domain+"?"+beforReplace, domain+"?"+fields, rules[i]);

                        if(badges[tabid] == null)
                        {
                            badges[tabid] = 0;
                        }

                        increaseURLCounter();

                        if(!checkOSAndroid())
                        {
                            if(storage.badgedStatus) {
                                browser.browserAction.setBadgeText({text: (++badges[tabid]).toString(), tabId: tabid});
                            }
                            else
                            {
                                browser.browserAction.setBadgeText({text: "", tabId: tabid});
                            }
                        }

                        changes = true;
                    }
                }
                url = domain+"?"+fields;
            }
            else {
                if(domain != url)
                {
                    url = domain;
                    changes = true;
                }
            }

            if(provider.isCaneling()){
                pushToLog(request.url, request.url, translate('log_domain_blocked'));
                if(badges[tabid] == null)
                {
                    badges[tabid] = 0;
                }

                increaseURLCounter();

                if(!checkOSAndroid())
                {
                    if(storage.badgedStatus) {
                        browser.browserAction.setBadgeText({text: (++badges[tabid]).toString(), tabId: tabid});
                    }
                    else
                    {
                        browser.browserAction.setBadgeText({text: "", tabId: tabid});
                    }
                }

                cancel = true;
            }

            return {
                "changes": changes,
                "url": url,
                "cancel": cancel
            };
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
        * Function which called from the webRequest to
        * remove the tracking fields from the url.
        *
        * @param  {webRequest} request     webRequest-Object
        * @return {Array}                  redirectUrl or none
        */
        function clearUrl(request)
        {
            var URLbeforeReplaceCount = countFields(request.url);

            //Add Fields form Request to global url counter
            increaseGlobalURLCounter(URLbeforeReplaceCount);

            if(storage.globalStatus){

                var result = {
                    "changes": false,
                    "url": "",
                    "redirect": false,
                    "cancel": false
                };

                /*
                * Call for every provider the removeFieldsFormURL method.
                */
                for (var i = 0; i < providers.length; i++) {

                    if(providers[i].matchURL(request.url))
                    {
                        result = removeFieldsFormURL(providers[i], request);
                    }

                    /*
                    * Expand urls and bypass tracking.
                    * Cancel the active request.
                    */
                    if(result.redirect)
                    {
                        browser.tabs.update(request.tabId, {url: result.url});
                        return {cancel: true};
                    }

                    /*
                    * Cancel the Request and redirect to the site blocked alert page,
                    * to inform the user about the full url blocking.
                    */
                    if(result.cancel){
                        return {
                            redirectUrl: siteBlockedAlert
                        };
                    }

                    /*
                    * Ensure that the function go not into
                    * a loop.
                    */
                    if(result.changes){
                        return {
                            redirectUrl: result.url
                        };
                    }
                }
            }

            // Default case
            return {};
        }

        /**
        * Function to log all activities from ClearUrls.
        * Only logging when activated.
        * The log is only temporary saved in the cache and will
        * permanently saved with the saveLogOnClose function.
        *
        * @param beforeProcessing  the url before the clear process
        * @param afterProcessing   the url after the clear process
        * @param rule              the rule that triggered the process
        */
        function pushToLog(beforeProcessing, afterProcessing, rule)
        {
            if(storage.loggingStatus)
            {
                storage.log.log.push(
                    {
                        "before": beforeProcessing,
                        "after": afterProcessing,
                        "rule": rule,
                        "timestamp": Date.now()
                    }
                );
            }
        }

        /**
        * Call loadOldDataFromStore, getHash, counter, status and log functions
        */

        loadOldDataFromStore();
        getHash();
        setBadgedStatus();

        /**
        * Call by each tab is updated.
        * And if url has changed.
        */
        function handleUpdated(tabId, changeInfo, tabInfo) {
            if(changeInfo.url)
            {
                delete badges[tabId];
            }
            currentURL = tabInfo.url;
        }

        /**
        * Call by each tab is updated.
        */
        browser.tabs.onUpdated.addListener(handleUpdated);

        /**
        * Call by each tab change to set the actual tab id
        */
        function handleActivated(activeInfo) {
            tabid = activeInfo.tabId;
            browser.tabs.get(tabid).then(function (tab) {
                currentURL = tab.url;
            });
        }

        /**
        * Call by each tab change.
        */
        browser.tabs.onActivated.addListener(handleActivated);

        /**
        * Check the request.
        */
        function promise(requestDetails)
        {
            if(isDataURL(requestDetails))
            {
                return {};
            }
            else {
                var ret = clearUrl(requestDetails);
                return ret;
            }

        }

        /**
        * To prevent long loading on data urls
        * we will check here for data urls.
        *
        * @type {requestDetails}
        * @return {boolean}
        */
        function isDataURL(requestDetails) {
            var s = requestDetails.url;

            return s.substring(0,4) == "data";
        }

        /**
        * Call by each Request and checking the url.
        *
        * @type {Array}
        */
        browser.webRequest.onBeforeRequest.addListener(
            promise,
            {urls: ["<all_urls>"], types: getData("types")},
            ["blocking"]
        );
    });
}

/**
* Save every minute the temporary data to the disk.
*/
setInterval(saveOnExit, 60000);

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
    browser.storage.local.get().then(start, error);
}

/**
* Get the value under the key.
* @param  {String} key
* @return {Object}
*/
function getData(key)
{
    return storage[key];
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
        storage[key] = replaceOldURLs(value);
        break;
        case "types":
        storage[key] = value.split(',');
        break;
        default:
        storage[key] = value;
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
* Write error on console.
*/
function error()
{
    console.log(translate('core_error'));
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
    storage.types = ["main_frame", "sub_frame", "xmlhttprequest"];
    storage.reportServer = "https://clearurls.xn--rb-fka.it";
}

/**
* Reloads the extension.
*/
function reload()
{
    browser.runtime.reload();
}

/**
* Replace the old GitHub URLs with the
* new GitLab URLs.
*/
function replaceOldURLs(url)
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
* Check if an object is empty.
* @param  {Object}  obj
* @return {Boolean}
*/
function isEmpty(obj)
{
    return (Object.getOwnPropertyNames(obj).length === 0);
}

/**
 * Returns the current URL.
 * @return {String} [description]
 */
function getCurrentURL()
{
    return currentURL;
}
