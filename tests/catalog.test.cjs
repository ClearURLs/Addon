const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAddon, catalog } = require('./helpers/addon.cjs');

test('the full catalog loads despite enumerable inherited helpers', async () => {
  const addon = await loadAddon({ pollute: true });
  assert.equal(addon.names.length, 206);
  assert.equal(addon.names.includes('getOrDefault'), false);
});

test('Google OAuth is excluded by real providers and history stays untouched', async () => {
  const addon = await loadAddon();
  const url = 'https://accounts.google.com/signin/oauth/id?as=S123:456&requestPath=/signin/oauth/v3/consent';
  assert.equal(addon.clean(url), url);
  assert.equal(addon.history(url).length, 0);
});

test('real tracking removal reaches webRequest and the history script', async () => {
  const addon = await loadAddon();
  const input = 'https://example.com/?utm_source=x&id=42';
  const output = 'https://example.com/?id=42';
  assert.equal(addon.clean(input), output);
  assert.deepEqual(addon.request(input), { redirectUrl: output });
  assert.match(addon.history(input)[0].code, /id=42/);
});

test('prototype pollution creates neither exceptions nor redirects', async () => {
  const addon = await loadAddon({ pollute: true });
  const input = 'https://example.com/?utm_source=x&next=getOrDefault';
  assert.equal(addon.clean(input), 'https://example.com/?next=getOrDefault');
});

test('a later no-op provider preserves earlier raw and field changes', async () => {
  const addon = await loadAddon({ rules: { providers: {
    raw: { urlPattern: '.*', rawRules: ['tracking/'] },
    fields: { urlPattern: '.*', rules: ['utm_source'] },
    noop: { urlPattern: '.*' },
  } } });
  assert.equal(addon.clean('https://example.com/tracking/?utm_source=x&id=42'),
    'https://example.com/?id=42');
});

test('the pinned catalog has the diagnosed source checksum', () => {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const bytes = fs.readFileSync(require.resolve('./fixtures/rules.json'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
    'ccc0b05a867d1ff577db3af8b6ad3f2889d259282a47dd99b3fa3db41a3c4c7d');
  assert.equal(Object.keys(catalog.providers).length, 206);
});

test('legitimate exceptions and domain blocking survive inherited helpers', async () => {
  const addon = await loadAddon({ pollute: true, settings: { domainBlocking: true }, rules: { providers: {
    block: { urlPattern: '^https://blocked.test/', completeProvider: true },
    clean: { urlPattern: '^https://example.test/', rules: ['utm_source'], exceptions: ['/keep\\?'] },
  } } });
  assert.deepEqual(addon.request('https://blocked.test/?next=getOrDefault'), { redirectUrl: 'javascript:void(0)' });
  const exception = 'https://example.test/keep?utm_source=x';
  assert.equal(addon.clean(exception), exception);
  assert.equal(addon.clean('https://example.test/clean?utm_source=x'), 'https://example.test/clean');
});
