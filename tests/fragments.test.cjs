const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadAddon } = require('./helpers/addon.cjs');

const urlHashParamsSource = fs.readFileSync(
  path.join(__dirname, '../core_js/utils/URLHashParams.js'), 'utf8',
);

function makeHashParams(fragment) {
  const context = vm.createContext({ URL });
  vm.runInContext(urlHashParamsSource, context);
  context.url = new URL(`https://example.test/#${fragment}`);
  context.params = vm.runInContext('new URLHashParams(url)', context);
  return context;
}

test('fragment values distinguish missing, empty and extra equals signs', () => {
  const context = makeHashParams('token&empty=&padded=abc==&foo=bar=baz');

  assert.equal(context.params.get('token'), null);
  assert.equal(context.params.get('empty'), '');
  assert.equal(context.params.get('padded'), 'abc==');
  assert.equal(context.params.get('foo'), 'bar=baz');
  assert.equal(context.params.get('unknown'), null);
  assert.deepEqual([...context.params.getAll('token')], [null]);
  assert.deepEqual([...context.params.getAll('empty')], ['']);
  assert.deepEqual([...context.params.getAll('unknown')], []);
  assert.equal(vm.runInContext('params.getAll("empty") instanceof Set', context), true);
});

test('fragment keys are unique while values keep their first-seen order', () => {
  const context = makeHashParams('a=1&a=1&b=2&a=3&empty=&missing&&a=4');

  assert.deepEqual([...context.params.keys()], ['a', 'b', 'empty', 'missing']);
  assert.deepEqual([...context.params.getAll('a')], ['1', '3', '4']);
  assert.equal(context.params.toString(), 'a=1&a=1&b=2&a=3&empty=&missing&&a=4');
});

test('fragment deletion preserves neighboring and empty segments', () => {
  const context = makeHashParams('a=1&&b=2&a=3&empty=&missing&');

  context.params.delete('a');

  assert.equal(context.params.toString(), '&b=2&empty=&missing&');
  assert.deepEqual([...context.params.getAll('a')], []);
  assert.deepEqual([...context.params.keys()], ['b', 'empty', 'missing']);
});

test('fragment append preserves duplicates and value semantics', () => {
  const context = makeHashParams('a=1&a=1&b=2&a=3');

  context.params.append('b', '2');
  context.params.append('empty', '');
  context.params.append('missing');

  assert.equal(context.params.toString(), 'a=1&a=1&b=2&a=3&b=2&empty=&missing');
  assert.deepEqual([...context.params.getAll('b')], ['2']);
  assert.equal(context.params.get('empty'), '');
  assert.equal(context.params.get('missing'), null);
});

for (const fragment of ['token=', 'token==', 'state=abc==', 'foo=bar=baz', 'a=1&a=1&b=2&a=3', 'plain',
  'a=1&&b=2&', '&&', '=value', '=', '==', '=a=b', '=first&=second&=first&', '=value&anchor']) {
  test(`cleaning preserves fragment #${fragment}`, async () => {
    const addon = await loadAddon();
    const input = `https://example.com/?utm_source=x#${fragment}`;
    const expected = `https://example.com/#${fragment}`;
    assert.equal(addon.clean(input), expected);
    assert.deepEqual(addon.request(input), { redirectUrl: expected });
  });
}

test('a literal question mark in a fragment remains part of the fragment syntax', async () => {
  const addon = await loadAddon();
  for (const name of ['utm_source', '%75tm_source']) {
    const url = `https://example.com/#?${name}=x&route=dashboard`;
    assert.equal(addon.clean(url), url);
    assert.deepEqual(addon.request(url), {});
  }
});

for (const [fragment, expected] of [
  ['utm_source=x&&b=2&', '&b=2&'],
  ['a=1&utm_source=x&a=1&b=2&a=3', 'a=1&a=1&b=2&a=3'],
  ['utm_source=x&utm_medium=y&token=abc==', 'token=abc=='],
  ['?utm_source=x&utm_medium=y&route=dashboard', '?utm_source=x&route=dashboard'],
  ['utm_source=x&=value', '=value'],
  ['=value&utm_source=x&=other', '=value&=other'],
]) {
  test(`removing fragment trackers preserves the remaining entries in #${fragment}`, async () => {
    const addon = await loadAddon();
    const input = 'https://example.com/#' + fragment;
    const output = 'https://example.com/#' + expected;
    assert.equal(addon.clean(input), output);
    assert.deepEqual(addon.request(input), { redirectUrl: output });
  });
}
