# ClearURLs — Chrome Manifest V3 Migration Guide

> **Status: ✅ Migration Complete** — All files have been migrated from MV2 to MV3.

## Project Overview

**ClearURLs** is a browser extension that removes tracking parameters and fields from URLs to protect user privacy. It intercepts web requests, strips tracking query parameters (like `utm_source`, `fbclid`, etc.), blocks known tracking domains, neutralizes ETag-based tracking, and fixes Google/Yandex search result link hijacking.

---

## Architecture Overview

```
manifest.json                  — Extension manifest (MV3)
background.js                  — Service worker entry point (NEW - loads all scripts via importScripts)
browser-polyfill.js            — webextension-polyfill (Firefox/Chrome compat layer)
clearurls.js                   — Core URL cleaning engine + declarativeNetRequest rule builder
core_js/
  storage.js                   — Storage abstraction, app bootstrap (genesis())
  tools.js                     — Utility functions (i18n, icons, badges, hashing)
  message_handler.js           — IPC: explicit dispatch map (no window dependency)
  badgedHandler.js             — Per-tab badge counter management
  pureCleaning.js              — Standalone URL cleaning (for context menu/tools)
  context_menu.js              — "Copy clean link" context menu (uses chrome.scripting)
  historyListener.js           — SPA history.replaceState URL cleaning (uses chrome.scripting)
  watchdog.js                  — Periodic self-test (uses chrome.alarms)
  eTagFilter.js                — ETag header removal via declarativeNetRequest
  popup.js                     — Popup UI controller
  settings.js                  — Settings page controller
  log.js                       — Log viewer controller
  cleaning_tool.js             — Manual URL cleaning tool controller (async bug fixed)
  siteBlockedAlert.js          — Blocked site warning page controller
  google_link_fix.js           — Content script: Google search link fix (MAIN world)
  yandex_link_fix.js           — Content script: Yandex search link fix (MAIN world)
  write_version.js             — Injects version string into HTML pages
  utils/
    Multimap.js                — Multimap data structure (pure JS)
    URLHashParams.js           — URL fragment parameter parser (pure JS)
```

---

## Changes Made (Summary)

### manifest.json
- `browser_action` → `action` (removed `browser_style`)
- `background.scripts` → `background.service_worker: "background.js"`
- `content_security_policy` string → object format
- `<all_urls>` moved from `permissions` to `host_permissions`
- Removed `webRequest`, `webRequestBlocking` permissions
- Added `declarativeNetRequest`, `declarativeNetRequestFeedback`, `scripting`, `alarms`
- Added `"world": "MAIN"` to Google and Yandex content scripts
- Removed `browser_specific_settings` (Chrome-only build)
- Added `web_accessible_resources`, `minimum_chrome_version: "120"`
- Removed `include_globs` (incompatible with MAIN world)

### background.js (NEW)
- Service worker entry point using `importScripts()` to load all background scripts

### clearurls.js
- Removed `browser.webRequest.onBeforeRequest.addListener(..., ["blocking"])`
- Removed `clearUrl()`, `promise()`, `isDataURL()` (MV2 webRequest callbacks)
- Added `buildDeclarativeNetRequestRules()` — converts provider rules to DNR dynamic rules:
  - Query parameter removal → `redirect` + `queryTransform.removeParams`
  - Domain blocking → `block` rules
  - URL redirections → `redirect` + `regexFilter`/`regexSubstitution`
  - Raw rules → `redirect` + `regexFilter`
  - Ping blocking → `block` for ping resource type
- Added `chrome.declarativeNetRequest.onRuleMatchedDebug` listener for statistics
- Updated all `getOrDefault()` calls to standalone function (no prototype pollution)
- Preserved `Provider` class and `removeFieldsFormURL` for pureCleaning/context menu

### core_js/tools.js
- `browser.browserAction.*` → `browser.action.*`
- Removed Firefox-only `setBadgeTextColor` call
- `getBrowser()` rewritten (removed `InstallTrigger` check)
- `Object.prototype.getOrDefault` → standalone `getOrDefault(obj, key, default)` function

### core_js/message_handler.js
- Replaced `window[request.function]` with explicit dispatch map (`messageHandlers`)
- Added `registerMessageHandler(name, fn)` for safe function registration

### core_js/badgedHandler.js
- `browser.browserAction.setBadgeText` → `browser.action.setBadgeText`

### core_js/context_menu.js
- `browser.tabs.executeScript` → `chrome.scripting.executeScript` with `func`+`args`
- Moved `onClicked` listener to top level for service worker compatibility
- Uses `navigator.clipboard.writeText()` with fallback

### core_js/historyListener.js
- `browser.tabs.executeScript` → `chrome.scripting.executeScript` with `func`+`args`
- Moved `webNavigation.onHistoryStateUpdated` listener to top level
- Settings check moved inside listener callback

### core_js/watchdog.js
- `setInterval(60000)` → `chrome.alarms.create("clearurls-watchdog", {periodInMinutes: 1})`
- Uses `chrome.alarms.onAlarm` listener

### core_js/eTagFilter.js
- `browser.webRequest.onHeadersReceived` blocking → `chrome.declarativeNetRequest.updateDynamicRules`
- ETag headers are now removed (not replaced with random values)
- Uses reserved rule ID 99999 for the ETag rule
- `setupETagFilter()` called from genesis() after storage loads

### core_js/storage.js
- `deferSaveOnDisk()` timeout reduced from 30s to 5s for service worker safety
- Added `ensureStorageLoaded()` for service worker re-initialization
- Added `storageInitialized` / `storageInitPromise` state tracking
- All message handlers registered via `registerMessageHandler()` at load time
- `genesis()` uses `ensureStorageLoaded()` instead of direct `browser.storage.local.get()`
- Calls `setupETagFilter()` after storage initialization

### core_js/cleaning_tool.js
- Fixed async race condition bug (global `var i` in for loop with async callbacks)
- Replaced with `Promise.all()` + `map()` pattern
- Removed unnecessary global variables

### core_js/google_link_fix.js
- Removed `<script>` element injection (blocked by MV3 CSP)
- Runs in MAIN world — directly overrides `window.rwt` via `Object.defineProperty`

### core_js/yandex_link_fix.js
- Removed `<script>` element injection (blocked by MV3 CSP)
- Runs in MAIN world — directly overrides `window._borschik` via `Object.defineProperty`

---

## Key Design Decisions

1. **Hybrid Cleaning Approach**: The Provider class and `removeFieldsFormURL` are preserved alongside the new DNR rule system. DNR handles network-level cleaning (the primary path), while the JS-based engine handles the manual cleaning tool, context menu, and watchdog self-tests.

2. **DNR Rule Strategy**:
   - Simple param names → `removeParams` (most efficient)
   - Regex param names → individual `removeParams` rules with provider-scoped `regexFilter`
   - Redirections → `regexSubstitution` with capture group
   - Raw rules → `regexSubstitution` with prefix capture
   - Enforces 1000 regex rule limit and 30000 total rule limit

3. **ETag Filtering**: Changed from replacing ETags with random values to removing them entirely. This is a minor behavioral difference but still prevents ETag-based tracking.

4. **Badge Counters**: Uses `chrome.declarativeNetRequest.onRuleMatchedDebug` for statistics. This API requires the `declarativeNetRequestFeedback` permission and is only available in developer/unpacked mode.

5. **Service Worker Lifecycle**: 
   - All event listeners registered at top level
   - Storage writes deferred by only 5s (down from 30s)
   - `ensureStorageLoaded()` guards against cold starts

---

## Known Limitations

1. **Regex Rule Limit**: DNR limits regex rules to 1000. Extensions with very large rule sets may have some rules truncated.

2. **Complex Raw Rules**: Some raw rules involving complex regex patterns may not convert perfectly to DNR `regexFilter`/`regexSubstitution` format.

3. **Statistics Tracking**: `onRuleMatchedDebug` is only available in developer/unpacked extensions. In production, cleaned counter statistics may not increment for DNR-handled requests.

4. **Firefox Compatibility**: This migration targets Chrome MV3 only. The `browser_specific_settings` block was removed. A separate manifest would be needed for Firefox.

5. **Badge Text Color**: `setBadgeTextColor` was Firefox-only and has been removed. Badge text will use Chrome's default color.

---

## Testing Checklist

- [ ] Extension loads in Chrome without errors
- [ ] Popup opens and shows statistics
- [ ] Tracking parameters are stripped from URLs (visit a URL with `?utm_source=test`)
- [ ] Google search result links are not hijacked (click a result, check URL)
- [ ] Yandex search result links are not hijacked
- [ ] Context menu "Copy clean link" works
- [ ] Settings page loads and saves correctly
- [ ] Log page shows activity
- [ ] Manual cleaning tool works
- [ ] Watchdog alarm fires (check console after 1 minute)
- [ ] ETag filtering toggle works in settings
- [ ] Site blocked alert page displays correctly
- [ ] Extension icon changes when toggled on/off
