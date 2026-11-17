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

for (const key of ['a%26b', 'a%23b', 'a%3Db', 'a%2Bb']) {
  test(`cleaning preserves the encoded query key ${key}`, async () => {
    const addon = await loadAddon();
    const input = `https://example.com/?utm_source=x&${key}=c`;
    const expected = `https://example.com/?${key}=c`;
    assert.equal(addon.clean(input), expected);
    assert.deepEqual(addon.request(input), { redirectUrl: expected });
  });
}

for (const fragment of ['token=', 'token==', 'state=abc==', 'foo=bar=baz', 'a=1&a=1&b=2&a=3', 'plain']) {
  test(`cleaning preserves fragment #${fragment}`, async () => {
    const addon = await loadAddon();
    assert.equal(addon.clean(`https://example.com/?utm_source=x#${fragment}`), `https://example.com/#${fragment}`);
  });
}

test('cleaning preserves non-UTF-8 query bytes', async () => {
  const addon = await loadAddon();
  const expected = 'https://example.com/?keywords=usb%D7%AA%B4%AE%BF%DA';
  assert.equal(addon.clean(`${expected}&utm_source=x`), expected);
  assert.deepEqual(addon.request(`${expected}&utm_source=x`), { redirectUrl: expected });
});

for (const [target, expected] of [
  ['https%3A%2F%2Fexample.com%2F%3Fq%3Da%2526b', 'https://example.com/?q=a%26b'],
  ['https%3A%2F%2Fexample.com%2F%3Fq%3D100%2525', 'https://example.com/?q=100%25'],
  ['HTTPS%3A%2F%2Fexample.com%2F', 'HTTPS://example.com/'],
]) {
  test(`Google redirect preserves ${expected}`, async () => {
    const addon = await loadAddon();
    assert.equal(addon.clean(`https://www.google.com/url?q=${target}`), expected);
  });
}

test('the injected history script preserves the existing navigation state', async () => {
  const addon = await loadAddon();
  const [script] = addon.history('https://example.com/?utm_source=x&id=42');
  const state = { route: 42 };
  const page = { history: { state, replaceState(value, title, url) { this.state = value; this.url = url; } } };
  vm.runInNewContext(script.code, page);
  assert.equal(page.history.url, 'https://example.com/?id=42');
  assert.strictEqual(page.history.state, state);
});

test('encoded fragment tracking names are matched once', async () => {
  const addon = await loadAddon();
  assert.equal(addon.clean('https://example.com/#%75tm_source=x'), 'https://example.com/');
  assert.equal(addon.clean('https://example.com/#%2575tm_source=x'), 'https://example.com/#%2575tm_source=x');
});
