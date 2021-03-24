# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Ongoing
- Rewrite ClearURLs completely form scratch in typescript
- Add features from the milestone [%1](https://gitlab.com/KevinRoebert/ClearUrls/-/milestones/1)
- Dedicated documentation page like [docs.drasyl.org](https://docs.drasyl.org)

## [1.21.0] - 2021-03-24

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 37

### Changed
- Updated Polish translation by Kityn

### Removed
- Removed `clipboardWrite` permission
- Removed noisy background of popup

### Fixed
- Fixed [#771](https://gitlab.com/KevinRoebert/ClearUrls/-/issues/771)
- Fixed [#466](https://gitlab.com/KevinRoebert/ClearUrls/-/issues/466) by [@aethanyc](https://gitlab.com/aethanyc) in MR [!85](https://gitlab.com/KevinRoebert/ClearUrls/-/merge_requests/85)

## [1.20.0] - 2020-11-21

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 37

### Added
- Added Dutch translation by Harm M.

### Changed
- Changed url decoding to prevent endless loop
- Performance optimizations for rules by [@thexeos](https://gitlab.com/thexeos)
- Changed default rules and hash host to Github Pages
- Changed rules changelog button `href` to the new rules submodule repo
- Updated various translations - thanks to all contributors

### Fixed
- Fixed [#664](https://gitlab.com/KevinRoebert/ClearUrls/issues/664) (also [#739](https://gitlab.com/KevinRoebert/ClearUrls/issues/739), [#740](https://gitlab.com/KevinRoebert/ClearUrls/issues/740))

## [1.19.0] - 2020-07-22

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 37

### Changed
- Changed url decoding to prevent endless loop

## [1.18.1] - 2020-06-07

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 37

### Changed
- Hotfix for the endless loop on new log limit ([#545](https://gitlab.com/KevinRoebert/ClearUrls/issues/545), [#541](https://gitlab.com/KevinRoebert/ClearUrls/issues/541), [#539](https://gitlab.com/KevinRoebert/ClearUrls/issues/539))

## [1.18.0] - 2020-06-06

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 37

### Removed
- sha256.jquery.plugin
- Popper.js v1.16.0
- Bootstrap Colorpicker v3.2.0
- Removed `xbl` type from request types, because it throws since 78.0b3 exceptions (no longer supported)

### Added
- Pickr v1.7.0

### Changed
- Replaced sha256.jquery.plugin with native hashing
- Replaced jQuery dependencies with native JavaScript in all core files (jQuery is only required for the log page)
    - Hopefully this fixes the performance problems that some users experience when using this addon in conjunction with other addons
    - [#256](https://gitlab.com/KevinRoebert/ClearUrls/issues/256)
    - [#535](https://gitlab.com/KevinRoebert/ClearUrls/issues/535)
- Restricted the log limit to max. 5000 entries
    - Default value is now 100
    - Too many log entries have resulted in performance losses for users who have forgotten that they have turned on the log. This step should prevent this.


## [1.17.0] - 2020-04-14

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated some strings of Spanish translation
- Updated some strings of French translation
- Updated some strings of Italian translation
- Updated some strings of Russian translation
- Updated some strings of Swedish translation
- Updated some strings of Turkish translation
- Updated some strings of Ukrainian translation
- Updated some strings of Chinese Simple translation

### Fixed
- Fixed a typo in the path to the Datatables JavaScript file
- Fixed [#445](https://gitlab.com/KevinRoebert/ClearUrls/issues/445)
- Fixed [#462](https://gitlab.com/KevinRoebert/ClearUrls/issues/462)

### Added
- Added check for setBadgeTextColor function (only supported in Firefox)

### Removed
- Removed browser-polyfill content script import (seems no longer needed)
- Removed old `applications` value

## [1.16.0] - 2020-03-20

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added ETag header filtering [#362](https://gitlab.com/KevinRoebert/ClearUrls/issues/362), [#440](https://gitlab.com/KevinRoebert/ClearUrls/issues/440). Hint: Cache must be cleared before first use, to delete the already existing ETags.

### Fixed
- Fixed spontaneous disappearance of the badged
- Fixed wrong counting of blocked elements (too little was  ;D)

### Changed
- Updated all translation
- Changed badged font color to #FFFFFF
- Changed watchdog behavior as follows [#428](https://gitlab.com/KevinRoebert/ClearUrls/issues/428), [#431](https://gitlab.com/KevinRoebert/ClearUrls/issues/431), [#429](https://gitlab.com/KevinRoebert/ClearUrls/issues/429): 
   - Increased watchdog interval to 60 seconds
   - Executed watchdog only if ClearURLs is also active
   - Watchdog restarts ClearURLs at most 3 times and only if ClearURLs has rules
- Changed behavior of downloading rules [#428](https://gitlab.com/KevinRoebert/ClearUrls/issues/428), [#431](https://gitlab.com/KevinRoebert/ClearUrls/issues/431), [#429](https://gitlab.com/KevinRoebert/ClearUrls/issues/429):
   - If download of hash file fails and no local rules are available, then ClearURLs displays `hash_status_code_5` and deactivates itself
   - If download of rules file fails and no local rules are available, then ClearURLs displays `hash_status_code_5` and deactivates itself

## [1.15.0] - 2020-02-16

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated Italian translation by [@gioxx](https://gitlab.com/gioxx)

## [1.14.0] - 2020-02-01

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Changed icon

## [1.13.0] - 2020-02-01

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated some strings of French translation by lucifer

## [1.12.0] - 2020-01-29

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated Russian translation by elfriob
- Updated Spanish translation by [@socram](https://gitlab.com/socram)

## [1.11.0] - 2020-01-06

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added hyperlink auditing blocking [#184](https://gitlab.com/KevinRoebert/ClearUrls/issues/184)
- Added yandex link fix script, to avoid URL tracking [#305](https://gitlab.com/KevinRoebert/ClearUrls/issues/305)

## [1.10.0] - 2020-01-03

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated to Bootstrap 4.3.1
- Updated to jQuery 3.4.1
- Updated to DataTables 1.10.20
- Deleted unnecessary Bootstrap Dialog lib
- Replaced [pick-a-color](https://github.com/lauren/pick-a-color) with [bootstrap-colorpicker 3.2.0](https://github.com/itsjavi/bootstrap-colorpicker)
- Minor corrections on english translation by [@Sopor](https://gitlab.com/Sopor)
- Replaced glyphicons with [fontawesome 5.12.0](https://github.com/FortAwesome/Font-Awesome/tree/5.12.0)

### Added
- Added [popper.js 1.16.0](https://github.com/popperjs/popper.js/tree/v1.16.0)
- Added Swedish translation by [@Sopor](https://gitlab.com/Sopor)

### Fixed
- Fixed [#338](https://gitlab.com/KevinRoebert/ClearUrls/issues/338)
- Fixed [#333](https://gitlab.com/KevinRoebert/ClearUrls/issues/333)
- Fixed [#332](https://gitlab.com/KevinRoebert/ClearUrls/issues/332)
- Fixed [#307](https://gitlab.com/KevinRoebert/ClearUrls/issues/307)
- Maybe [#315](https://gitlab.com/KevinRoebert/ClearUrls/issues/315) fixed

## [1.9.5] - 2019-12-17

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added Turkish translation by Ulaş Çakmak

### Changed
- Updated some strings of French translation by lucifer

### Fixed
- Fixed problem with default RegExp

## [1.9.4] - 2019-11-24

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed toolbar icon on startup [#102](https://gitlab.com/KevinRoebert/ClearUrls/issues/102)

### Added
- Added option to disable/allow domain blocking [#294](https://gitlab.com/KevinRoebert/ClearUrls/issues/294)

### Changed
- Some refactoring

## [1.9.3.1] - 2019-11-15

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Changed data and hash URL to GitLab Pages, to prevent hitting the GitLab infrastructure directly [#295](https://gitlab.com/KevinRoebert/ClearUrls/issues/295#note_245456134).

## [1.9.3] - 2019-11-15

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed wrong initial rules URL

## [1.9.2] - 2019-11-09

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed [#290](https://gitlab.com/KevinRoebert/ClearUrls/issues/290)

### Changed
- Updated some strings of Italian translation by [@gioxx](https://gitlab.com/gioxx)

### Added
- Added a minimal version of the data.min.json file where all line breaks and spaces, as well as default values and empty lists are removed.

## [1.9.1] - 2019-10-24

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed badged in quiet mode

### Added
- Added Italian translation by [@gioxx](https://gitlab.com/gioxx)

## [1.9.0] - 2019-10-22

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed bug in "history tracking injection protection". This option was not disabled, when the global filter switch are on off
- Fixed [#241](https://gitlab.com/KevinRoebert/ClearUrls/issues/241)
- Possible fix for [#203](https://gitlab.com/KevinRoebert/ClearUrls/issues/203)

### Changed
- Refactoring
- Changed background script loading sequence to prevent that required functions are not yet loaded.

### Added
- Added an option to im-/export the log (requires the `downloads` permission)
- Added an option to im-/export the settings (requires the `downloads` permission)
- Added information page for blocked sites, when they are called in the `main_frame`
- Added option to allow referral marketing ([#284](https://gitlab.com/KevinRoebert/ClearUrls/issues/284))
- Added "multiple times URL encodes" recognition
- Added an option to limit the log entries ([#56](https://gitlab.com/KevinRoebert/ClearUrls/issues/56))

## [1.8.5] - 2019-09-29

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed [#264](https://gitlab.com/KevinRoebert/ClearUrls/issues/264)
- Fixed [#262](https://gitlab.com/KevinRoebert/ClearUrls/issues/262)
- Fixed [#267](https://gitlab.com/KevinRoebert/ClearUrls/issues/267)

## [1.8.4] - 2019-09-26

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Force redirects only on main frames
- Added google link fix script, to avoid the sub frame permission for force redirection on google

## [1.8.3] - 2019-09-23

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed OR case

## [1.8.2] - 2019-09-23

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Only redirects, if request is of type main or sub frame to prevent security issues on automatically loaded ressource like images

### Fixed
- Fixed [#253](https://gitlab.com/KevinRoebert/ClearUrls/issues/253)
- Fixed [#254](https://gitlab.com/KevinRoebert/ClearUrls/issues/254)

## [1.8.1] - 2019-09-12

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Improvements on check for android systems ([#206](https://gitlab.com/KevinRoebert/ClearUrls/issues/206))
- Improvements on storage. Away with periodic save of in-memory data to storage. Instead save when there are actual changes by [@tartpvule](https://gitlab.com/tartpvule) in ([!47](https://gitlab.com/KevinRoebert/ClearUrls/merge_requests/47))

## [1.8.0] - 2019-09-11

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added default option to skip URLs with a host in a local range

### Fixed
- Fixed [#238](https://gitlab.com/KevinRoebert/ClearUrls/issues/238)
- Fixed wrong count on cleaning tool (forgot to count also the total amount of elements at cleaning tool)

### Changed
- Improvements on check for android systems ([#206](https://gitlab.com/KevinRoebert/ClearUrls/issues/206))

## [1.7.4] - 2019-09-06

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added Hungarian translations by [@ztoldy2](https://gitlab.com/ztoldy2)

## [1.7.3] - 2019-08-07

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated Brazilian Portuguese translation by Ramon S.

## [1.7.2] - 2019-08-07

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Updated japanese translation by [@Shitennouji](https://gitlab.com/Shitennouji)

## [1.7.1] - 2019-08-04

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added new setting to data.min.json to set if redirects should be enforced via a "tabs.update" ([#221](https://gitlab.com/KevinRoebert/ClearUrls/issues/221))
- Added [#220](https://gitlab.com/KevinRoebert/ClearUrls/issues/220)
- Added [#218](https://gitlab.com/KevinRoebert/ClearUrls/issues/218)

### Fixed
- Fixed YouTube ad redirection bug ([#221](https://gitlab.com/KevinRoebert/ClearUrls/issues/221))
- Fixed [#217](https://gitlab.com/KevinRoebert/ClearUrls/issues/217)

## [1.7.0] - 2019-07-30

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added support for raw rules to cleaning also parts from URL-path

### Fixed
- Fixed misspelling in german translation

## [1.6.9] - 2019-07-29

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- Fixed error in fields RegExp

## [1.6.8] - 2019-07-28

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Improvements on check for android systems ([#206](https://gitlab.com/KevinRoebert/ClearUrls/issues/206))

### Fixed
- [#205](https://gitlab.com/KevinRoebert/ClearUrls/issues/205)

## [1.6.7] - 2019-07-25

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- [#175](https://gitlab.com/KevinRoebert/ClearUrls/issues/175) by [@yukulele](https://gitlab.com/yukulele)
- [#196](https://gitlab.com/KevinRoebert/ClearUrls/issues/196)
- [#204](https://gitlab.com/KevinRoebert/ClearUrls/issues/204)

## [1.6.6] - 2019-06-14

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Fixed
- [#171](https://gitlab.com/KevinRoebert/ClearUrls/issues/171)
- [#195](https://gitlab.com/KevinRoebert/ClearUrls/issues/195)

## [1.6.5] - 2019-06-12

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added support for fragment cleaning

### Fixed
- [#171](https://gitlab.com/KevinRoebert/ClearUrls/issues/171)
- [#191](https://gitlab.com/KevinRoebert/ClearUrls/issues/191)
- [#192](https://gitlab.com/KevinRoebert/ClearUrls/issues/192)
- [#193](https://gitlab.com/KevinRoebert/ClearUrls/issues/193)
- [#194](https://gitlab.com/KevinRoebert/ClearUrls/issues/194)

## [1.6.4] - 2019-05-07

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added Polish translation by [@alekksander](https://gitlab.com/alekksander)

## [1.6.3] - 2019-05-06

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added redirection from [#181](https://gitlab.com/KevinRoebert/ClearUrls/issues/181)

### Changed
- Update french translation by [@hydrargyrum](https://gitlab.com/hydrargyrum)
- Update chinese translation

## [1.6.2] - 2019-04-26

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Added
- Added rules from [#172](https://gitlab.com/KevinRoebert/ClearUrls/issues/172)
- Added rules from [#176](https://gitlab.com/KevinRoebert/ClearUrls/issues/176)
- Added rules from [#178](https://gitlab.com/KevinRoebert/ClearUrls/issues/178)

### Fixed
- [#170](https://gitlab.com/KevinRoebert/ClearUrls/issues/170)
- [#162](https://gitlab.com/KevinRoebert/ClearUrls/issues/162)
- [#163](https://gitlab.com/KevinRoebert/ClearUrls/issues/163)

## [[1.6.1] - 2019-04-14](https://gitlab.com/KevinRoebert/ClearUrls/commit/a8a5f7e311300ae7f186d4b581e805bdf3f9f5d9)

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 22

### Changed
- Chinese translations by [@yipinghuang](https://gitlab.com/yipinghuang)
- French translations

## [1.6] - 2019-04-11

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 28

### Added
- Added listener to the browser history to prevent tracking with the [history.pushState method](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- Added webNavigation and tabs permissions, for the new feature
- Added switches in settings to enable and disable the context menu entry and the history listener
- Added tool to clean URLs, that was pasted into a textbox
- Added icon for new tool to clean URLs

### Fixed
- [#40](https://gitlab.com/KevinRoebert/ClearUrls/issues/40), see also https://curl.kevinroebert.de
- [#103](https://gitlab.com/KevinRoebert/ClearUrls/issues/103), see also https://curl.kevinroebert.de

### Changed
- Changed clipboard-helper.js path to be absolute to prevent problems
- Changed rewrite of old GitHub links to the new data.min.json and rules.min.hash
- Config icon is now bigger and above the config label
- Update Traditional Chinese Translation by [@yipinghuang](https://gitlab.com/yipinghuang)

## [[1.5.8] - 2019-04-10](https://gitlab.com/KevinRoebert/ClearUrls/commit/1b6cc37bdd23011d006bf7ef6824463e7c96067a)

### Compatibility note
- Require Firefox >= 55
- Require Chrome >= 28

### Added
- Added context menu entry, to clean and copy links into clipboard

## [[1.5.4] - 2019-04-08](https://gitlab.com/KevinRoebert/ClearUrls/commit/0a948968b309f418ec4175dd23fedb0b88c97086)

### Fixed
- Changed icon format from svg into png to support Chrome

## [[1.5.3] - 2019-04-03](https://gitlab.com/KevinRoebert/ClearUrls/commit/304cbe2e6bf3756f4bcb675ec4b8b7403158ea5c)

### Removed
- Removed the *tab permission*, because it is not required for all used methods on the tabs api

## [[1.5.2] - 2019-04-01](https://gitlab.com/KevinRoebert/ClearUrls/commit/03e0580b202fc0a77f442f284dd5470cddbbd5c0)

### Added
- Added new screenshots of the ClearURLs popup

### Changed
- Replaced *webextension-polyfill* v.0.3.1 with the new version v0.4.0
- Updated the Chrome version of ClearURLs to the newest version
- Changed ClearURLs to support both Firefox and Chrome, without generating every time to different source codes
- Changed the GitLab-CI to build the Chrome version automatically from the Firefox version
- Replaced the old screenshots in the README with new ones

### Removed
- Removed the old ClearURLs Chrome version

## [[1.5.1.6a] - 2019-03-27](https://gitlab.com/KevinRoebert/ClearUrls/commit/869cd63e645e2cacaf26017366fa4eaa3fb97411)

### Fixed
- Added own flat function and a function that removes empty fields from arrays to support Waterfox

## [[1.5.1.5a] - 2019-03-18](https://gitlab.com/KevinRoebert/ClearUrls/commit/d87d88250dccd07570c10b37f41054ed44a0ee97)

### Fixed
- Bugfix to support Android devices again

## [[1.5.1a] - 2019-03-14](https://gitlab.com/KevinRoebert/ClearUrls/commit/80af6f6feac086490f841adad5fe769d71be86f8)

### Added
- Added *unlimitedStorage* permissions to prevent storage restrictions (which will come in future versions of firefox) and to have enough space for user generated rules

### Changed
- Changed the regex interpretation for better performance

## [[1.5a] - 2019-03-14](https://gitlab.com/KevinRoebert/ClearUrls/commit/80af6f6feac086490f841adad5fe769d71be86f8)

### Added
- New rules file *data.min.json* that is a minimized version of the old one
- New technique to get data from the local storage
- The command pattern has been implemented so that ClearURLs also works in private mode
- Automatically generating hash for *data.min.json* file with GitLab-CI
- Add start and end delimiters to rules
- Preparations for costume rules

### Changed
- Storage improvements, better performance
- Splitted core file into multiple pieces for better overview
- Minimize rules length

### Fixed
- [#124](https://gitlab.com/KevinRoebert/ClearUrls/issues/124)

### Removed
- Warning in private mode (no longer necessary)
- Removed *Report URL* function

## [[1.3.4.2] - 2019-02-01](https://gitlab.com/KevinRoebert/ClearUrls/commit/23e7fa406436c40c561c1e0108c5e9c8c7e9e0d8)

### Changed
- Updated Ukrainian translation from [@a-polivanchuk](https://gitlab.com/a-polivanchuk)

## [[1.3.4.0] - 2018-10-08](https://gitlab.com/KevinRoebert/ClearUrls/commit/06b84d749084997e3d759ebd916772b446adfe9c)

## Added
- Added more request types, as proposed in [#106](https://gitlab.com/KevinRoebert/ClearUrls/issues/106)

## Updated
- Updated french translation
