# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
