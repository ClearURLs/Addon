/*
 * ClearURLs - Manifest V3 Service Worker Entry Point
 * Loads all background scripts via importScripts().
 */
try {
    importScripts(
        'browser-polyfill.js',
        'core_js/utils/Multimap.js',
        'core_js/utils/URLHashParams.js',
        'core_js/message_handler.js',
        'external_js/ip-range-check.js',
        'core_js/tools.js',
        'core_js/badgedHandler.js',
        'core_js/pureCleaning.js',
        'core_js/context_menu.js',
        'core_js/historyListener.js',
        'clearurls.js',
        'core_js/storage.js',
        'core_js/watchdog.js',
        'core_js/eTagFilter.js'
    );
} catch (e) {
    console.error('[ClearURLs] Failed to load background scripts:', e);
}
