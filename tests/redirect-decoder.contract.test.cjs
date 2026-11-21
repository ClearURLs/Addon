const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAddon } = require('./helpers/addon.cjs');

const rules = { providers: {
  capture: {
    urlPattern: '^https?://wrapper\\.test/',
    forceRedirection: true,
    redirections: ['^https?://wrapper\\.test/\\?target=([\\s\\S]*)$'],
  },
  sequence: {
    urlPattern: '^https?://wrapper\\.test/',
    forceRedirection: true,
    redirections: [
      '^https?://wrapper\\.test/\\?first=([^&]*)&second=([^&]+)$',
      '^https?://wrapper\\.test/\\?first=[^&]*&second=(.+)$',
    ],
  },
} };

const encode = encodeURIComponent;
const formEncode = value => new URLSearchParams({ target: value }).toString().slice('target='.length);
const delay = value => encode(encode(value));
const wrapValue = (value, depth) => depth === 0 ? value : wrapValue(encode(value), depth - 1);
const wrapper = target => `https://wrapper.test/?target=${target}`;
let addonPromise;
const addon = () => addonPromise ||= loadAddon({ rules });

function provider(instance, name = 'capture') {
  return instance.context.providers.find(provider => provider.getName() === name);
}

async function assertContract(capture, expected, hostname) {
  const instance = await addon();
  const actual = assertRedirectPaths(instance, 'capture', wrapper(capture), expected);
  if (actual === null) return;
  const parsed = new URL(actual);
  assert.match(actual, /^https?:\/\//i);
  if (hostname !== undefined) assert.equal(parsed.hostname, hostname);
  else assert.notEqual(parsed.hostname, '');
}

async function assertCases(t, cases) {
  for (const [label, capture, expected, hostname] of cases) {
    await t.test(label, () => assertContract(capture, expected, hostname));
  }
}

function assertRedirectPaths(instance, providerName, url, expected, destination) {
  const updates = [];
  instance.context.browser.tabs.update = async (tabId, { url }) => updates.push({ tabId, url });
  const rule = provider(instance, providerName).getRedirection(url);
  const cleaned = instance.clean(url);
  const request = instance.request(url);
  const navigation = instance.request(url, 'main_frame');
  if (destination) {
    for (const [path, target] of [
      ['rule selection', rule], ['manual cleaning', cleaned],
      ['redirectUrl', request.redirectUrl], ['tabs.update', updates[0]?.url],
    ]) {
      const parsed = new URL(target);
      assert.equal(parsed.hostname, destination.hostname, `${path}: destination host`);
      assert.equal(parsed.pathname, destination.pathname, `${path}: destination path`);
    }
  }
  assert.equal(rule, expected);
  assert.equal(cleaned, expected ?? url);
  assert.deepEqual(request, expected === null ? {} : { redirectUrl: expected });
  assert.deepEqual(navigation, expected === null ? {} : { cancel: true });
  assert.deepEqual(updates, expected === null ? [] : [{ tabId: 1, url: expected }]);
  return rule;
}

const opaqueLegacyCapture = 'https://example.com%3Fq%FF%26x%3D1';
const opaqueLegacyTarget = 'https://example.com?q%FF&x=1';
const ambiguousAuthority = 'https://u%2Fser@example.test%2Fa?q=x';
const ambiguousEncodedAuthority = 'https://u%2Fser%40example.test%2Fa?q=x';
const competingHosts = 'https://reader@example.test:8443%2Fguide@archive.test?q=1';
const encodedHttpsPrefix = 'https%25%32%35%33%41%252F%252F';

test('legacy retains literal HTTP(S) destinations and validates their hosts', async t => {
  const targets = [
    'http://example.com', 'https://example.com', 'https://example.com/', 'https://example.com/index.html',
    'http://example.com?', 'http://example.com#', 'http://example.com/?q=', 'http://example.com/#',
    'http://example.com?#', 'HTTPS://HTTPBIN.ORG/path',
    'http://127.0.0.1:8080/a', 'https://[2001:db8::1]:8443/a',
    'https:///example.test/path', 'https://example.test\\path', 'https://example.test/straße?q=grüß',
  ];
  for (const target of targets) {
    await t.test(target, () => assertContract(target, target));
  }
});

test('legacy decodes until no percent layer changes the destination', async t => {
  const targets = [
    ['HTTPS://User:Pass@Example.COM:8443/a%2Fb?keep=a%26b&data=x%2By#bookmark%23part',
      'HTTPS://User:Pass@Example.COM:8443/a/b?keep=a&b&data=x+y#bookmark#part'],
    ['HTTPS://exämplé.test', 'HTTPS://exämplé.test'],
    ['https://example.test:8443/a%252Fb?q=a%2526b', 'https://example.test:8443/a/b?q=a&b'],
    ['https://example.test/?next=https%3A%2F%2Fother.test%2Fa%252Fb',
      'https://example.test/?next=https://other.test/a/b'],
    ['//example.test/a%2Fb?q=a%26b', 'http://example.test/a/b?q=a&b'],
    ['example.test/a%2Fb?q=a%26b', 'http://example.test/a/b?q=a&b'],
  ];
  for (const [target, expected] of targets) {
    for (let depth = 0; depth <= 3; depth++) {
      await t.test('depth ' + depth + ': ' + target, () => assertContract(wrapValue(target, depth), expected));
    }
  }
});

test('legacy opens separators in mixed and partially wrapped captures', async t => {
  await assertCases(t, [
    ['encoded scheme colon before literal slashes', 'HTTPS%3A//example.test/a%2Fb?q=a%26b',
      'HTTPS://example.test/a/b?q=a&b'],
    ['encoded scheme colon and second slash', 'HTTPS%3A/%2Fexample.test/a%2Fb?q=a%26b',
      'HTTPS://example.test/a/b?q=a&b'],
    ['encoded scheme colon and first slash', 'HTTPS%3A%2F/example.test/a%2Fb?q=a%26b',
      'HTTPS://example.test/a/b?q=a&b'],
    ['encoded path before literal query', 'https://example.com%2Fguide?q=a%26b', 'https://example.com/guide?q=a&b'],
    ['encoded query and fields', 'https://example.com%3Fq%3Da%26x%3D1', 'https://example.com?q=a&x=1'],
    ['encoded bare query before named field', 'https://example.com%3Fq%26x%3D1', 'https://example.com?q&x=1'],
    ['encoded fragment in path', 'https://example.com%2Fp%23frag', 'https://example.com/p#frag'],
    ['encoded slash following literal Unicode', 'https://example.test%2Fstraße%2Fguide',
      'https://example.test/straße/guide'],
    ['nested path separators', 'https://example.test%252Fa%25252Fb', 'https://example.test/a/b'],
    ['escaped hex digits in a separator', 'https://example.test%25%32%46path?q=1', 'https://example.test/path?q=1'],
    ['encoded scheme letter', 'h%74tps%3A%2F%2Fexample.test%2Fa', 'https://example.test/a'],
    ['nested DNS escape', 'https://%2565xample.test/a%2Fb', 'https://example.test/a/b'],
    ['encoded port digits', 'https://example.test%3A%38%34%34%33/a', 'https://example.test:8443/a'],
    ['encoded IPv6 address and port', 'https://%5B2001%3Adb8%3A%3A%31%5D%3A8443/a%2Fb',
      'https://[2001:db8::1]:8443/a/b'],
    ['noncanonical form wrapper with a literal plus', formEncode('https://example.test/a b!?q=a+b#data%26x'),
      'https://example.test/a+b!?q=a+b#data&x'],
  ]);
});

test('legacy completes network and host paths after decoding', async t => {
  await assertCases(t, [
    ['scheme-less partial path', 'example.test%2Fguide%23notes%2520team', 'http://example.test/guide#notes team'],
    ['scheme-less HTTP-named hostname', 'HTTPBIN.ORG/path', 'http://HTTPBIN.ORG/path'],
    ['scheme-less hostname with an HTTP scheme name', 'https%2Ffile', 'http://https/file'],
    ['scheme-less HTTP-looking hostname', 'https-gateway.example.com/path', 'http://https-gateway.example.com/path'],
    ['scheme-less IPv4 and port', '127.0.0.1:8080/a%2Fb', 'http://127.0.0.1:8080/a/b'],
    ['scheme-less IPv6 and port', '[2001:db8::1]:8443/a%2Fb?q=a%26b', 'http://[2001:db8::1]:8443/a/b?q=a&b'],
    ['scheme-less userinfo with path', 'user:password@example.test/a%2Fb?q=a%26b',
      'http://user:password@example.test/a/b?q=a&b'],
    ['scheme-less userinfo with query', 'user:password@example.test?view=summary',
      'http://user:password@example.test?view=summary'],
  ]);
});

test('legacy retains the historical host and path after decoding authority delimiters', async t => {
  const instance = await loadAddon();
  const searchURL = 'https://www.google.com/url?q=';
  const adParameter = '&adurl=' + encode('https://fallback.test/landing');
  for (const [label, capture, expected, hostname, pathname] of [
    ['literal at-sign after an encoded path delimiter', ambiguousAuthority,
      'https://u/ser@example.test/a?q=x', 'u', '/ser@example.test/a'],
    ['encoded at-sign after an encoded path delimiter', ambiguousEncodedAuthority,
      'https://u/ser@example.test/a?q=x', 'u', '/ser@example.test/a'],
    ['dotted host before two encoded path delimiters', 'https://user.test%2Fname%40example.test%2Fa?q=x',
      'https://user.test/name@example.test/a?q=x', 'user.test', '/name@example.test/a'],
    ['encoded slash in otherwise valid username', 'https://u%2Fser@example.test/a?q=x',
      'https://u/ser@example.test/a?q=x', 'u', '/ser@example.test/a'],
    ['escaped at-sign opens as path data', 'https://example.com%2Fa%40b',
      'https://example.com/a@b', 'example.com', '/a@b'],
    ['an encoded userinfo separator establishes the authority', 'https://good.test%40evil.test%2Ffoo',
      'https://good.test@evil.test/foo', 'evil.test', '/foo'],
    ['a later at-sign becomes path data when a slash opens', competingHosts,
      'https://reader@example.test:8443/guide@archive.test?q=1', 'example.test', '/guide@archive.test'],
    ['encoded leading slash is retained', 'https://%2Ffirst.test%2Fpath%40second.test/a',
      'https:///first.test/path@second.test/a', 'first.test', '/path@second.test/a'],
    ['WHATWG treats a decoded backslash as a path boundary', 'https://first.test%5C%40second.test/path',
      'https://first.test\\@second.test/path', 'first.test', '/@second.test/path'],
  ]) {
    await t.test(label, () => assertRedirectPaths(instance, 'google',
      searchURL + capture + adParameter, expected, { hostname, pathname }));
  }
});

test('legacy rejects raw controls in the capture and after every decode pass', async t => {
  for (const [label, raw, escaped] of [
    ['HTAB', '\t', '%09'], ['LF', '\n', '%0A'], ['CR', '\r', '%0D'],
    ['NUL', '\u0000', '%00'], ['DEL', '\u007f', '%7F'],
    ['C1 padding character', '\u0080', '%C2%80'], ['C1 next line', '\u0085', '%C2%85'],
    ['C1 application program command', '\u009f', '%C2%9F'],
  ]) {
    const rawTarget = 'https://example.test/a?q=x' + raw + 'y';
    const escapedTarget = 'https://example.test/a' + escaped + '?q=x' + escaped + 'y#' + escaped;
    for (let depth = 0; depth <= 3; depth++) {
      await t.test(label + ' raw, depth ' + depth, () => assertContract(wrapValue(rawTarget, depth), null));
      await t.test(label + ' escaped, depth ' + depth, () => assertContract(wrapValue(escapedTarget, depth), null));
    }
  }
  await assertCases(t, [
    ['separately escaped hex characters produce a newline on a later pass',
      'https://example.test/a?q=x%25%30%41y', null],
    ['separately escaped hex characters produce a C1 control on a later pass',
      'https://example.test/a?q=x%25%43%32%25%38%35y', null],
    ['mixed scheme spelling exposes an encoded control',
      'https%3A//example.test/path%250Atail', null],
    ['a noncanonical form wrapper exposes an encoded control after its outer layer',
      encode(formEncode('https://example.test/foo bar\u0085baz!')), null],
  ]);
});

test('legacy restores the narrow opaque-byte query exception', async t => {
  for (let depth = 0; depth <= 3; depth++) {
    await t.test('depth ' + depth, () => assertContract(wrapValue(opaqueLegacyCapture, depth), opaqueLegacyTarget));
  }
});

const invalidTargets = [
  '', ' ', '/', '//', '?x', '#f', 'http:', 'https:', 'https://', 'https:/example.com', 'https:example.com',
  'https-not-a-url', 'HTTPS-NOT-A-URL', 'https-example.com%2Fbad',
  'https://%FF.example.com/', 'https://[invalid]/', 'https://example.com:65536/',
  'https://example.test/a%FFb?q=x%FF#frag%FF', 'https://example.test/a%G0b?q=x%A#x%C0%AF%ED%A0%80',
  'https://example.test/%25', 'https://example.test/a%2525', 'https://example.test/?q=%C0%AF',
  opaqueLegacyTarget, 'https://example.com%3Fq%FF%26x%3D1%26y%3D2', 'https://example.com%3Fq%FF',
  'ftp://example.test/a', 'file:///etc/passwd', 'mailto:user@example.test',
  'javascript:alert(1)', 'data:text/html,test', 'ws://example.test/socket', 'urn:123', 'mailto:123', 'ftp:21',
  'mailto:user@example.test?subject=hi', 'f%74p%3A%2F%2Fexample.test%2Fa',
  'ftp%25%32%35%33%41%252F%252Fexample.test',
  'https%3A%2F%2Fexample.test%2Fa\ud800',
];

test('legacy rejects invalid targets and unsupported schemes', async t => {
  for (const target of invalidTargets) {
    await t.test(JSON.stringify(target), () => assertContract(target, null));
  }
  for (const target of [
    'ftp://example.test/a', 'file:///etc/passwd', 'mailto:user@example.test',
    'javascript:alert(1)', 'data:text/html,test', 'ws://example.test/socket',
  ]) {
    for (let depth = 1; depth <= 3; depth++) {
      await t.test('non-HTTP at depth ' + depth + ': ' + target, () => assertContract(wrapValue(target, depth), null));
    }
  }
});

test('legacy falls through an invalid first rule and prefers a valid first rule', async () => {
  const instance = await addon();
  const expected = 'https://example.test/good?q=a&b';
  const next = 'https://example.test/good?q=a%26b';
  for (const target of invalidTargets.filter(target => !target.includes('&'))) {
    const url = 'https://wrapper.test/?first=' + target + '&second=' + encode(next);
    assertRedirectPaths(instance, 'sequence', url, expected);
  }
  const url = 'https://wrapper.test/?first=' + encode(next) + '&second=https%3A%2F%2Fother.test%2F';
  assertRedirectPaths(instance, 'sequence', url, expected);
});

const explicitWrapper = 'https://explicit.test/';

function redirectRule(id, regex, steps = [], defaultScheme) {
  return {
    id,
    match: { regex, caseSensitive: false },
    preprocessors: steps.map(type => ({ type, inputs: [1] })),
    defaultScheme,
  };
}

test('declared redirect codecs decode only the specified layers', async t => {
  const instance = await loadAddon({ rules: { providers: {
    explicit: {
      urlPattern: '^https://explicit\\.test/',
      forceRedirection: true,
      redirectRules: [
        ['raw', []],
        ['percent', ['urlDecode']],
        ['twice', ['urlDecode', 'urlDecode']],
        ['form', ['formDecode']],
        ['base64', ['base64Decode']],
        ['base64url', ['base64UrlDecode']],
        ['chain', ['urlDecode', 'base64UrlDecode']],
        ['form-chain', ['urlDecode', 'formDecode']],
      ].map(([id, steps]) => redirectRule(id, `^https://explicit\\.test/${id}\\?target=([\\s\\S]+)$`, steps)),
    },
  } } });
  const opaque = 'https://EXAMPLE.test/a%2Fb?q=a%26b#legacy%FF';
  const rawControls = 'https://example.test/foo\nbar!';
  const escapedControls = 'https://example.test/foo%0Abar!';
  const rawC1 = 'https://example.test/foo\u0085bar!';
  const formTarget = 'https://example.test/a?q=left right&plus=+#data%26x';
  const targetWithPlus = 'https://example.test/a?q=left+right&plus=+#data%26x';
  const encodedForm = formEncode(formTarget);
  const base64Target = 'https://example.test/🐶/é?x=%2B';
  const base64 = Buffer.from(base64Target).toString('base64');
  const base64url = Buffer.from(base64Target).toString('base64url');
  const invalidUtf8 = Buffer.concat([Buffer.from('https://example.test/'), Buffer.from([0xff])]);

  const cases = [
    ['raw URL preserves escapes', 'raw', opaque, opaque],
    ['raw URL preserves existing authority', 'raw', 'https://user%2Fname@example.test/a',
      'https://user%2Fname@example.test/a'],
    ['raw mode rejects an encoded URL', 'raw', encode(opaque), null],
    ['percent unwraps exactly once', 'percent', encode(opaque), opaque],
    ['percent preserves literal plus', 'percent', encodedForm, targetWithPlus],
    ['declared percent decoding can open an otherwise ambiguous query separator', 'percent',
      'https://example.com%3Fq%3Da%26x%3D1', 'https://example.com?q=a&x=1'],
    ['percent leaves an inner encoded percent escape', 'percent', encode('https://example.test/a%252Fb'),
      'https://example.test/a%252Fb'],
    ['one step cannot unwrap two layers', 'percent', delay(opaque), null],
    ['two steps unwrap two layers', 'twice', delay(opaque), opaque],
    ['two steps reject an invalid inner UTF-8 escape', 'twice', encode(opaque), null],
    ['percent rejects malformed triplet', 'percent', 'https%3A%2F%2Fexample.test%2Fa%G0', null],
    ['percent rejects malformed UTF-8', 'percent', 'https%3A%2F%2Fexample.test%2Fa%FF', null],
    ['form decodes plus as space and escaped plus as plus', 'form', encodedForm, formTarget],
    ['form rejects malformed escapes', 'form', 'https%3A%2F%2Fexample.test%2Fa%ZZ', null],
    ['base64 decodes UTF-8', 'base64', base64, base64Target],
    ['base64url decodes URL-safe unpadded UTF-8', 'base64url', base64url, base64Target],
    ['base64 rejects the URL-safe alphabet', 'base64', base64url, null],
    ['base64url rejects the standard alphabet', 'base64url', base64, null],
    ['base64 rejects excess padding', 'base64', base64 + '=', null],
    ['base64url rejects excess padding', 'base64url', base64url + '===', null],
    ['base64 rejects ignored whitespace', 'base64', base64.slice(0, 4) + ' ' + base64.slice(4), null],
    ['base64 rejects invalid UTF-8', 'base64', invalidUtf8.toString('base64'), null],
    ['base64url rejects invalid UTF-8', 'base64url', invalidUtf8.toString('base64url'), null],
    ['percent then base64url follows the declared order', 'chain',
      '%61' + base64url.slice(1), base64Target],
    ['percent then form decodes the two layers', 'form-chain', encode(encodedForm), formTarget],
    ['raw mode rejects a raw LF', 'raw', rawControls, null],
    ['percent rejects a decoded LF', 'percent', encode(rawControls), null],
    ['two percent steps reject a decoded LF', 'twice', delay(rawControls), null],
    ['a single step preserves an escaped LF in the goal', 'percent', encode(escapedControls), escapedControls],
    ['a form layer preserves an escaped LF in the goal', 'form-chain',
      encode(formEncode(escapedControls)), escapedControls],
    ['a second form layer exposes and rejects a raw LF', 'form-chain', encode(formEncode(rawControls)), null],
    ['base64 rejects a decoded LF', 'base64', Buffer.from(rawControls).toString('base64'), null],
    ['base64url rejects a decoded C1 control', 'base64url', Buffer.from(rawC1).toString('base64url'), null],
  ];
  for (const [label, ruleName, capture, expected] of cases) {
    await t.test(label, () => assertRedirectPaths(instance, 'explicit', `${explicitWrapper}${ruleName}?target=${capture}`, expected));
  }
});

test('explicit redirects complete a missing scheme only when the rule declares it', async t => {
  const instance = await loadAddon({ rules: { providers: {
    explicit: {
      urlPattern: '^https://explicit\\.test/',
      forceRedirection: true,
      redirectRules: [
        redirectRule('no-default', '^https://explicit\\.test/none\\?target=([^&]+)', ['urlDecode']),
        redirectRule('http-default', '^https://explicit\\.test/http\\?target=([^&]+)', ['urlDecode'], 'http'),
        redirectRule('https-default', '^https://explicit\\.test/https\\?target=([^&]+)', ['urlDecode'], 'https'),
        redirectRule('fallback', '[?&]fallback=([^&]+)', ['urlDecode']),
      ],
    },
  } } });
  const fallback = 'https://fallback.test/a%2Fb';
  for (const [label, ruleName, target, expected, useFallback = false] of [
    ['a host path receives HTTPS', 'https', 'example.test/a%2Fb', 'https://example.test/a%2Fb'],
    ['a network path receives HTTPS', 'https', '//example.test/a%2Fb', 'https://example.test/a%2Fb'],
    ['a host path can receive HTTP', 'http', 'example.test/a%2Fb', 'http://example.test/a%2Fb'],
    ['a host path retains its port', 'https', 'example.test:8443/a', 'https://example.test:8443/a'],
    ['an IPv6 host path retains its port', 'https', '[2001:db8::1]:8443/a', 'https://[2001:db8::1]:8443/a'],
    ['HTTP remains HTTP with HTTPS as the default', 'https', 'http://example.test/a%2Fb', 'http://example.test/a%2Fb'],
    ['HTTPS remains HTTPS with HTTP as the default', 'http', 'https://example.test/a%2Fb', 'https://example.test/a%2Fb'],
    ['without a default the host path is incomplete', 'none', 'example.test/a', null],
    ['without a default the network path is incomplete', 'none', '//example.test/a', null],
    ['a relative path is not an authority', 'https', '../example.test/a', null],
    ['escaped dot segments are not an authority', 'https', '%2E%2E/example.test/a', null],
    ['an absolute path is not an authority', 'https', '/example.test/a', null],
    ['a malformed HTTP prefix stays invalid', 'https', 'https:/example.test/a', null],
    ['a non-HTTP scheme stays invalid', 'https', 'ftp://example.test/a', null],
    ['a non-HTTP scheme without slashes stays invalid', 'https', 'mailto:user@example.test', null],
    ['a non-HTTP scheme with numeric data stays invalid', 'https', 'urn:123', null],
    ['a malformed HTTP prefix falls through', 'https', 'https:/example.test/a', fallback, true],
    ['a non-HTTP scheme falls through', 'https', 'ftp://example.test/a', fallback, true],
  ]) {
    const fallbackParam = useFallback ? `&fallback=${encode(fallback)}` : '';
    await t.test(label, () => assertRedirectPaths(instance, 'explicit',
      `${explicitWrapper}${ruleName}?target=${encode(target)}${fallbackParam}`, expected));
  }
});

test('explicit redirect precedence, shadowing and fallthrough agree across entry points', async t => {
  const shared = '^https://explicit\\.test/\\?(?:[^&]*&)*first=([^&]+)';
  const unknown = '[?&]unknown=([^&]+)';
  const duplicate = '[?&]duplicate=([^&]+)';
  const instance = await loadAddon({ rules: { providers: {
    explicit: {
      urlPattern: '^https://explicit\\.test/',
      forceRedirection: true,
      redirections: ['[?&]legacy=([^&]+)', shared, unknown, duplicate],
      redirectRules: [
        redirectRule('invalid-regex', '('),
        redirectRule('first', shared, ['unknown']),
        redirectRule('unknown-operation', unknown, ['unknown']),
        redirectRule('invalid-scheme', '[?&]badScheme=([^&]+)', [], 'ftp'),
        redirectRule('first', shared, ['urlDecode']),
        redirectRule('first', duplicate, ['urlDecode']),
        redirectRule('next', '[?&]next=([^&]+)', ['urlDecode']),
      ],
    },
  } } });
  const legacy = 'https://legacy.test/a/b';
  const first = 'https://first.test/a%2Fb';
  const next = 'https://next.test/a%2Fb';
  const invalid = 'https://invalid.test/a%FF';
  for (const [label, query, expected] of [
    ['explicit rules run before distinct legacy rules', `legacy=${legacy}&first=${encode(first)}`, first],
    ['explicit rules preserve their order', `next=${encode(next)}&first=${encode(first)}`, first],
    ['strict failure allows the next explicit rule', `first=${invalid}&next=${encode(next)}&legacy=${legacy}`, next],
    ['strict failure allows a distinct legacy rule', `first=${invalid}&legacy=${legacy}`, legacy],
    ['a failed explicit rule still shadows its identical legacy expression', `first=${invalid}`, null],
    ['an unrecognized operation falls through', `unknown=${first}&next=${encode(next)}`, next],
    ['an invalid configuration does not shadow an identical legacy expression', `unknown=${legacy}`, legacy],
    ['the first valid duplicate rule ID wins within the provider', `duplicate=${legacy}`, legacy],
    ['an invalid default scheme falls through', `badScheme=${first}&next=${encode(next)}`, next],
  ]) {
    await t.test(label, () => assertRedirectPaths(instance, 'explicit', explicitWrapper + '?' + query, expected));
  }
});

test('explicit redirects sharing a regex use the first usable rule and shadow legacy', async t => {
  const shared = '^https://explicit\\.test/\\?target=([^&]+)$';
  const instance = await loadAddon({ rules: { providers: {
    explicit: {
      urlPattern: '^https://explicit\\.test/',
      forceRedirection: true,
      redirections: [shared],
      redirectRules: [
        redirectRule('decode-target', shared, ['urlDecode']),
        redirectRule('literal-target', shared),
      ],
    },
  } } });
  const opaque = 'https://destination.test/a%FF';
  const escaped = 'https://destination.test/a%2Fb';
  for (const [label, target, expected] of [
    ['a failed result falls through to the second explicit rule with the same regex', opaque, opaque],
    ['the first explicit result wins when both are valid', escaped, 'https://destination.test/a/b'],
    ['legacy remains shadowed when both explicit rules fail', delay(escaped), null],
  ]) {
    await t.test(label, () => assertRedirectPaths(instance, 'explicit', `${explicitWrapper}?target=${target}`, expected));
  }
});

test('declared redirects resolve selected captures into a target template', async t => {
  const instance = await loadAddon({ rules: { providers: {
    explicit: {
      urlPattern: '^https://explicit\\.test/',
      forceRedirection: true,
      redirectRules: [
        {
          id: 'compose',
          match: { regex: '[?&]host=([^&]+)&path=([^&]+)&ref=([^&]+)$' },
          preprocessors: [
            { type: 'urlDecode', inputs: [1, 2] },
            { type: 'base64Encode', inputs: [3] },
            { type: 'urlEncode', inputs: [2, 3] },
          ],
          replacePattern: 'https://§1§/§2§?ref=§3§',
        },
        {
          id: 'optional',
          match: { regex: '[?&]path=([^&]*)(?:&query=([^&]*))?$' },
          replacePattern: 'https://destination.test/§1§?q=§2§',
        },
        {
          id: 'all-captures',
          match: { regex: '[?&]piece=([^&]*)(?:&other=([^&]*))?$' },
          preprocessors: [{ type: 'urlDecode', inputs: 'all' }],
          replacePattern: 'https://destination.test/§1§?q=§2§',
        },
        {
          id: 'constant',
          match: { regex: '[?&]fixed$', caseSensitive: true },
          replacePattern: 'https://destination.test/fixed',
        },
      ],
    },
  } } });
  const ref = 'Grüße';
  const encodedRef = encode(Buffer.from(ref).toString('base64'));
  for (const [label, query, expected] of [
    ['ordered steps can target more than one capture', `host=destination%2Etest&path=a%2Fb&ref=${ref}`,
      `https://destination.test/a%2Fb?ref=${encodedRef}`],
    ['an empty participating capture remains empty', 'path=&query=', 'https://destination.test/?q='],
    ['a missing referenced capture invalidates the target', 'path=present', null],
    ['preprocessing all includes every participating capture', 'piece=a%252Fb&other=x%2526y',
      'https://destination.test/a%2Fb?q=x%26y'],
    ['preprocessing all leaves an absent optional group missing', 'piece=a%252Fb', null],
    ['a pattern without captures can produce a constant destination', 'fixed', 'https://destination.test/fixed'],
    ['a case-sensitive pattern rejects different casing', 'Fixed', null],
  ]) {
    await t.test(label, () => assertRedirectPaths(instance, 'explicit', explicitWrapper + '?' + query, expected));
  }
});

test('redirect reconfiguration replaces all rules after compilation', async () => {
  const instance = await loadAddon({ rules: { providers: {
    explicit: {
      urlPattern: '^https://explicit\\.test/',
      forceRedirection: true,
      redirections: ['[?&]old=([^&]+)'],
    },
  } } });
  const activeProvider = provider(instance, 'explicit');
  const oldTarget = 'https://old.test/a/b';
  const replacementTarget = 'https://new.test/a%2Fb';
  const oldURL = `${explicitWrapper}?old=${oldTarget}`;
  const replacementURL = `${explicitWrapper}?next=${encode(replacementTarget)}`;
  assertRedirectPaths(instance, 'explicit', oldURL, oldTarget);

  activeProvider.setRedirections([], [
    redirectRule('invalid-regex', '('),
    {
      id: 'next',
      match: {
        get regex() {
          assert.equal(activeProvider.getRedirection(oldURL), oldTarget, 'the old list remains active during compilation');
          return '[?&]next=([^&]+)';
        },
      },
      preprocessors: [{ type: 'urlDecode', inputs: [1] }],
    },
  ]);
  assertRedirectPaths(instance, 'explicit', oldURL, null);
  assertRedirectPaths(instance, 'explicit', replacementURL, replacementTarget);

  activeProvider.setRedirections([], []);
  assertRedirectPaths(instance, 'explicit', replacementURL, null);
});

test('Google legacy results and fallthrough agree in all redirect paths', async t => {
  const instance = await loadAddon();
  const searchURL = 'https://www.google.com/url?q=';
  const searchTarget = 'https://example.test%2Fguide%23notes?q=x%2By';
  const expectedSearch = 'https://example.test/guide#notes?q=x+y';
  const expectedAd = 'https://fallback.test/a/b?q=x';
  const adParameter = '&adurl=' + encode('https://fallback.test/a%2Fb?q=x');
  const formTarget = 'https://example.test/docs/chapter(1)/page?q=summary#intro';
  const cases = [
    ['search URL', searchURL + searchTarget, expectedSearch],
    ['ad destination', 'https://www.google.com/redirect?adurl=https://example.test%3Fq%26x%3D1',
      'https://example.test?q&x=1'],
    ['AMP path', 'https://www.google.com/amp/s/example.test%2Fguide%23notes', 'http://example.test/guide#notes'],
    ['valid search target takes precedence over a valid ad destination', searchURL + searchTarget + adParameter, expectedSearch],
    ['HTTPS prefix with separately encoded hex digits', searchURL + encodedHttpsPrefix + 'example.test' + adParameter,
      'https://example.test'],
    ['decoded prefix and escapes with different layer depths',
      searchURL + encodedHttpsPrefix + 'example.test/a%2Fb?q=x%252By', 'https://example.test/a/b?q=x+y'],
    ['WHATWG userinfo with more than one literal at-sign',
      searchURL + 'https://user@name@example.test/path', 'https://user@name@example.test/path'],
    ['an encoded at-sign opens after an encoded query boundary',
      searchURL + 'https://example.test%3Fq%40b' + adParameter, 'https://example.test?q@b'],
    ['an invalid port falls through',
      searchURL + 'https://first.test:99999%2Fpath%40second.test/a' + adParameter, expectedAd],
    ['an encoded invalid port falls through',
      searchURL + 'https://first.test%3A%399999%2Fpath%40second.test/a' + adParameter, expectedAd],
    ['an opaque malformed host falls through',
      searchURL + 'https://%FF%2Fleft%40first.test%2Fignored%40second.test/a' + adParameter, expectedAd],
    ['a form wrapper decodes the entire path and fragment', searchURL + formEncode(formTarget), formTarget],
    ['an apparent second query assignment is opened',
      searchURL + 'https://example.test%3Fone%3D1%26two%3D2', 'https://example.test?one=1&two=2'],
    ['additional percent-encoded path and query separators are opened',
      searchURL + 'https://example.test%2Fguide%2Ffile%3Fq%3Da%2526b', 'https://example.test/guide/file?q=a&b'],
    ['query and path separators can be wrapped at different depths',
      searchURL + 'https://example.test%252Fa%3Fa%3D1%26b%3D2', 'https://example.test/a?a=1&b=2'],
    ['encoded assignment with a literal equals sign in the value',
      searchURL + 'https://example.com%3Fq%3Da=b', 'https://example.com?q=a=b'],
    ['a literal assignment is followed by an encoded equals sign',
      searchURL + 'https://example.com%3Fq=a%3Db', 'https://example.com?q=a=b'],
    ['an invalid opaque byte in the query falls through',
      searchURL + 'https://example.com%3Fq%3Dx%FF%2B%26b%3Dc' + adParameter, expectedAd],
    ['opaque byte in a legacy bare query field', searchURL + opaqueLegacyCapture + adParameter, opaqueLegacyTarget],
  ];

  for (const [label, invalidTarget] of [
    ['newline', delay('https://example.test/a?q=x\ny')],
    ['C1 control', delay('https://example.test/a?q=x\u0085y')],
    ['escaped newline inside a form wrapper', encode(formEncode('https://example.test/foo%0Abar!'))],
    ['raw newline in a form wrapper using literal plus', encode(formEncode('https://example.test/foo bar\nbaz!'))],
    ['raw C1 in a mixed wrapper', 'https%3A//example.test/foo%25%43%32%25%38%35bar'],
  ]) {
    cases.push(
      [label + ' yields no redirect', searchURL + invalidTarget, null],
      [label + ' falls through to the ad destination', searchURL + invalidTarget + adParameter, expectedAd],
      ['a valid search target wins before ' + label, searchURL + searchTarget + '&adurl=' + invalidTarget, expectedSearch],
    );
  }

  for (const [label, url, expected] of cases) {
    await t.test(label, () => assertRedirectPaths(instance, 'google', url, expected));
  }
});

test('seeded legacy captures cannot produce invalid URLs or raw controls', async () => {
  const instance = await addon();
  const alphabet = ['%', '25', 'FF', '2F', '/', '?', '&', '=', '#', '+', ':', '@', '\\', ' ', 'A', '\n', '%C2%85'];
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
    assert.doesNotMatch(value, /[\u0000-\u001f\u007f-\u009f]/, `raw control in mutation ${index}: ${JSON.stringify(target)}`);
  }
});

test('policy decisions remain explicit instead of being guessed', async t => {
  const pending = [
    ['scheme-less https.example.com', 'accept as host/path or reject a namespaced-looking prefix'],
    ['bare scheme-less userinfo', 'user:password@example.test versus a non-HTTP scheme'],
    ['single-label host paths', 'localhost/path support versus requiring DNS-looking names'],
    ['malformed/overlong/surrogate encodings beyond the sampled corpus', 'define preservation versus rejection scope per URL component'],
  ];
  for (const [name, question] of pending) {
    await t.todo(`${name}: ${question}`);
  }
});
