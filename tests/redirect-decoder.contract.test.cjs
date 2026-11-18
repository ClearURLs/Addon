const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAddon } = require('./helpers/addon.cjs');

const rules = { providers: {
  capture: {
    urlPattern: '^https?://wrapper\\.test/',
    redirections: ['^https?://wrapper\\.test/\\?target=(.*)$'],
  },
  sequence: {
    urlPattern: '^https?://wrapper\\.test/',
    redirections: [
      '^https?://wrapper\\.test/\\?first=([^&]*)&second=([^&]+)$',
      '^https?://wrapper\\.test/\\?first=[^&]*&second=(.+)$',
    ],
  },
} };

const encode = encodeURIComponent;
const delay = value => encode(encode(value));
const wrapValue = (value, depth) => depth === 0 ? value : wrapValue(encode(value), depth - 1);
const wrapper = target => `https://wrapper.test/?target=${target}`;
let addonPromise;
const addon = () => addonPromise ||= loadAddon({ rules });

function provider(instance, name = 'capture') {
  return instance.context.providers.find(provider => provider.getName() === name);
}

async function assertContract(capture, expected, context = assert) {
  const instance = await addon();
  const url = wrapper(capture);
  const actual = provider(instance).getRedirection(url);
  context.equal(actual, expected, `getRedirection(${JSON.stringify(capture)})`);

  if (expected === null) {
    context.deepEqual(instance.request(url), {}, `request must not redirect ${JSON.stringify(capture)}`);
    context.equal(instance.clean(url), url, `clean must preserve invalid wrapper ${JSON.stringify(capture)}`);
  } else {
    context.deepEqual(instance.request(url), { redirectUrl: expected }, `request(${JSON.stringify(capture)})`);
    context.equal(instance.clean(url), expected, `clean(${JSON.stringify(capture)})`);
    context.match(expected, /^https?:\/\//i);
    context.notEqual(new URL(expected).hostname, '');
    context.equal(provider(instance).getRedirection(wrapper(expected)), expected, 'idempotent at the public seam');
    context.equal(instance.clean(expected), expected, 'idempotent in the full cleaning flow');
  }
  return actual;
}

async function assertCases(cases) {
  for (const [label, capture, expected] of cases) {
    test(label, () => assertContract(capture, expected));
  }
}

const destination = 'HTTPS://User:Pass@Example.COM:8443/a%2Fb?keep=a%26b&data=x%2By#bookmark%23part';

test('absolute HTTP(S) targets remain byte-identical', async () => {
  const cases = [
    'http://example.com', 'https://example.com', 'https://example.com/', 'https://example.com/index.html',
    'http://example.com?', 'http://example.com#', 'http://example.com/?q=', 'http://example.com/#',
    'http://example.com?#', 'HTTPS://HTTPBIN.ORG/path', destination,
    'http://127.0.0.1:8080/a', 'https://[2001:db8::1]:8443/a',
    'https://example.test/a%2Fb?q=a%26b%3D%3F%23%25%2B%20',
    'https://example.test/straße?q=gr%C3%BC%C3%9F',
    'https://example.test/a%FFb?q=x%FF#frag%FF',
    'https://example.test/a%G0b?q=x%A#x%C0%AF%ED%A0%80',
  ];
  for (const target of cases) {
    test(target, () => assertContract(target, target));
  }
});

test('wrappers are recursively unwrapped without reserializing the destination', async () => {
  const destinations = [
    destination,
    'https://example.test:8443/a%252Fb?q=a%2526b',
    'https://[2001:db8::1]:8443/a%FFb?q=100%#frag%FF',
    'https://example.test/?next=https%3A%2F%2Fother.test%2Fa%252Fb',
    'HTTPS://example.test/a%2Fb?q=x%FF%25%26',
    '//example.test/a%2Fb?q=a%26b',
    'example.test/a%2Fb?q=a%26b',
  ];
  for (const expected of destinations) {
    const inferred = expected.startsWith('//') ? `http:${expected}` :
      /^[a-z][a-z0-9+.-]*:/i.test(expected) ? expected : `http://${expected}`;
    for (let depth = 0; depth <= 3; depth++) {
      test(`depth ${depth}: ${expected}`, () => assertContract(wrapValue(expected, depth), inferred));
    }
  }
});

test('mixed scheme and slash delimiters preserve the suffix', async () => {
  const expected = 'HTTPS://example.test/a%2Fb?q=a%26b';
  for (const capture of [
    'HTTPS%3A//example.test/a%2Fb?q=a%26b',
    'HTTPS%3A/%2Fexample.test/a%2Fb?q=a%26b',
    'HTTPS%3A%2F/example.test/a%2Fb?q=a%26b',
    'HTTPS://example.test/a%2Fb?q=a%26b',
    'https%3a//example.test%2Fa%252Fb',
  ]) {
    test(capture, () => assertContract(capture,
      capture === 'https%3a//example.test%2Fa%252Fb' ? 'https://example.test/a%2Fb' : expected));
  }
});

test('partial URL repairs preserve opaque path, query, and fragment data', async () => {
  const cases = [
    ['path + literal query', 'https://example.com%2Fguide?q=a%26b', 'https://example.com/guide?q=a%26b'],
    ['path + query + data', 'https://example.com%2Fguide%3Fq%3Da%26b', 'https://example.com/guide?q=a%26b'],
    ['query data with assignment', 'https://example.com%3Fq%3Dx%FF%2B%26b%3Dc', 'https://example.com?q=x%FF%2B%26b%3Dc'],
    ['legacy fragment', 'https://example.com%23frag%FF', 'https://example.com#frag%FF'],
    ['bare query before another field', 'https://example.com%3Fq%FF%26x%3D1', 'https://example.com?q%FF&x=1'],
    ['query and fragment from literal network path', '//example.test%2Fguide%3Fq%3Da%26b', 'http://example.test/guide?q=a%26b'],
    ['multiple encoded query delimiters', 'HTTPS://example.test%2Fguide%3Fone%3D1%26two%3D2%23details', 'HTTPS://example.test/guide?one=1&two=2#details'],
    ['nested payload in partially wrapped destination', 'HTTPS://example.test%2Fdocs%2Fv1%3Fq%3Da%2526b', 'HTTPS://example.test/docs/v1?q=a%26b'],
    ['encoded nested port before literal path', 'HTTPS://example.test%253A8443/a%2Fb?q=%FF', 'HTTPS://example.test:8443/a%2Fb?q=%FF'],
    ['encoded IPv6 authority', 'https://%5B2001%3Adb8%3A%3A1%5D%3A8443%2Fguide?q=a%26b', 'https://[2001:db8::1]:8443/guide?q=a%26b'],
    ['encoded port and legacy byte', 'https://example.test%3A8443%2Fguide?q=x%FF', 'https://example.test:8443/guide?q=x%FF'],
  ];
  await assertCases(cases);
});

test('scheme-relative and scheme-less authority forms preserve their payload', async () => {
  const cases = [
    ['literal network path', '//example.test/a%2Fb?q=a%26b', 'http://example.test/a%2Fb?q=a%26b'],
    ['encoded network path', encode('//example.test/a%2Fb?q=a%26b'), 'http://example.test/a%2Fb?q=a%26b'],
    ['nested network path', delay('//example.test/a%2Fb?q=a%26b'), 'http://example.test/a%2Fb?q=a%26b'],
    ['literal host path', 'example.test/a%2Fb?q=a%26b', 'http://example.test/a%2Fb?q=a%26b'],
    ['encoded host path', encode('example.test/a%2Fb?q=a%26b'), 'http://example.test/a%2Fb?q=a%26b'],
    ['scheme-less HTTP-named hostname', 'HTTPBIN.ORG/path', 'http://HTTPBIN.ORG/path'],
    ['scheme-less HTTP-looking hostname', 'https-gateway.example.com/path', 'http://https-gateway.example.com/path'],
    ['scheme-less IPv4 and port', '127.0.0.1:8080/a%2Fb', 'http://127.0.0.1:8080/a%2Fb'],
    ['scheme-less IPv6 and port', '[2001:db8::1]:8443/a%2Fb?q=a%26b', 'http://[2001:db8::1]:8443/a%2Fb?q=a%26b'],
    ['scheme-less userinfo with path', 'user:password@example.test/a%2Fb?q=a%26b', 'http://user:password@example.test/a%2Fb?q=a%26b'],
  ];
  await assertCases(cases);
});

const invalidTargets = [
  '', ' ', '/', '//', '?x', '#f', '\\example.test',
  'http:', 'https:', 'https:/example.com', 'https:example.com',
  'https-not-a-url', 'HTTPS-NOT-A-URL', 'https-example.com%2Fbad',
  'https://%FF.example.com/', 'https://[invalid]/', 'https://example.com:65536/',
  'ftp://example.test/a', 'file:///etc/passwd', 'mailto:user@example.test',
  'javascript:alert(1)', 'data:text/html,test', 'ws://example.test/socket', 'urn:123', 'mailto:123',
];

test('declared invalid target classes do not redirect', async () => {
  for (const target of invalidTargets) {
    test(JSON.stringify(target), () => assertContract(target, null));
  }
  for (const target of [
    'ftp://example.test/a', 'file:///etc/passwd', 'mailto:user@example.test',
    'javascript:alert(1)', 'data:text/html,test', 'ws://example.test/socket',
  ]) {
    for (let depth = 1; depth <= 3; depth++) {
      test(`non-HTTP at depth ${depth}: ${target}`, () => assertContract(wrapValue(target, depth), null));
    }
  }
});

test('an invalid first rule falls through; a valid first rule wins', async () => {
  const instance = await addon();
  const expected = 'https://example.test/good?q=a%26b';
  for (const target of invalidTargets.filter(target => !target.includes('&'))) {
    const url = `https://wrapper.test/?first=${target}&second=${encodeURIComponent(expected)}`;
    assert.equal(provider(instance, 'sequence').getRedirection(url), expected, `fall through: ${target}`);
    assert.deepEqual(instance.request(url), { redirectUrl: expected }, `request fall through: ${target}`);
    assert.equal(instance.clean(url), expected, `clean fall through: ${target}`);
  }
  const url = `https://wrapper.test/?first=${encodeURIComponent(expected)}&second=https%3A%2F%2Fother.test%2F`;
  assert.equal(provider(instance, 'sequence').getRedirection(url), expected);
  assert.deepEqual(instance.request(url), { redirectUrl: expected });
  assert.equal(instance.clean(url), expected);
});

test('seeded mutations across wrapper, partial and host-path forms never yield an invalid or unstable redirect', async () => {
  const instance = await addon();
  const alphabet = ['%', '25', 'FF', '2F', '/', '?', '&', '=', '#', '+', ':', '@', '\\', ' ', 'A'];
  const bases = [
    'HTTPS://example.test/',
    'https://example.com%2Fguide%3Fq%3D',
    'https%3A%2F%2Fexample.com%2F',
    '//example.test/',
    'example.test/',
    'https://%5B2001%3Adb8%3A%3A1%5D%3A8443%2F',
    'https-not-a-url',
  ];
  let seed = 0x4c8a91;
  for (let index = 0; index < 256; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    let target = bases[seed % bases.length];
    const cap = 32 + (seed % 225);
    for (let length = 0; length < 64 && target.length < cap; length++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      target += alphabet[seed % alphabet.length];
    }
    target = target.slice(0, 256);
    const value = provider(instance).getRedirection(wrapper(target));
    if (value === null) continue;
    assert.match(value, /^https?:\/\//i, `mutation ${index}: ${target}`);
    assert.doesNotThrow(() => new URL(value), `mutation ${index}: ${target}`);
    assert.notEqual(new URL(value).hostname, '', `mutation ${index}: ${target}`);
    assert.equal(provider(instance).getRedirection(wrapper(value)), value, `unstable mutation ${index}: ${target}`);
  }
});

test('policy decisions remain explicit instead of being guessed', async t => {
  const pending = [
    ['scheme-less https.example.com', 'accept as host/path or reject a namespaced-looking prefix'],
    ['https:///example.com', 'accept WHATWG normalization or require exactly two literal slashes'],
    ['backslash-containing HTTP authorities', 'browser-compatible normalization versus strict rejection'],
    ['%23 following an encoded query', 'fragment delimiter versus query data; full wrappers remain unambiguous'],
    ['scheme-less userinfo without a path', 'user:password@example.test versus a non-HTTP scheme'],
    ['single-label host paths', 'localhost/path support versus requiring DNS-looking names'],
    ['malformed/overlong/surrogate encodings beyond the sampled corpus', 'define preservation versus rejection scope per URL component'],
  ];
  for (const [name, question] of pending) {
    await t.todo(`${name}: ${question}`);
  }
});
