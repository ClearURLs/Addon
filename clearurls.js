/*
* ##################################################################
* # Fetch Rules & Exception from URL                               #
* ##################################################################
*/
var data = [];
var providers = [];
var prvKeys = [];
var globalStatus;
var badges = [];
var log = [];
var logging = false;
var badgedStatus;
var tabid = 0;
var globalCounter;
var globalurlcounter;
var siteBlockedAlert = 'javascript:void(0)';
var dataHash;
var localDataHash;
var os;

/**
* Save OS Version
*/
browser.runtime.getPlatformInfo(function(info) {
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
    * Convert the external data to JSON Objects and
    * call the create provider function.
    *
    * @param  {String} retrievedText - pure data form github
    */
    function toJSON(retrievedText) {
        data = JSON.parse(retrievedText);
        getKeys(data.providers);
        createProviders();
    }

    /**
    * Load local saved data, if the browser is offline or
    * some other network trouble.
    */
    function loadOldDataFromStore()
    {
        browser.storage.local.get('ClearURLsData', function(localData){
            if(localData.ClearURLsData){
                data = localData.ClearURLsData;
            }
            else {
                data = "";
            }

            localDataHash = $.sha256(data);

        });
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
            case 1: status_code = "up to date";
            break;
            case 2: status_code = "updated";
            break;
            case 3: status_code = "update available";
            break;
            default: status_code = "error";
        }
        browser.storage.local.set({"hashStatus": status_code});
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
        fetch("https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/data/rules.hash?flush_cache=true")
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
                        toJSON(data);
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
        fetch("https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/data/data.json?flush_cache=true")
        .then(checkResponse);

        function checkResponse(response)
        {
            var responseText = response.clone().text().then(function(responseText){
                if(response.ok)
                {
                    var downloadedFileHash = $.sha256(responseText);

                    if($.trim(downloadedFileHash) === $.trim(dataHash))
                    {
                        data = responseText;
                        browser.storage.local.set({"ClearURLsData": responseText});
                        storeHashStatus(2);
                    }
                    else {
                        storeHashStatus(3);
                    }
                    toJSON(data);
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
            urlPattern = new RegExp(urlPatterns, "mgi");
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

                exception_regex = new RegExp(exceptions[i], "gi");
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
                result = (url.match(new RegExp(redirections[i], "gi")));

                if (result && result.length > 0)
                {
                    re = (new RegExp(redirections[i], "gi")).exec(url)[1];

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
        var rules = provider.getRules();
        var changes = false;
        var cancel = false;

        if(provider.matchURL(url))
        {
            /*
            * Expand the url by provider redirections. So no tracking on
            * url redirections form sites to sites.
            */
            var re = provider.getRedirection(url);
            if(re !== null)
            {
                url = decodeURIComponent(re);
                //Log the action
                pushToLog(request.url, re, "This url is redirected.");

                return {
                    "redirect": true,
                    "url": url
                };
            }

            for (var i = 0; i < rules.length; i++) {
                var beforReplace = url;

                url = url.replace(new RegExp(rules[i], "gi"), "");

                if(beforReplace != url)
                {
                    //Log the action
                    pushToLog(beforReplace, url, rules[i]);

                    if(badges[tabid] == null)
                    {
                        badges[tabid] = 0;
                    }

                    browser.storage.local.set({"globalCounter": ++globalCounter});
                    if(!checkOSAndroid())
                    {
                        if(badgedStatus) {
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

            if(provider.isCaneling()){
                pushToLog(request.url, request.url, "This domain is blocked.");
                if(badges[tabid] == null)
                {
                    badges[tabid] = 0;
                }

                browser.storage.local.set({"globalCounter": ++globalCounter});
                if(!checkOSAndroid())
                {
                    if(badgedStatus) {
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
        else {
            return {
                "changes": false
            };
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
    * Function which called from the webRequest to
    * remove the tracking fields from the url.
    *
    * @param  {webRequest} request     webRequest-Object
    * @return {Array}                  redirectUrl or none
    */
    function clearUrl(request)
    {
        if(globalurlcounter === null || typeof(globalurlcounter) == "undefined")
        {
            /**
            * Get the globalURLCounter value from the browser storage
            * @param  {(data){}    Return value form browser.storage.local.get
            */
            browser.storage.local.get('globalurlcounter', function(data){
                if(data.globalurlcounter){
                    globalurlcounter = data.globalurlcounter;
                }
                else {
                    globalurlcounter = 0;
                }

                return clearUrl(request);
            });
        }
        else if(globalCounter === null || typeof(globalCounter) == "undefined") {
            /**
            * Get the globalCounter value from the browser storage
            * @param  {(data){}    Return value form browser.storage.local.get
            */
            browser.storage.local.get('globalCounter', function(data){
                if(data.globalCounter){
                    globalCounter = data.globalCounter;
                }
                else {
                    globalCounter = 0;
                }

                return clearUrl(request);
            });
        }
        else {
            var URLbeforeReplaceCount = countFields(request.url);

            //Add Fields form Request to global url counter
            globalurlcounter += URLbeforeReplaceCount;

            browser.storage.local.set({"globalurlcounter": globalurlcounter});
            browser.storage.local.get('globalStatus', clear);

            function clear(data){
                globalStatus = data.globalStatus;

                if(globalStatus == null){
                    globalStatus = true;
                }
            }

            if(globalStatus){

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
                    result = removeFieldsFormURL(providers[i], request);

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
        }

        // Default case
        return {};
    }

    /**
    * This function get the log on start and load the
    * json data in to the log variable.
    * If no log in the local storage, this function
    * create a foundation json variable.
    */
    function getLogOnStart()
    {
        browser.storage.local.get('log', function(data) {
            if(data.log)
            {
                log = JSON.parse(data.log);
            }
            else{
                //Create foundation for log variable
                log = {"log": []};
            }
        });
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
        if(logging)
        {
            log.log.push(
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
    * This function is triggered by the event windows.onRemoved and tabs.onCreated
    * and will save the log permanently to the local storage.
    * We only save the log anticyclically based on performance.
    */
    function saveLog()
    {
        if(logging)
        {
            browser.storage.local.get('resetLog', function(data) {
                if(data.resetLog)
                {
                    log = {"log": []}; // Delete the old log
                    browser.storage.local.set({"resetLog": false});
                }
                else
                {
                    browser.storage.local.set({"log": JSON.stringify(log)});
                }
            });
        }
    }

    /**
    * Check if the status from logging has changed.
    *
    * The default value is false (off).
    */
    function getLoggingStatus()
    {
        browser.storage.local.get('loggingStatus', function(data) {
            if(data.loggingStatus) {
                logging = data.loggingStatus;
            }
            else if(data.loggingStatus === null || typeof(data.loggingStatus) == "undefined"){
                logging = false;
            }
            else {
                logging = false;
            }
        });
    }

    /**
    * Call by each windows is closed or created.
    */
    if(!checkOSAndroid())
    {
        console.log("ClearURLs: Log listener is added.")
        browser.windows.onRemoved.addListener(saveLog);
    }
    browser.tabs.onCreated.addListener(saveLog);

    /**
    * Function that calls some function on storage change.
    */
    function reactToStorageChange()
    {
        setBadgedStatus();
        getLoggingStatus();
    }

    /**
    * Get the badged status from the browser storage and put the value
    * into a local variable.
    *
    */
    function setBadgedStatus() {
        if(!checkOSAndroid()){
            browser.storage.local.get('badgedStatus', function(data) {
                if(data.badgedStatus) {
                    badgedStatus = data.badgedStatus;
                    browser.browserAction.setBadgeBackgroundColor({
                        'color': 'orange'
                    });
                }
                else if(data.badgedStatus === null || typeof(data.badgedStatus) == "undefined"){
                    badgedStatus = false;
                }
                else {
                    badgedStatus = false;
                }
            });
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
    * Call loadOldDataFromStore, getHash, counter, status and log functions
    */

    loadOldDataFromStore();
    getHash();
    setBadgedStatus();
    getLogOnStart();

    /**
    * Call by each change in the browser storage.
    */
    browser.storage.onChanged.addListener(reactToStorageChange);

    /**
    * Call by each tab is updated.
    * And if url has changed.
    */
    function handleUpdated(tabId, changeInfo, tabInfo) {
        if(changeInfo.url)
        {
            delete badges[tabId];
        }
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
        {urls: ["<all_urls>"]},
        ["blocking"]
    );
});
