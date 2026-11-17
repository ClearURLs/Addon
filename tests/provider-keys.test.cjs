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

function makeProviderContext() {
  const context = vm.createContext({
    storage: { dataHash: 'test-hash' },
    fetch: async () => ({ status: 200, text: async () => 'test-hash' }),
    browser: { webRequest: { onBeforeRequest: { addListener() {} } } },
    getData: () => [],
    storeHashStatus() {},
    saveOnDisk() {},
    setBadgedStatus() {},
  });

  vm.runInContext(fs.readFileSync(path.join(addonRoot, 'clearurls.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(addonRoot, 'core_js/pureCleaning.js'), 'utf8'), context);
  vm.runInContext(`
    Object.prototype.getOrDefault = function (key, defaultValue) {
      return this[key] === undefined ? defaultValue : this[key];
    };
    storage.ClearURLsData = JSON.parse(${JSON.stringify(JSON.stringify(providerData))});
    loadOldDataFromStore = function () { localDataHash = storage.dataHash; };
    function countFields() { return 0; }
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
