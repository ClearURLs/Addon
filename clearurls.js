/*
 * ##################################################################
 * # Fetch Rules & Exception from URL                               #
 * ##################################################################
 */
function fetchFromURL(url)
{
    fetch(url)
    .then((response) => response.text().then(toJSON));

    function toJSON(retrievedText) { 
        return JSON.parse(retrievedText);
    }
}

var globalRules = fetchFromURL('https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/rules/rules.json');
var globalExceptions = fetchFromURL('https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/rules/exceptions.json');
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
function Provider(_name,_completeProvider=false){
    var name = name;
    var urlPattern;
    var rules = new Array();
    var exceptions = new Array();

    /**
     * Add URL pattern.
     * 
     * @require urlPatterns as RegExp
     */
    this.setURLPattern = function(urlPatterns) {
        if(_completeProvider){
            rules.push(urlPattern);
        }

        urlPattern = new RegExp(urlPatterns, "mgi");
    };

    /**
     * Check the url is matching the ProviderURL.
     * 
     * @return {String}    ProviderURL as RegExp
     */    
    this.matchURL = function(url) {    
        return !(matchException(url)) && (url.match(urlPattern) != null) && (url.match(urlPattern).length > 0);
    };

    /**
     * Add a rule to the rule array.
     * 
     * @param String rule   RegExp as string
     */
    this.addRule = function(rule) {
        rules.push(rule);
    };

    this.setRules = function(_rules) {
        rules = _rules;
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
    matchException = function(url) {
        var result = false;

        for (var i = 0; i < exceptions.length; i++) {
            if(result) { break; }
            
            result = (url.match(new RegExp(exceptions[i], "gmi")) != null) && (url.match(new RegExp(exceptions[i], "gmi")).length > 0);          
        }

        return result;
    };
}
// ##################################################################

/*
 * ##################################################################
 * # Amazon Provider                                                #
 * ##################################################################
 */
var amazon = new Provider("Amazon");
  amazon.setURLPattern('(https:\\/\\/||http:\\/\\/).*(\\.amazon\\.)\\w{2,}\\/.*');
  amazon.setRules(globalRules);
  // amazon.addException('.*(amazon\\.)\\w{2,}(\\/gp\\/).*');
  // amazon.addRule('pf_rd_[a-zA-Z]=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // amazon.addRule('qid=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // amazon.addRule('sr=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // amazon.addRule('srs=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // amazon.addRule('.*(amazon-adsystem\\.com)\\/.*');
  // amazon.addRule('.*(adsensecustomsearchads\\.com)\\/.*');
  // amazon.addRule('pd_rd_[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
// ##################################################################

/*
 * ##################################################################
 * # Google Provider                                                #
 * ##################################################################
 */
var google = new Provider("Google");
  google.setURLPattern('(https:\\/\\/||http:\\/\\/).*(\\.google\\.)\\w{2,}\\/.*');
  google.addException('.*(accounts).*');
  google.addException('(https:\\/\\/||http:\\/\\/).*(googlevideo\\.com)\\/.*');
  google.addException('(https:\\/\\/||http:\\/\\/).*(youtube\\.)\\w{2,}\\/.*');

  google.addRule('utm_[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // google.addRule('sa=[a-zA-Z0-9\\-]*[\\?|&]?'); //Must stay in, otherwise links can not be automatically open
  google.addRule('ved=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('bi[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // google.addRule('client=[a-zA-Z0-9\\-]*[\\?|&]?'); //Must stay in, otherwise translate.google.* do not work
  google.addRule('gfe_[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('ei=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('source=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('gs_[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('site=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('&\\.[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('oq=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('esrc=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('uact=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('cd=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('cad=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('gws_[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('im[a-zA-Z]*=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('atyp=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // google.addRule('ct=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?'); //Must stay in, otherwise links can not be automatically open
  google.addRule('vet=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('zx=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('_u=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  // google.addRule('v=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?'); //Must stay in, otherwise youtube do not work
  google.addRule('je=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
  google.addRule('[a-zA-Z\\_]*id=[a-zA-Z0-9\\-\\.\\_]*[\\?|&]?');
// ##################################################################

/*
 * ##################################################################
 * # Googlesyndication Provider                                     #
 * ##################################################################
 */
var googlesyndication = new Provider("Googlesyndication",true);
  googlesyndication.setURLPattern('.*(\\.googlesyndication\\.)\\w{2,}\\/.*');
// ##################################################################

/*
 * ##################################################################
 * # Doubleclick Provider                                           #
 * ##################################################################
 */
var doubleclick = new Provider("Doubleclick", true);
  doubleclick.setURLPattern('.*(doubleclick\\.net)\\/.*');
// ##################################################################

/*
 * ##################################################################
 * # Urchin Tracking Module Provider                                #
 * ##################################################################
 */
var utm = new Provider("UTM", false);
  utm.setURLPattern('.*');
  utm.addRule('utm_[a-zA-Z]*=.*[\\?|&]?');
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

    if(provider.matchURL(url))
    {
        for (var i = 0; i < rules.length; i++) {
            var bevorReplace = url;
            
            url = url.replace(new RegExp(rules[i], "gi"), "");

            if(bevorReplace != url)
            {
                console.log("Bevor: "+bevorReplace);
                console.log("After: "+url);
                console.log("##################################################################");
                changes = true;
            }
        }
    }

    return {
        "changes": changes,
        "url": url
    }
};

/**
 * Function which called from the webRequest to
 * remove the tracking fields from the url.
 * 
 * @param  {webRequest} request     webRequest-Object
 * @return {Array}                  redirectUrl or none
 */
function clearUrl(request)
{
    var result = {
        "changes": false,
        "url": ""
    };
    var providers = [amazon, google, googlesyndication, doubleclick, utm];

    /*
     * Call for every provider the removeFieldsFormURL method.
     */
    for (var i = 0; i < providers.length; i++) {
        result = removeFieldsFormURL(providers[i], request);

        /*
         * Ensure that the function go not into
         * an loop.
         */
        if(result["changes"]){
            return {
                redirectUrl: result["url"]
            }; 
        }         
    }
       
};

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