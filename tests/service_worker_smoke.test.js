const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

const projectRoot = path.resolve(__dirname, "..");

function createEvent() {
    const listeners = [];
    return {
        listeners,
        addListener(listener) {
            listeners.push(listener);
        }
    };
}

function createApiMock() {
    const api = {
        action: {
            setIcon: async () => undefined,
            setBadgeText: async () => undefined,
            setBadgeBackgroundColor: async () => undefined
        },
        alarms: {
            create: async () => undefined,
            onAlarm: createEvent()
        },
        contextMenus: {
            create: async () => undefined,
            update: async () => {
                throw new Error("menu does not exist yet");
            },
            remove: async () => undefined,
            onClicked: createEvent()
        },
        declarativeNetRequest: {
            getDynamicRules: async () => [],
            isRegexSupported: async () => ({isSupported: true}),
            updateDynamicRules: async () => undefined
        },
        i18n: {
            getMessage: key => key
        },
        runtime: {
            getPlatformInfo(callback) {
                callback({os: "mac"});
            },
            getURL: value => "chrome-extension://test/" + value,
            onMessage: createEvent(),
            reload() {}
        },
        scripting: {
            executeScript: async () => undefined
        },
        storage: {
            local: {
                get: async () => ({}),
                set: async () => undefined,
                remove: async () => undefined
            }
        },
        tabs: {
            onUpdated: createEvent(),
            query: async () => [],
            update: async () => undefined
        },
        webNavigation: {
            onHistoryStateUpdated: createEvent()
        },
        webRequest: {
            onBeforeRequest: createEvent(),
            onBeforeRedirect: createEvent(),
            onErrorOccurred: createEvent()
        }
    };
    return api;
}

test("background modules register in service-worker order", async () => {
    const api = createApiMock();
    const context = vm.createContext({
        URL,
        URLSearchParams,
        TextEncoder,
        chrome: api,
        browser: api,
        console: {
            debug() {},
            error() {},
            log() {},
            warn() {}
        },
        crypto: webcrypto,
        fetch: async () => {
            throw new Error("offline smoke test");
        },
        setTimeout,
        clearTimeout
    });
    const modules = [
        "core_js/utils/Multimap.js",
        "core_js/utils/URLHashParams.js",
        "core_js/message_handler.js",
        "external_js/ip-range-check.js",
        "core_js/tools.js",
        "core_js/badgedHandler.js",
        "core_js/pureCleaning.js",
        "core_js/context_menu.js",
        "core_js/historyListener.js",
        "clearurls.js",
        "core_js/requestObserver.js",
        "core_js/storage.js",
        "core_js/watchdog.js",
        "core_js/eTagFilter.js"
    ];

    modules.forEach(modulePath => vm.runInContext(
        fs.readFileSync(path.join(projectRoot, modulePath), "utf8"),
        context,
        {filename: modulePath}
    ));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(api.runtime.onMessage.listeners.length, 1);
    assert.equal(api.contextMenus.onClicked.listeners.length, 1);
    assert.equal(api.webNavigation.onHistoryStateUpdated.listeners.length, 1);
    assert.equal(api.webRequest.onBeforeRequest.listeners.length, 1);
    assert.equal(api.webRequest.onBeforeRedirect.listeners.length, 1);
    assert.equal(api.webRequest.onErrorOccurred.listeners.length, 1);
    assert.equal(api.alarms.onAlarm.listeners.length, 1);
});
