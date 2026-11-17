const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAddon } = require('./helpers/addon.cjs');

const cases = [
  ['?utm_source=x&id=42#', '?id=42#'],
  ['?id=42&utm_source=x#', '?id=42#'],
  ['?utm_source=x#', '#'],
  ['?&utm_source=x', '?'],
  ['?utm_source=x&', '?'],
  ['?&utm_source=x#', '?#'],
  ['?utm_source=x&#', '?#'],
  ['?utm_source=x&&#', '?&#'],
  ['?#utm_source=x', '?'],
  ['?&#utm_source=x', '?&'],
  ['#utm_source=x', ''],
  ['?utm_source=x#utm_source=x#', ''],
];

for (const [input, expected] of cases) {
  test(`cleaning preserves empty URL components in ${input}`, async () => {
    const addon = await loadAddon();
    const before = 'https://example.com/' + input;
    const after = 'https://example.com/' + expected;
    assert.equal(addon.clean(before), after);
    assert.deepEqual(addon.request(before), { redirectUrl: after });
    assert.equal(addon.clean(after), after);
  });
}

test('unchanged empty URL components do not trigger history writes', async () => {
  const addon = await loadAddon();
  for (const suffix of ['?', '#', '?#', '?&', '?&&#', '?id=42#']) {
    const url = 'https://example.com/' + suffix;
    assert.equal(addon.clean(url), url);
    assert.equal(addon.history(url).length, 0);
  }
});

for (const [input, expected] of [cases[0], cases[5], cases[8]]) {
  test(`logging preserves the URL delimiters in ${input}`, async () => {
    const addon = await loadAddon({ settings: { loggingStatus: true, logLimit: 10, log: { log: [] } } });
    const before = 'https://example.com/' + input;
    const after = 'https://example.com/' + expected;
    assert.deepEqual(addon.request(before), { redirectUrl: after });
    assert.equal(addon.context.storage.log.log.length, 1);
    assert.equal(addon.context.storage.log.log[0].before, before);
    assert.equal(addon.context.storage.log.log[0].after, after);
  });
}
