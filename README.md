[<img src="https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_1.png" alt="for Firefox">](https://addons.mozilla.org/en-US/firefox/addon/clearurls/) [<img src="https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png"  alt="for Chrome">](https://chrome.google.com/webstore/detail/clearurls/lckanjgmijmafbedllaakclkaicjfmnk)

# <sub><img src="https://gitlab.com/KevinRoebert/ClearUrls/raw/master/img/clearurls.svg" width=64px height=64px></sub> ClearURLs 

**ClearURLs** is an add-on based on the new WebExtensions technology and is optimized for *Firefox* and now also available for *Chrome* based browsers.

This add-on will remove the tracking fields from all URLs which are visited by the browser and use a rule file, namely `data.min.json`.

This add-on protects your privacy and block the request from advertising services like *doubleclick.net*.

## Application
Large (and small) webpages use elements in the URL, e.g.: https://example.com?source=thisIstheSiteIvisitedBefore to track your online activities. In this example, the source field tells the provider which page you visited before. The add-on will remove these tracking fields from the URL.

## Screenshot
![Interface (version 1.3.4.x)](https://gitlab.com/KevinRoebert/ClearUrls/raw/master/promotion/screens/Popup_1.5.2.png)


## CI/CD Artifacts Download (for Firefox- and Chrome-Dev only)
Here you can download the packed files for the Firefox- and Chrome-Dev:

[Firefox](https://gitlab.com/KevinRoebert/ClearUrls/-/jobs/artifacts/master/raw/ClearUrls_firefox.zip?job=build%20firefox)

[Chrome](https://gitlab.com/KevinRoebert/ClearUrls/-/jobs/artifacts/master/raw/ClearUrls_chrome.zip?job=build%20chrome)

## Test

If you want to test whether ClearURLs works correctly on your system, you can go to this test page: [https://clearurls.roebert.eu/](https://clearurls.roebert.eu/)

## Contribute
If you have any suggestions or complaints, please [create an issue.](https://gitlab.com/KevinRoebert/ClearUrls/issues/new)

## Projects that use parts of ClearURLs

* [Uroute](https://github.com/walterl/uroute) used ClearURLs to filter/clean URL before launching browser

## Recommended by...
*  [ghacks-user.js](https://github.com/ghacksuserjs/ghacks-user.js/wiki/4.1-Extensions)
*  [Awesome Humane Tech List](https://github.com/humanetech-community/awesome-humane-tech#tracking)
  
## Permissions

Reasoning for needed permissions you can find under [this discussion](https://gitlab.com/KevinRoebert/ClearUrls/issues/159).

## Copyright
We use some third-party scripts in our add-on. The authors and licenses are listed below.
-   [WebExtension browser API Polyfill](https://github.com/mozilla/webextension-polyfill) |
    Copyright by Mozilla |
    [MPL-2.0](https://github.com/mozilla/webextension-polyfill/blob/master/LICENSE)
-   [Bootstrap v3.3.7 ](http://getbootstrap.com) |
    Copyright 2011-2016 Twitter, Inc. |
    [MIT](https://github.com/twbs/bootstrap/blob/master/LICENSE)
-   [jQuery v3.2.1](https://jquery.com/) |
    Copyright 2017 The jQuery Foundation |
    [MIT](https://jquery.org/license/)
-   [sha256.jquery.plugin](https://github.com/orsozed/sha256.jquery.plugin) |
    Copyright 2003, Christoph Bichlmeier |
    [MIT](https://raw.github.com/orsozed/JQuery-Plugins/master/license/MIT-LICENSE.txt) |
    [GPLv2](https://raw.github.com/orsozed/JQuery-Plugins/master/license/GPL-LICENSE.txt)
-   [DataTables](https://datatables.net/) |  Copyright 2011-2015 SpryMedia Ltd | [MIT](https://datatables.net/license/)
-   [Pick-a-Color v1.2.3](https://github.com/lauren/pick-a-color) | Copyright (c) 2013 Lauren Sperber and Broadstreet Ads |
    [MIT](https://github.com/lauren/pick-a-color/blob/master/LICENSE)
-   [ip-range-check v0.2.0](https://github.com/danielcompton/ip-range-check) | Copyright (c) 2018 Daniel Compton |
    [MIT](https://github.com/danielcompton/ip-range-check/blob/master/LICENSE)
