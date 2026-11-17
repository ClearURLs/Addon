const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAddon } = require('./helpers/addon.cjs');

for (const fragment of ['token=', 'token==', 'state=abc==', 'foo=bar=baz', 'a=1&a=1&b=2&a=3', 'plain',
  'a=1&&b=2&', '&&']) {
  test(`cleaning preserves fragment #${fragment}`, async () => {
    const addon = await loadAddon();
    const input = `https://example.com/?utm_source=x#${fragment}`;
    const expected = `https://example.com/#${fragment}`;
    assert.equal(addon.clean(input), expected);
    assert.deepEqual(addon.request(input), { redirectUrl: expected });
  });
}

for (const [fragment, expected] of [
  ['utm_source=x&&b=2&', '&b=2&'],
  ['a=1&utm_source=x&a=1&b=2&a=3', 'a=1&a=1&b=2&a=3'],
  ['utm_source=x&utm_medium=y&token=abc==', 'token=abc=='],
]) {
  test(`removing fragment trackers preserves the remaining entries in #${fragment}`, async () => {
    const addon = await loadAddon();
    const input = 'https://example.com/#' + fragment;
    const output = 'https://example.com/#' + expected;
    assert.equal(addon.clean(input), output);
    assert.deepEqual(addon.request(input), { redirectUrl: output });
  });
}
