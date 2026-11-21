const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const addonRoot = path.resolve(__dirname, '../..');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/rules.json'), 'utf8'));

const readAddonSource = file => fs.readFileSync(path.join(addonRoot, file), 'utf8');

async function loadAddon({
  rules = catalog, settings = {}, pollute = false,
  readSource = readAddonSource, expectedProviderNames = Object.keys(rules.providers),
} = {}) {
  let requestListener;
  let historyListener;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const scripts = [];
  const storage = {
    dataHash: 'fixture', globalStatus: true, historyListenerEnabled: true,
    statisticsStatus: false, loggingStatus: false, referralMarketing: true,
    localHostsSkipping: false, types: ['main_frame'], pingRequestTypes: [],
    ...settings,
  };
  const context = vm.createContext({
    URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
    console: { log() {}, error(...args) { rejectReady(new Error(args.join(' '))); } },
    storage,
    fetch: async () => ({ status: 200, text: async () => 'fixture' }),
    chrome: { runtime: { getPlatformInfo(callback) { callback({ os: 'mac' }); } } },
    browser: {
      i18n: { getMessage: key => key },
      webRequest: { onBeforeRequest: { addListener(fn) { requestListener = fn; } } },
      webNavigation: { onHistoryStateUpdated: { addListener(fn) { historyListener = fn; } } },
      browserAction: { setBadgeText: async () => {} },
      runtime: { getURL: value => `moz-extension://test/${value}` },
      tabs: {
        executeScript(tabId, details) { scripts.push({ tabId, ...details }); return Promise.resolve(); },
        update: async () => {}, onUpdated: { addListener() {} },
      },
    },
    getData: key => storage[key],
    storeHashStatus(code) { if (code === 1) resolveReady(); },
    saveOnDisk() {}, deferSaveOnDisk() {},
  });
  const manifest = JSON.parse(readSource('manifest.json'));
  const modules = manifest.background.scripts.filter(file =>
    file.startsWith('core_js/utils/') || [
      'core_js/tools.js', 'core_js/badgedHandler.js', 'core_js/pureCleaning.js',
      'core_js/historyListener.js', 'clearurls.js',
    ].includes(file));
  for (const file of modules) {
    vm.runInContext(readSource(file), context, { filename: file });
  }
  if (pollute) {
    vm.runInContext('Object.prototype.getOrDefault = function () {};', context);
  }
  vm.runInContext(`storage.ClearURLsData = JSON.parse(${JSON.stringify(JSON.stringify(rules))}); start(); historyListenerStart();`, context);
  await ready;
  const names = Array.from(vm.runInContext('providers.map(provider => provider.getName())', context));
  assert.deepEqual(names, expectedProviderNames, 'load all expected providers');
  return {
    context, scripts, names,
    clean: url => context.pureCleaning(url, true),
    request: (url, type = 'xmlhttprequest') =>
      JSON.parse(JSON.stringify(requestListener({ url, type, method: 'GET', tabId: 1 }))),
    history(url) {
      scripts.length = 0;
      historyListener({ url, tabId: 1, frameId: 0 });
      return scripts;
    },
  };
}

module.exports = { loadAddon, catalog };
