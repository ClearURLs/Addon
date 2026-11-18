const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { loadAddon } = require('./helpers/addon.cjs');

test('no-op cleaning preserves the exact URL and does not write history', async () => {
  const addon = await loadAddon();
  const url = 'https://example.com/callback?next=/signed/path&as=S123:456&q=a+b';
  assert.equal(addon.clean(url), url);
  assert.equal(addon.history(url).length, 0);
});

for (const [target, expected] of [
  ['https%3A%2F%2Fexample.com%2F%3Fq%3Da%2526b', 'https://example.com/?q=a%26b'],
  ['https%3A%2F%2Fexample.com%2F%3Fq%3D100%2525', 'https://example.com/?q=100%25'],
  ['HTTPS%3A%2F%2Fexample.com%2F', 'HTTPS://example.com/'],
  ['https%253A%252F%252Fexample.com%252F%253Fq%253Da%252526b', 'https://example.com/?q=a%26b'],
]) {
  test(`Google redirect preserves ${expected}`, async () => {
    const addon = await loadAddon();
    assert.equal(addon.clean(`https://www.google.com/url?q=${target}`), expected);
  });
}

test('the injected history script preserves the existing navigation state', async () => {
  const addon = await loadAddon();
  const url = 'https://example.com/?utm_source=x&id=42';
  const [script] = addon.history(url);
  const state = { route: 42 };
  const page = {
    location: { href: url },
    history: { state, replaceState(value, title, url) { this.state = value; this.url = url; } },
  };
  vm.runInNewContext(script.code, page);
  assert.equal(page.history.url, 'https://example.com/?id=42');
  assert.strictEqual(page.history.state, state);
});

test('encoded fragment tracking names are matched once', async () => {
  const addon = await loadAddon();
  assert.equal(addon.clean('https://example.com/#%75tm_source=x'), 'https://example.com/');
  assert.equal(addon.clean('https://example.com/#%2575tm_source=x'), 'https://example.com/#%2575tm_source=x');
  assert.equal(addon.clean('https://example.com/#%3Futm_source=x'), 'https://example.com/');
  assert.equal(addon.clean('https://example.com/#%253Futm_source=x'), 'https://example.com/#%253Futm_source=x');
  assert.equal(addon.clean('https://example.com/#bad%FF=value'), 'https://example.com/#bad%FF=value');
});
