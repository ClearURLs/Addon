const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadAddon } = require('./helpers/addon.cjs');

const addonRoot = path.resolve(__dirname, '..');
const release = '79770d2aab3d69e4dcd023012df4fe111bf7db34'; // v1.27.3
const sharedPattern = '^https://feed\\.test/\\?target=([^&]+)$';
const legacyPattern = '^https://feed\\.test/\\?legacy=([^&]+)$';
const explicitPattern = '^https://explicit\\.test/\\?target=([^&]+)$';
const sharedRule = {
  id: 'shared-target',
  match: { regex: sharedPattern, caseSensitive: false },
  preprocessors: [{ type: 'urlDecode', inputs: 'all' }],
  defaultScheme: 'https',
};
const explicitRule = {
  id: 'explicit-target',
  match: { regex: explicitPattern },
  replacePattern: '§1§',
  defaultScheme: 'https',
};
const providerDefaults = { rules: [], rawRules: [], referralMarketing: [], exceptions: [] };
const source = { providers: {
  mixed: {
    ...providerDefaults,
    urlPattern: '^https://feed\\.test/',
    redirections: [sharedPattern, legacyPattern],
    redirectRules: [sharedRule],
  },
  explicit: {
    ...providerDefaults,
    urlPattern: '^https://explicit\\.test/',
    redirectRules: [explicitRule],
  },
} };

function buildMinifiedFeed(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clearurls-redirect-feed-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'data.min.json');
  const output = path.join(directory, 'data.minify.json');
  fs.writeFileSync(input, JSON.stringify(source, null, 2));
  execFileSync(process.execPath, [path.join(addonRoot, 'build_tools/minifyDataJSON.js'), input, output]);
  return JSON.parse(fs.readFileSync(output, 'utf8'));
}

test('one minified redirect feed serves current and legacy add-ons', async t => {
  const rules = buildMinifiedFeed(t);
  assert.deepEqual(rules.providers.mixed.redirections, [sharedPattern, legacyPattern]);
  assert.deepEqual(rules.providers.mixed.redirectRules, [sharedRule]);
  assert.equal(rules.providers.explicit.redirections, undefined);
  assert.deepEqual(rules.providers.explicit.redirectRules, [explicitRule]);

  const destination = 'https://destination.test/a%2Fb';
  const sharedURL = 'https://feed.test/?Target=' + encodeURIComponent('destination.test/a%2Fb');
  const legacyCases = [
    ['https://destination.test/path', 'https://destination.test/path'],
    [encodeURIComponent('https://destination.test/a%2Fb?q=a%26b'), 'https://destination.test/a/b?q=a&b'],
    ['https://destination.test%2Fguide@other.test/path', 'https://destination.test/guide@other.test/path'],
  ];
  const explicitURL = 'https://explicit.test/?target=destination.test';
  const explicitDestination = 'https://destination.test';
  const released = spawnSync('git', ['cat-file', '-e', release + '^{commit}'], { cwd: addonRoot });

  await t.test('v1.27.3 runs only redirections', {
    skip: released.status !== 0 && 'v1.27.3 commit unavailable in this checkout',
  }, async () => {
    const readSource = file => execFileSync('git', ['show', release + ':' + file], { cwd: addonRoot, encoding: 'utf8' });
    // The inherited enumerable getter appeared as an extra provider in this release.
    const expectedProviderNames = [...Object.keys(rules.providers), 'getOrDefault'];
    const legacy = await loadAddon({ rules, readSource, expectedProviderNames });
    assert.equal(legacy.clean(sharedURL), 'http://destination.test/a/b');
    assert.deepEqual(legacy.request(sharedURL), { redirectUrl: 'http://destination.test/a/b' });
    for (const [capture, expected] of legacyCases) {
      const url = 'https://feed.test/?legacy=' + capture;
      assert.equal(legacy.clean(url), expected);
      assert.deepEqual(legacy.request(url), { redirectUrl: expected });
    }
    assert.equal(legacy.clean(explicitURL), explicitURL);
    assert.deepEqual(legacy.request(explicitURL), {});
  });

  await t.test('current add-on runs both lists and prefers the explicit rule', async () => {
    const current = await loadAddon({ rules });
    assert.equal(current.clean(sharedURL), destination);
    assert.deepEqual(current.request(sharedURL), { redirectUrl: destination });
    for (const [capture, expected] of legacyCases) {
      const url = 'https://feed.test/?legacy=' + capture;
      assert.equal(current.clean(url), expected);
      assert.deepEqual(current.request(url), { redirectUrl: expected });
    }
    assert.equal(current.clean(explicitURL), explicitDestination);
    assert.deepEqual(current.request(explicitURL), { redirectUrl: explicitDestination });
  });
});
