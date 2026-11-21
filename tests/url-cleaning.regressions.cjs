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
  ['https%3A%2F%2Fexample.com%2F%3Fq%3Da%2526b', 'https://example.com/?q=a&b'],
  ['https%3A%2F%2Fexample.com%2F%3Fq%3D100%2525', null],
  ['HTTPS%3A%2F%2Fexample.com%2F', 'HTTPS://example.com/'],
  ['https%253A%252F%252Fexample.com%252F%253Fq%253Da%252526b', 'https://example.com/?q=a&b'],
  ['https://example.com%2Fguide%3Fsection%3Dstart', 'https://example.com/guide?section=start'],
  ['https://example.com%2Fguide%3Fq%3Da%26b', 'https://example.com/guide?q=a&b'],
  ['https://example.com%2Fguide%3Fq%3Da%26b#preview', 'https://example.com/guide?q=a&b#preview'],
  ['https://example.com%23frag%FF', null],
  ['https://example.com%3Fq%3Dx%FF%2B%26b%3Dc', null],
  ['https://example.com' + encodeURIComponent('/guide?one=1&two=2#details'),
    'https://example.com/guide?one=1&two=2#details'],
  ['https://example.com' + encodeURIComponent('/docs/v1?q=a%26b'), 'https://example.com/docs/v1?q=a&b'],
  ['https%3A%2F%2Fexample.com%2Fguide%3Fq%3Da%26b', 'https://example.com/guide?q=a&b'],
  ['https://example.com%2Fguide?q=a%26b', 'https://example.com/guide?q=a&b'],
  ['https://example.com%2Fguide?q=100%25', null],
  ['https://example.com%2Fguide?q=x%FF', null],
  ['https://%5B2001%3Adb8%3A%3A1%5D%3A8443%2Fguide?q=a%26b', 'https://[2001:db8::1]:8443/guide?q=a&b'],
  ['HTTPS%3A/%2Fexample.com/a%2Fb?q=a%26b', 'HTTPS://example.com/a/b?q=a&b'],
  ['https%3A%2F%2Fexample.com/a%2Fb?q=a%26b', 'https://example.com/a/b?q=a&b'],
  ['https://example.com/a%2Fb?q=x%FF%25%26', null],
  ['HTTPS://HTTPBIN.ORG/path', 'HTTPS://HTTPBIN.ORG/path'],
]) {
  test(`Google legacy redirect decodes ${target}`, async () => {
    const addon = await loadAddon();
    const url = `https://www.google.com/url?q=${target}`;
    assert.equal(addon.clean(url), expected ?? url);
    assert.deepEqual(addon.request(url), expected === null ? {} : { redirectUrl: expected });
  });
}

for (const [description, url, expected] of [
  ['LinkedIn mixed scheme',
    'https://www.linkedin.com/safety/go?url=HTTPS%3A//example.com/a%2Fb?q=a%26b',
    'HTTPS://example.com/a/b?q=a&b'],
  ['LinkedIn mixed scheme slashes',
    'https://www.linkedin.com/safety/go?url=HTTPS%3A/%2Fexample.com/a%2Fb?q=a%26b',
    'HTTPS://example.com/a/b?q=a&b'],
  ['LinkedIn fully encoded target',
    'https://www.linkedin.com/safety/go?url=https%3A%2F%2Fexample.com%2Fa%252Fb',
    'https://example.com/a/b'],
  ['LinkedIn encoded authority boundary with a literal query',
    'https://www.linkedin.com/safety/go?url=HTTPS%3A%2F%2Fexample.com%2Fguide?q=a%26b',
    'HTTPS://example.com/guide?q=a&b'],
  ['Facebook encoded target with nested escapes',
    'https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fa%25252Fb%3Fq%3Da%252526b',
    'https://example.com/a/b?q=a&b'],
  ['Google AMP target',
    'https://www.google.com/amp/s/example.com/a%2Fb?q=a%26b',
    'http://example.com/a/b?q=a&b'],
  ['Google AMP target with a legacy escaped byte',
    'https://www.google.com/amp/s/example.com/a%FFb',
    null],
  ['Google AMP target with an IPv6 host',
    'https://www.google.com/amp/s/[2001:db8::1]/a%2Fb',
    'http://[2001:db8::1]/a/b'],
  ['Google AMP target with an IPv6 host and port',
    'https://www.google.com/amp/s/[2001:db8::1]:8443/a%2Fb?q=a%26b',
    'http://[2001:db8::1]:8443/a/b?q=a&b'],
  ['Google AMP target with an outer encoding layer',
    'https://www.google.com/amp/s/example.com%2Fa%252Fb',
    'http://example.com/a/b'],
  ['Google ad redirect on an AMP path',
    'https://www.google.com/amp/s/example.com/page?adurl=example.org/a%2Fb',
    'http://example.org/a/b'],
  ['Google ad redirect with a scheme-less target',
    'https://www.googleadservices.com/page?adurl=example.org/a%2Fb?q=a%26b',
    'http://example.org/a/b?q=a&b'],
  ['Steam preserves a scheme-less authority with userinfo',
    'https://steamcommunity.com/linkfilter/?url=user:password@example.com/a%2Fb?q=a%26b',
    'http://user:password@example.com/a/b?q=a&b'],
  ['Steam accepts a scheme-less HTTP-prefixed hostname',
    'https://steamcommunity.com/linkfilter/?url=HTTPBIN.ORG/path', 'http://HTTPBIN.ORG/path'],
  ['Steam accepts a scheme-less hostname with a visible path',
    'https://steamcommunity.com/linkfilter/?url=https-gateway.example.com/path', 'http://https-gateway.example.com/path'],
  ['Steam accepts a scheme-less hostname with an explicit path and port',
    'https://steamcommunity.com/linkfilter/?url=intranet:8080/path', 'http://intranet:8080/path'],
]) {
  test(`${description} decodes according to its redirection rule`, async () => {
    const addon = await loadAddon();
    assert.equal(addon.clean(url), expected ?? url);
    assert.deepEqual(addon.request(url), expected === null ? {} : { redirectUrl: expected });
  });
}

for (const [provider, wrapper] of [
  ['Steam', 'https://steamcommunity.com/linkfilter/?url='],
  ['Google Ads', 'https://www.googleadservices.com/page?adurl='],
]) {
  const target = '//example.com/guide?q=a%26b';
  const expected = 'http://example.com/guide?q=a&b';
  for (const [format, capture] of [['literal', target], ['encoded', encodeURIComponent(target)]]) {
    test(`${provider} unwraps ${format} scheme-relative targets`, async () => {
      const addon = await loadAddon();
      const url = wrapper + capture;
      assert.equal(addon.clean(url), expected);
      assert.equal(addon.request(url).redirectUrl, expected);
    });
  }
}

test('an invalid redirect target leaves the wrapper usable', async () => {
  const addon = await loadAddon();
  for (const target of ['https://%FF.example.com/', 'https://[invalid]/', 'https-not-a-url']) {
    const url = `https://www.google.com/url?q=${target}`;
    assert.equal(addon.clean(url), url);
    assert.deepEqual(addon.request(url), {});
  }
});

test('a later redirect rule can provide a valid target after an invalid target', async () => {
  const addon = await loadAddon();
  const destination = 'https://example.com/guide';
  for (const target of ['https://%FF.example.com/', 'https-not-a-url', 'https-example.com%2Fbad']) {
    const url = `https://www.google.com/url?q=${target}&adurl=${destination}`;
    assert.equal(addon.clean(url), destination, target);
    assert.equal(addon.request(url).redirectUrl, destination, target);
  }
});

test('incomplete HTTP targets are not treated as scheme-less hosts by other rules', async () => {
  const addon = await loadAddon();
  for (const target of ['https-not-a-url', 'HTTPS-NOT-A-URL', 'https-example.com%2Fbad']) {
    const url = `https://steamcommunity.com/linkfilter/?url=${target}`;
    assert.equal(addon.clean(url), url);
    assert.deepEqual(addon.request(url), {});
  }
});

test('non-HTTP schemes are not treated as scheme-less hosts', async () => {
  const addon = await loadAddon();
  for (const target of ['ftp://example.com/a%2Fb', 'ftp%3A%2F%2Fexample.com/a%2Fb',
    'ftp%253A%252F%252Fexample.com/a%2Fb', 'urn:123', 'mailto:123']) {
    const url = `https://steamcommunity.com/linkfilter/?url=${target}`;
    assert.equal(addon.clean(url), url, target);
    assert.deepEqual(addon.request(url), {}, target);
  }
});

test('the first valid redirect rule wins even if a later rule has an explicit scheme', async () => {
  const addon = await loadAddon();
  const url = 'https://www.google.com/amp/s/https://example.org/amp?adurl=example.com/a%2Fb';
  const destination = 'http://example.com/a/b';
  assert.equal(addon.clean(url), destination);
  assert.equal(addon.request(url).redirectUrl, destination);
});

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

for (const [description, fragment, retained] of [
  ['a bare encoded anchor is preserved', '#%75tm_source', '#%75tm_source'],
  ['an encoded tracking parameter with an empty value is removed', '#%75tm_source=', ''],
  ['a bare anchor survives removal of a tracking parameter with the same name',
    '#%75tm_source&&%75tm_source=x&keep=a%26b&', '#%75tm_source&&keep=a%26b&'],
  ['a bare name matching a raw rule is still removed', '#utm_source', ''],
]) {
  test(description, async () => {
    const addon = await loadAddon();
    const url = `https://example.com/${fragment}`;
    const expected = `https://example.com/${retained}`;
    assert.equal(addon.clean(url), expected);
    assert.deepEqual(addon.request(url), url === expected ? {} : { redirectUrl: expected });
  });
}
