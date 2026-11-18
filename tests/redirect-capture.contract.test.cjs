const assert = require('node:assert/strict');
const test = require('node:test');
const { catalog, loadAddon } = require('./helpers/addon.cjs');

// One real wrapper for every public redirection rule. These are capture templates,
// not network requests. Compatibility and decoding are deliberately separate signals.
const wrappers = {
  google: [
    'https://www.google.com/url?q={target}',
    'https://www.google.com/redirect?adurl={target}',
    'https://www.google.com/amp/s/{target}',
  ],
  doubleclick: ['https://www.doubleclick.net/?tag_for_child_directed_treatment=;%3F{target}'],
  googleadservices: ['https://www.googleadservices.com/?adurl={target}'],
  'amazon-adsystem': ['https://amazon-adsystem.com/x/c/sample/{target}'],
  youtube: ['https://www.youtube.com/redirect?q={target}'],
  facebook: ['https://l.facebook.com/l.php?u={target}'],
  reddit: ['https://out.reddit.com/?url={target}', 'https://click.redditmail.com/?url={target}'],
  ebay: ['https://rover.ebay.com/rover?mpre={target}'],
  'govdelivery.com': ['https://links.govdelivery.com/track?url={target}'],
  steamcommunity: ['https://steamcommunity.com/linkfilter/?url={target}'],
  'mozaws.net': [`https://outgoing.prod.mozaws.net/v1/${'a'.repeat(64)}/{target}`],
  'deviantart.com': ['https://www.deviantart.com/sample/outgoing?{target}'],
  'site2.com': ['https://site2.com/?url={target}'],
  'site.com': ['https://site.com/?to={target}'],
  'site3.com': ['https://site3.com/?r={target}'],
  'linksynergy.com': ['https://linksynergy.com/?murl={target}'],
  'gate.sc': ['https://gate.sc/?url={target}'],
  'vk.com': ['https://vk.com/away.php?to={target}'],
  'curseforge.com': ['https://www.curseforge.com/linkout?remoteUrl={target}'],
  'messenger.com': ['https://l.messenger.com/l.php?u={target}'],
  LinkedIn: ['https://www.linkedin.com/safety/go?url={target}'],
  'smartredirect.de': ['https://smartredirect.de/?url={target}'],
  'rutracker.org': ['https://rutracker.org/?url={target}'],
  instagram: ['https://l.instagram.com/?u={target}'],
  'imgsrc.ru': ['https://dlp.imgsrc.ru/go/1/2/3/{target}'],
  'awstrack.me': ['https://example.awstrack.me/sample/{target}/sample'],
  'exactag.com': ['https://exactag.com/?url={target}'],
  'disq.us': ['https://disq.us/?url={target}%3A'],
  'anonym.to': ['https://anonym.to/?{target}'],
  ClearURLsTest: ['https://kevinroebert.gitlab.io/ClearUrls/void/index.html?url={target}'],
  ClearURLsTest2: ['https://test.clearurls.xyz/void/index.html?url={target}'],
  'alabout.com': ['https://alabout.com/?url={target}'],
  'tradedoubler.com': ['https://tradedoubler.com/?_td_deeplink={target}'],
  'srvtrck.com': ['https://srvtrck.com/?url={target}'],
  'mysku.ru': ['https://mysku.ru/?r={target}'],
  'admitad.com': ['https://admitad.com/?ulp={target}'],
  'digidip.net': ['https://digidip.net/?url={target}'],
  'dpbolvw.net': ['https://dpbolvw.net/?url={target}'],
  'mailpanion.com': ['https://mailpanion.com/?destination={target}'],
  'signtr.website': ['https://signtr.website/?redirect={target}'],
  'mailtrack.io': ['https://mailtrack.io/?url={target}'],
  'effiliation.com': ['https://effiliation.com/?url={target}'],
  'hlserve.com': ['https://hlserve.com/?dest={target}'],
  'flexlinkspro.com': ['https://flexlinkspro.com/?url={target}'],
  'ccbill.com': ['https://refer.ccbill.com/?HTML={target}'],
  'idealo-partner.com': ['https://idealo-partner.com/?trg={target}'],
  'webgains.com': ['https://webgains.com/?wgtarget={target}'],
  'getpocket.com': ['https://getpocket.com/?url={target}'],
  'tokopedia.com': ['https://tokopedia.com/promo/?r={target}'],
  'app.adjust.com': ['https://app.adjust.com/?redirect={target}'],
  duckduckgo: ['https://duckduckgo.com/l/?uddg={target}'],
  'partner-ads.com': ['https://www.partner-ads.com/?htmlurl={target}'],
  'href.li': ['https://href.li/?{target}'],
  'adform.net': ['https://track.adform.net/C/?ckurl={target}'],
  'artefact.com': ['https://www.artefact.com/trck/?deeplinkurl={target}'],
  'awin1.com': ['https://www.awin1.com/?ued={target}'],
  'telekom.de': ['https://aaa.telekom.de/trck/?deeplinkurl={target}'],
  'cc.loginfra.com': ['https://cc.loginfra.com/?u={target}'],
  't.umblr.com': ['https://t.umblr.com/redirect?z={target}'],
  'skimresources.com': ['https://go.skimresources.com/?url={target}'],
  'mozgcp.net': ['https://prod.outgoing.prod.webservices.mozgcp.net/v1/sample/{target}'],
  'viglink.com': ['https://redirect.viglink.com/?u={target}'],
};

const destination = 'HTTPS://example.test/a%2Fb?q=a%26b#bookmark%23part';
const networkDestination = 'http://example.test/a%2Fb?q=a%26b';
const withLegacy = 'HTTPS://example.test/a%FFb?q=%FF';
const targets = [
  ['identity', destination, destination],
  ['identity-path-only', 'HTTPS://example.test/a%2Fb', 'HTTPS://example.test/a%2Fb'],
  ['literal-additional-query-field', destination + '&role=admin', destination + '&role=admin'],
  ['full-wrapper', encodeURIComponent(destination), destination],
  ['double-wrapper', encodeURIComponent(encodeURIComponent(destination)), destination],
  ['triple-wrapper', encodeURIComponent(encodeURIComponent(encodeURIComponent(destination))), destination],
  ['mixed-scheme', 'HTTPS%3A/%2Fexample.test/a%2Fb?q=a%26b', 'HTTPS://example.test/a%2Fb?q=a%26b'],
  ['partial-path', 'HTTPS://example.test%2Fguide?q=a%26b', 'HTTPS://example.test/guide?q=a%26b'],
  ['partial-path-query', 'HTTPS://example.test%2Fguide%3Fq%3Da%26b', 'HTTPS://example.test/guide?q=a%26b'],
  ['partial-multiple-query', 'HTTPS://example.test%2Fguide%3Fone%3D1%26two%3D2%23details', 'HTTPS://example.test/guide?one=1&two=2#details'],
  ['partial-network-path', '//example.test%2Fguide%3Fq%3Da%26b', 'http://example.test/guide?q=a%26b'],
  ['nested-port', 'HTTPS://example.test%253A8443/a%2Fb?q=%FF', 'HTTPS://example.test:8443/a%2Fb?q=%FF'],
  ['scheme-relative', '//example.test/a%2Fb?q=a%26b', networkDestination],
  ['encoded-scheme-relative', encodeURIComponent('//example.test/a%2Fb?q=a%26b'), networkDestination],
  ['host-path', 'example.test/a%2Fb?q=a%26b', 'http://example.test/a%2Fb?q=a%26b'],
  ['encoded-host-path', encodeURIComponent('example.test/a%2Fb?q=a%26b'), 'http://example.test/a%2Fb?q=a%26b'],
  ['http-named-host-path', 'HTTPBIN.ORG/path', 'http://HTTPBIN.ORG/path'],
  ['ipv6-host-path', '[2001:db8::1]:8443/a%2Fb?q=a%26b', 'http://[2001:db8::1]:8443/a%2Fb?q=a%26b'],
  ['userinfo-host-path', 'user:password@example.test/a%2Fb?q=a%26b', 'http://user:password@example.test/a%2Fb?q=a%26b'],
  ['legacy-path-query', withLegacy, withLegacy],
  ['wrapped-legacy-path-query', encodeURIComponent(withLegacy), withLegacy],
  ['partial-legacy-fragment', 'HTTPS://example.test%23frag%FF', 'HTTPS://example.test#frag%FF'],
];

const invalidTargets = [
  ['incomplete-http', 'https-not-a-url'],
  ['incomplete-http-uppercase', 'HTTPS-NOT-A-URL'],
  ['incomplete-http-host', 'https-example.com%2Fbad'],
  ['invalid-host-byte', 'https://%FF.example.test/'],
  ['invalid-ip', 'https://[invalid]/'],
  ['invalid-port', 'https://example.test:65536/'],
  ['other-uri', 'urn:123'],
  ['other-mailto', 'mailto:123'],
  ['other-scheme', 'ftp://example.test/a'],
];

const legacyRedditPattern = String.raw`^https?:\/\/(?:[a-z0-9-]+\.)*?reddit.com`;
const redirectionRuleCount = Object.values(catalog.providers)
  .reduce((count, provider) => count + (provider.redirections?.length || 0), 0);
const coverage = new Map();
let exactCaptures = 0;
let incompatiblePairs = 0;
let addonPromise;
const getAddon = () => addonPromise ||= loadAddon();

test('every public redirection rule has an exact-capture or explicit incompatibility verdict for every target family', async t => {
  const addon = await getAddon();
  for (const [name, provider] of Object.entries(catalog.providers).filter(([, value]) => value.redirections?.length)) {
    assert.equal(wrappers[name]?.length, provider.redirections.length, `wrapper inventory for ${name}`);
    const matchers = provider.redirections.map(source => new RegExp(source, 'i'));
    const instance = addon.context.providers.find(candidate => candidate.getName() === name);

    for (const [index, matcher] of matchers.entries()) {
      const ruleId = `${name} rule ${index + 1}`;
      const reachable = name !== 'reddit' || index !== 1 || provider.urlPattern !== legacyRedditPattern;
      coverage.set(ruleId, 0);
      await t.test(ruleId, async t => {
        for (const [family, capture, expected] of targets) {
          const url = wrappers[name][index].replace('{target}', () => capture);
          const selected = matcher.exec(url);
          if (!selected || selected[1] !== capture) {
            incompatiblePairs++;
            await t.test(`${family}: wrapper-incompatible`, () => {
              assert.ok(!selected || selected[1] !== capture, 'the complete target is not capturable by this wrapper');
            });
            continue;
          }

          exactCaptures++;
          coverage.set(ruleId, coverage.get(ruleId) + 1);
          await t.test(`${family}: exact capture`, () => {
            assert.equal(selected[1], capture, 'assert complete capture, never a truncated prefix');
            assert.equal(matchers.findIndex(rule => rule.exec(url)?.[1]), index, 'rule precedence before decoding');
            const ruleTarget = instance.getRedirection(url);
            assert.equal(ruleTarget, expected, `${ruleId}: ${JSON.stringify({ family, url, capture, selected: selected[1], expected, ruleTarget })}`);
            assert.equal(instance.matchURL(url), reachable, `${ruleId}: provider dispatch`);
            if (reachable) {
              assert.equal(addon.clean(url), expected, `${ruleId} clean`);
              assert.deepEqual(addon.request(url), { redirectUrl: expected }, `${ruleId} request`);
            } else {
              assert.equal(addon.clean(url), url, `${ruleId}: provider urlPattern does not reach wrapper`);
              assert.deepEqual(addon.request(url), {}, `${ruleId}: unreachable wrapper cannot redirect a request`);
            }
            assert.match(expected, /^https?:\/\//i);
            assert.notEqual(new URL(expected).hostname, '');
            const googleProvider = addon.context.providers.find(candidate => candidate.getName() === 'google');
            assert.equal(googleProvider.getRedirection(wrappers.google[0].replace('{target}', () => encodeURIComponent(expected))), expected,
              `${ruleId}: destination remains stable when wrapped again through Google`);
          });
        }

        for (const [family, capture] of invalidTargets) {
          const url = wrappers[name][index].replace('{target}', () => capture);
          const selected = matcher.exec(url);
          if (!selected || selected[1] !== capture) {
            incompatiblePairs++;
            await t.test(`invalid ${family}: wrapper-incompatible`, () => {
              assert.ok(!selected || selected[1] !== capture);
            });
            continue;
          }

          exactCaptures++;
          coverage.set(ruleId, coverage.get(ruleId) + 1);
          await t.test(`invalid ${family}: exact capture without redirect`, () => {
            assert.equal(selected[1], capture);
            assert.equal(matchers.findIndex(rule => rule.exec(url)?.[1]), index, 'rule precedence before decoding');
            assert.equal(instance.getRedirection(url), null, `${ruleId} rejects invalid capture`);
            assert.equal(instance.matchURL(url), reachable, `${ruleId}: invalid-target provider dispatch`);
            assert.deepEqual(addon.request(url), {}, `${ruleId} invalid request`);
            assert.equal(addon.clean(url), url, `${ruleId} invalid clean`);
          });
        }
      });
    }
  }
});

test('alternative wrapper routes preserve valid captures and decoding', async () => {
  const addon = await getAddon();
  const expected = destination;
  const encoded = encodeURIComponent(destination);
  const alternatives = [
    ['google', 'https://www.google.com/url?url=' + encoded],
    ['google', 'https://www.google.com/url?q=' + encoded],
    ['LinkedIn', 'https://www.linkedin.com/redir/redirect?url=' + encoded],
    ['LinkedIn', 'https://www.linkedin.com/safety/go?foo=1&url=' + encoded],
    ['tradedoubler.com', 'https://tradedoubler.com/?url=' + encoded],
    ['tradedoubler.com', 'https://tradedoubler.com/?_td_deeplink=' + encoded],
  ];
  for (const [name, url] of alternatives) {
    const instance = addon.context.providers.find(candidate => candidate.getName() === name);
    assert.ok(catalog.providers[name].redirections.some(source => new RegExp(source, 'i').exec(url)?.[1] === encoded), `${name}: exact route capture`);
    assert.equal(instance.getRedirection(url), expected, `${name}: Provider.getRedirection`);
    assert.equal(addon.clean(url), expected, `${name}: pureCleaning`);
    assert.deepEqual(addon.request(url), { redirectUrl: expected }, `${name}: request`);
  }
});

test('coverage accounting includes every catalog rule and no silently omitted exact-capture failure', () => {
  assert.equal(coverage.size, redirectionRuleCount);
  assert.equal(redirectionRuleCount, 65);
  for (const [ruleId, count] of coverage) {
    assert.ok(count > 0, `${ruleId} has no exact-capture assertion`);
  }
  assert.equal(exactCaptures, 1829, 'pin the exact-capture accounting instead of accepting a silent shift to wrapper-incompatible');
  assert.equal(incompatiblePairs, 186, 'pin deliberately incompatible capture forms instead of silently dropping an exact case');
  assert.ok(exactCaptures > redirectionRuleCount, 'the matrix must execute more than one exact-capture assertion per rule');
  assert.ok(incompatiblePairs > 0, 'capture constraints are reported separately from semantic rejection');
});