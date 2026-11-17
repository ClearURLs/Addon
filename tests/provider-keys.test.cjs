const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const addonRoot = path.resolve(__dirname, '..');
const context = vm.createContext({});

vm.runInContext(`
  Object.prototype.getOrDefault = function (key, defaultValue) {
    return this[key] === undefined ? defaultValue : this[key];
  };
`, context);
vm.runInContext(fs.readFileSync(path.join(addonRoot, 'clearurls.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(addonRoot, 'core_js/pureCleaning.js'), 'utf8'), context);
vm.runInContext('function countFields() { return 0; }', context);

test('provider keys exclude enumerable Object.prototype helpers', () => {
  const providerNames = vm.runInContext(
    `getProviderKeys({ google: {}, globalRules: {} })`,
    context,
  );

  assert.deepEqual(Array.from(providerNames), ['google', 'globalRules']);
  assert.equal(providerNames.includes('getOrDefault'), false);
});

test('Google OAuth query values remain unchanged when no provider matches', () => {
  const oauthUrl = 'https://accounts.google.com/signin/oauth/id?as=S123:456&requestPath=/signin/oauth/v3/consent';
  const result = vm.runInContext(`pureCleaning(${JSON.stringify(oauthUrl)}, true)`, context);

  assert.equal(result, oauthUrl);
});
