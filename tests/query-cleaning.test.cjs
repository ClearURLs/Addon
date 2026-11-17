const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAddon } = require('./helpers/addon.cjs');

for (const retained of [
  'a%26b=c', 'a%23b=c', 'a%3Db=c', 'a%2Bb=c',
  'keywords=usb%D7%AA%B4%AE%BF%DA', 'q=a+b', 'q=a%20b', 'q=a%2fb',
  'token=abc==', 'empty=&bare', 'id=1&id=1&b=2&id=3', '?field=value', '=value', 'bad%FF=value', '&&',
]) {
  test(`query cleaning preserves ${retained}`, async () => {
    const addon = await loadAddon();
    const input = 'https://example.com/?utm_source=x&' + retained;
    const expected = 'https://example.com/?' + retained;
    assert.equal(addon.clean(input), expected);
    assert.deepEqual(addon.request(input), { redirectUrl: expected });
    assert.equal(addon.clean(expected), expected);
  });
}

test('query cleaning retains empty segments and removes adjacent tracking names', async () => {
  const addon = await loadAddon();
  const input = 'https://example.com/?&utm_source=x&utm_medium=y&a=1&&b=2&';
  const expected = 'https://example.com/?&a=1&&b=2&';
  assert.equal(addon.clean(input), expected);
  assert.deepEqual(addon.request(input), { redirectUrl: expected });
});

test('query matching decodes names once and retains the original encoded spelling', async () => {
  const addon = await loadAddon();
  const input = 'https://example.com/?%75tm_source=x&%2575tm_source=y';
  const expected = 'https://example.com/?%2575tm_source=y';
  assert.equal(addon.clean(input), expected);
  assert.deepEqual(addon.request(input), { redirectUrl: expected });
});

test('query matching keeps the standard form-decoding behavior for names', async () => {
  const addon = await loadAddon({ rules: { providers: {
    query: { urlPattern: '.*', rules: ['a b'] },
  } } });
  const input = 'https://example.com/?a+b=1&a%2Bb=2&a%20b=3';
  const expected = 'https://example.com/?a%2Bb=2';
  assert.equal(addon.clean(input), expected);
  assert.deepEqual(addon.request(input), { redirectUrl: expected });
});

test('fragment cleaning does not reencode an untouched query', async () => {
  const addon = await loadAddon();
  const query = '?keywords=usb%D7%AA%B4%AE%BF%DA&q=a+b';
  assert.equal(addon.clean('https://example.com/' + query + '#utm_source=x'), 'https://example.com/' + query);
});

test('query cleaning logs the actual retained bytes', async () => {
  const addon = await loadAddon({ settings: { loggingStatus: true, logLimit: 10, log: { log: [] } } });
  const input = 'https://example.com/?utm_source=x&keywords=usb%D7%AA%B4%AE%BF%DA&q=a+b';
  const expected = 'https://example.com/?keywords=usb%D7%AA%B4%AE%BF%DA&q=a+b';
  assert.deepEqual(addon.request(input), { redirectUrl: expected });
  assert.equal(addon.context.storage.log.log.length, 1);
  assert.equal(addon.context.storage.log.log[0].before, input);
  assert.equal(addon.context.storage.log.log[0].after, expected);
});
