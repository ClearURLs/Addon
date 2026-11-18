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
    const url = `https://www.google.com/url?q=${target}`;
    assert.equal(addon.clean(url), expected);
    assert.equal(addon.request(url).redirectUrl, expected);
  });
}

for (const [description, url, expected] of [
  ['LinkedIn mixed scheme',
    'https://www.linkedin.com/safety/go?url=HTTPS%3A//example.com/a%2Fb?q=a%26b',
    'HTTPS://example.com/a%2Fb?q=a%26b'],
  ['LinkedIn fully encoded target',
    'https://www.linkedin.com/safety/go?url=https%3A%2F%2Fexample.com%2Fa%252Fb',
    'https://example.com/a%2Fb'],
  ['Google AMP target',
    'https://www.google.com/amp/s/example.com/a%2Fb?q=a%26b',
    'http://example.com/a%2Fb?q=a%26b'],
  ['Google AMP target with a legacy escaped byte',
    'https://www.google.com/amp/s/example.com/a%FFb',
    'http://example.com/a%FFb'],
  ['Google AMP target with an IPv6 host',
    'https://www.google.com/amp/s/[2001:db8::1]/a%2Fb',
    'http://[2001:db8::1]/a%2Fb'],
  ['Google AMP target with an outer encoding layer',
    'https://www.google.com/amp/s/example.com%2Fa%252Fb',
    'http://example.com/a%2Fb'],
  ['Google ad redirect on an AMP path',
    'https://www.google.com/amp/s/example.com/page?adurl=example.org/a%2Fb',
    'http://example.org/a/b'],
]) {
  test(`${description} decodes according to its redirection rule`, async () => {
    const addon = await loadAddon();
    assert.equal(addon.clean(url), expected);
    assert.equal(addon.request(url).redirectUrl, expected);
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
  assert.equal(addon.clean('https://example.com/#%3F%75tm_source=x'), 'https://example.com/');
  assert.equal(addon.clean('https://example.com/#%3F%66bclid=x'), 'https://example.com/');
  assert.equal(addon.clean('https://example.com/#%253F%75tm_source=x'), 'https://example.com/#%253F%75tm_source=x');
  assert.equal(addon.clean('https://example.com/#bad%FF=value'), 'https://example.com/#bad%FF=value');
});
