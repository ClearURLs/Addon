/*jshint esversion: 6 */
/*
* This script is responsible for the core functionalities.
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

function start()
{
    changeIcon();

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
                    if(response.ok && $.trim(responseTextHash))
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

        /*
        * ##################################################################
        * # Fetch Rules & Exception from URL                               #
        * ##################################################################
        */
        function fetchFromURL()
        {
            fetch(storage.ruleURL)
            .then(checkResponse);

            function checkResponse(response)
            {
                var responseText = response.clone().text().then(function(responseText){
                    if(response.ok && $.trim(responseText))
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
        * @param {boolean} _completeProvider    Set URL Pattern as rule
        * @param {boolean} _isActive            Is the provider active?
        */
        function Provider(_name, _completeProvider = false, _isActive = true){
            var name = _name;
            var urlPattern;
            var enabled_rules = {};
            var disabled_rules = {};
            var enabled_exceptions = {};
            var disabled_exceptions = {};
            var canceling = _completeProvider;
            var enabled_redirections = {};
            var disabled_redirections = {};
            var active = _isActive;

            if(_completeProvider){
                enabled_rules[".*"] = true;
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
                return urlPattern.test(url) && !(this.matchException(url));
            };

            /**
            * Add a rule to the rule array
            * and replace old rule with new rule.
            *
            * @param {String} rule        RegExp as string
            * @param {boolean} isActive   Is this rule active?
            */
            this.addRule = function(rule, isActive = true) {
                // Add start and end delimiters to rule
                rule = "^"+rule+"=[^\\/|\\?|&]*(\\/|&(amp;)?)?$";

                if(isActive)
                {
                    enabled_rules[rule] = true;

                    if(disabled_rules[rule] !== undefined)
                    {
                        delete disabled_rules[rule];
                    }
                }
                else {
                    disabled_rules[rule] = true;

                    if(enabled_rules[rule] !== undefined)
                    {
                        delete enabled_rules[rule];
                    }
                }
            };

            /**
            * Return all active rules as an array.
            *
            * @return Array RegExp strings
            */
            this.getRules = function() {
                return Object.keys(enabled_rules);
            };

            /**
            * Add a exception to the exceptions array
            * and replace old with new exception.
            *
            * @param {String} exception   RegExp as string
            * @param {Boolean} isActive   Is this exception acitve?
            */
            this.addException = function(exception, isActive = true) {
                if(isActive)
                {
                    enabled_exceptions[exception] = true;

                    if(disabled_exceptions[exception] !== undefined)
                    {
                        delete disabled_exceptions[exception];
                    }
                }
                else {
                    disabled_exceptions[exception] = true;

                    if(enabled_exceptions[exception] !== undefined)
                    {
                        delete enabled_exceptions[exception];
                    }
                }
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

                for(var exception in enabled_exceptions) {
                    if(result) break;

                    exception_regex = new RegExp(exception, "i");
                    result = exception_regex.test(url);
                }

                return result;
            };

            /**
            * Add a redirection to the redirections array
            * and replace old with new redirection.
            *
            * @param {String} redirection   RegExp as string
            * @param {Boolean} isActive     Is this redirection active?
            */
            this.addRedirection = function(redirection, isActive = true) {
                if(isActive)
                {
                    enabled_redirections[redirection] = true;

                    if(disabled_redirections[redirection] !== undefined)
                    {
                        delete disabled_redirections[redirection];
                    }
                }
                else {
                    disabled_redirections[redirection] = true;

                    if(enabled_redirections[redirection] !== undefined)
                    {
                        delete enabled_redirections[redirection];
                    }
                }
            };

            /**
            * Return all redirection.
            *
            * @return url
            */
            this.getRedirection = function(url) {
                var re = null;

                for(var redirection in enabled_redirections) {
                    result = (url.match(new RegExp(redirection, "i")));

                    if (result && result.length > 0 && redirection)
                    {
                        re = (new RegExp(redirection, "i")).exec(url)[1];

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
                pushToLog(request.url, url, translate('log_redirect'));

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
                fields = extractFileds(url.replace(new RegExp(".*?\\?", "i"), ""));

                fields.forEach(function(field, index) {
                    rules.forEach(function(rule) {
                        var beforReplace = fields.flat().join("&");
                        var match = new RegExp(rule, "i").test(field);

                        if(match) {
                            delete fields[index];

                            //Log the action
                            pushToLog(domain+"?"+beforReplace, domain+"?"+fields.flat().join("&"), rule);

                            if(badges[tabid] == null) badges[tabid] = 0;

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
                    });
                });

                if(fields.flat().length > 0)
                {
                    url = domain+"?"+fields.flat().join("&");
                }
                else{
                    url = domain;
                }
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
