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
var badgedStatus;
var tabid = 0;
var globalCounter;
var globalurlcounter;
var siteBlockedAlert = browser.extension.getURL ('./siteBlockedAlert.html');

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
*
*/
function loadOldDataFromStore()
{
    browser.storage.local.get('ClearURLsData', function(data){
        if(data.ClearURLsData){
            data = data.ClearURLsData;
        }
        else {
            data = "";
        }

        toJSON(data);
    });
}

/**
* Fetch the Rules & Exception github.
*
*/
function fetchFromURL()
{
    fetch("https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/data/data.json?flush_cache=true")
    .then(checkResponse)
    .catch(function(error){
        loadOldDataFromStore();
    });

    function checkResponse(response)
    {
        var responseText = response.clone().text().then(function(responseText){
            if(response.ok)
            {
                browser.storage.local.set({"ClearURLsData": responseText});
                toJSON(responseText);
            }
            else {
                loadOldDataFromStore();
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
    * @return {String}    ProviderURL as RegExp
    */
    this.matchURL = function(url) {
        return !(this.matchException(url)) && (url.match(urlPattern) != null) && (url.match(urlPattern).length > 0);
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

            result = (url.match(new RegExp(exceptions[i], "gi"))) && (url.match(new RegExp(exceptions[i], "gi")).length > 0);
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

            return {
                "redirect": true,
                "url": url
            };
        }

        for (var i = 0; i < rules.length; i++) {
            var bevorReplace = url;

            url = url.replace(new RegExp(rules[i], "gi"), "");

            if(bevorReplace != url)
            {
                if(badges[tabid] == null)
                {
                    badges[tabid] = 0;
                }

                browser.storage.local.set({"globalCounter": ++globalCounter});
                if(badgedStatus) {
                    browser.browserAction.setBadgeText({text: (++badges[tabid]).toString(), tabId: tabid});
                }
                else
                {
                    browser.browserAction.setBadgeText({text: "", tabId: tabid});
                }

                changes = true;
            }
        }

        if(provider.isCaneling()){
            if(badges[tabid] == null)
            {
                badges[tabid] = 0;
            }

            browser.storage.local.set({"globalCounter": ++globalCounter});
            if(badgedStatus) {
                browser.browserAction.setBadgeText({text: (++badges[tabid]).toString(), tabId: tabid});
            }
            else
            {
                browser.browserAction.setBadgeText({text: "", tabId: tabid});
            }

            cancel = true;
        }
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
                * an loop.
                */
                if(result.changes){
                    return {
                        redirectUrl: result.url
                    };
                }
            }
        }
    }
}

/**
* Call by each tab is closed.
*/
function handleRemoved(tabId, removeInfo) {
    delete badges[tabId];
}

/**
* Get the badged status from the browser storage and put the value
* into a local variable.
*
*/
function setBadgedStatus() {
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

/**
* Call the fetch, counter and status functions
*/
fetchFromURL();
setBadgedStatus();

/**
* Call by each change in the browser storage.
*/
browser.storage.onChanged.addListener(setBadgedStatus);

/**
* Call by each tab is closed.
*/
browser.tabs.onRemoved.addListener(handleRemoved);

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
* Call by each Request and checking the url.
*
* @type {Array}
*/
browser.webRequest.onBeforeRequest.addListener(
    clearUrl,
    {urls: ["<all_urls>"]},
    ["blocking"]
);
