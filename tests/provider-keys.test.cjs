const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const addonRoot = path.resolve(__dirname, '..');
const providerData = {
  providers: {
    sample: {
      urlPattern: '^https?://example\\.test',
      rules: ['utm_source'],
      exceptions: [],
      redirections: [],
    },
  },
};

function makeProviderContext(rulesData = providerData) {
  const scripts = [];
  const context = vm.createContext({
    URL, TextEncoder, scripts,
    storage: { dataHash: 'test-hash', globalStatus: true },
    fetch: async () => ({ status: 200, text: async () => 'test-hash' }),
    chrome: { runtime: { getPlatformInfo(callback) { callback({ os: 'linux' }); } } },
    browser: {
      webRequest: { onBeforeRequest: { addListener() {} } },
      tabs: {
        onUpdated: { addListener() {} },
        executeScript(tabId, details) { scripts.push({ tabId, ...details }); return Promise.resolve(); },
      },
    },
    getData: () => [],
    storeHashStatus() {},
    saveOnDisk() {},
  });

  for (const file of ['core_js/utils/Multimap.js', 'core_js/utils/URLHashParams.js',
    'core_js/tools.js', 'core_js/badgedHandler.js', 'core_js/historyListener.js']) {
    vm.runInContext(fs.readFileSync(path.join(addonRoot, file), 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync(path.join(addonRoot, 'clearurls.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(addonRoot, 'core_js/pureCleaning.js'), 'utf8'), context);
  vm.runInContext(`
    Object.prototype.getOrDefault = function (key, defaultValue) {
      return this[key] === undefined ? defaultValue : this[key];
    };
    storage.ClearURLsData = JSON.parse(${JSON.stringify(JSON.stringify(rulesData))});
  `, context);
  vm.runInContext('start()', context);

  return context;
}

test('provider keys exclude enumerable Object.prototype helpers', () => {
  const context = makeProviderContext();
  const providerNames = vm.runInContext(
    `getProviderKeys({ google: {}, globalRules: {} })`,
    context,
  );

  assert.deepEqual(Array.from(providerNames), ['google', 'globalRules']);
  assert.equal(providerNames.includes('getOrDefault'), false);
});

test('provider defaults ignore inherited configuration values', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(addonRoot, 'clearurls.js'), 'utf8'), context);
  vm.runInContext(`Object.prototype.inheritedValue = 'polluted'`, context);

  const value = vm.runInContext(`getOrDefault({}, 'inheritedValue', 'default')`, context);

  assert.equal(value, 'default');
});

test('tools do not add getOrDefault to Object.prototype', () => {
  const context = vm.createContext({ TextEncoder });
  vm.runInContext(fs.readFileSync(path.join(addonRoot, 'core_js/tools.js'), 'utf8'), context);

  const hasPrototypeHelper = vm.runInContext(
    `Object.prototype.hasOwnProperty.call(Object.prototype, 'getOrDefault')`,
    context,
  );

  assert.equal(hasPrototypeHelper, false);
});

test('inherited helper methods are not treated as URL exceptions', async () => {
  const context = makeProviderContext();
  await new Promise((resolve) => setImmediate(resolve));
  const providerNames = vm.runInContext('providers.map((provider) => provider.getName())', context);
  assert.deepEqual(Array.from(providerNames), ['sample']);

  const matchesProvider = vm.runInContext(
    `providers[0].matchURL('https://example.test/?q=getOrDefault')`,
    context,
  );

  assert.equal(matchesProvider, true);
});

test('Google OAuth URLs remain unchanged with the History API cleaner enabled', async () => {
  const context = makeProviderContext();
  await new Promise((resolve) => setImmediate(resolve));
  const oauthUrl = 'https://accounts.google.com/signin/oauth/id?as=S123:456&requestPath=/signin/oauth/v3/consent';

  const result = vm.runInContext(`pureCleaning(${JSON.stringify(oauthUrl)}, true)`, context);

  assert.equal(result, oauthUrl);
});

test('inherited helper methods are not treated as redirection rules', async () => {
  const context = makeProviderContext();
  await new Promise((resolve) => setImmediate(resolve));

  const redirection = vm.runInContext(
    `providers[0].getRedirection('https://example.test/?q=getOrDefault')`,
    context,
  );

  assert.equal(redirection, null);
});

test('a matching provider without a rule change preserves URL bytes and leaves history untouched', async () => {
  const context = makeProviderContext();
  await new Promise((resolve) => setImmediate(resolve));
  const url = 'https://example.test/callback?next=/signed/path&as=S123:456&q=a+b';

  assert.equal(context.providers[0].matchURL(url), true);
  assert.equal(context.pureCleaning(url, true), url);
  context.historyCleaner({ url, tabId: 1, frameId: 0 });
  assert.equal(context.scripts.length, 0);
});

test('a real rule change still reaches the history script and preserves navigation state', async () => {
  const context = makeProviderContext();
  await new Promise((resolve) => setImmediate(resolve));
  context.historyCleaner({ url: 'https://example.test/?utm_source=x&id=42', tabId: 1, frameId: 0 });

  assert.equal(context.scripts.length, 1);
  const state = { route: 42 };
  const history = { state, replaceState(value, title, url) { this.state = value; this.url = url; } };
  vm.runInNewContext(context.scripts[0].code, { history });
  assert.equal(history.url, 'https://example.test/?id=42');
  assert.strictEqual(history.state, state);
});

test('later no-op providers preserve earlier raw-rule and field changes', async () => {
  const context = makeProviderContext({ providers: {
    raw: { urlPattern: '.*', rawRules: ['tracking/'] },
    fields: { urlPattern: '.*', rules: ['utm_source'] },
    noop: { urlPattern: '.*' },
  } });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(context.pureCleaning('https://example.test/tracking/?utm_source=x&id=42', true),
    'https://example.test/?id=42');
});
