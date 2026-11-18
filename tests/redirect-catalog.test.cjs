const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { catalog, loadAddon } = require('./helpers/addon.cjs');
const bundledCatalogPath = path.join(__dirname, '../data/data.min.json');
const bundledCatalog = existsSync(bundledCatalogPath) ? require(bundledCatalogPath) : null;
const noBundledCatalog = 'Rules submodule is not checked out';

// Each template exercises the actual first capture of one catalog rule. These
// URLs are passed to the add-on's test harness and never fetched.
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

const destination = 'HTTPS://example.test/a%2Fb?q=a%26b';
const encoded = encodeURIComponent(destination);
const pathOnly = 'HTTPS://example.test/a%2Fb';
const withFragment = 'HTTPS://example.test/a%2Fb?keep=a%26b&data=x%2By#bookmark%23part';
const withLegacyByte = 'HTTPS://example.test/a%FFb?q=%FF';
const networkPath = '//example.test/a%2Fb?q=a%26b';
const networkDestination = `http:${networkPath}`;
const hostPath = 'example.test/a%2Fb?q=a%26b';

const targets = [
  ['literal HTTPS', destination, destination],
  ['literal HTTPS path', pathOnly, pathOnly],
  ['encoded HTTPS', encoded, destination],
  ['double-encoded HTTPS', encodeURIComponent(encoded), destination],
  ['literal query and fragment delimiters', withFragment, withFragment],
  ['encoded query and fragment delimiters', encodeURIComponent(withFragment), withFragment],
  ['mixed scheme delimiter', 'HTTPS%3A/%2Fexample.test/a%2Fb?q=a%26b', destination],
  ['encoded path delimiter before a literal query', 'HTTPS://example.test%2Fguide?q=a%26b',
    'HTTPS://example.test/guide?q=a%26b'],
  ['encoded path and query delimiters with a literal scheme', 'HTTPS://example.test%2Fguide%3Fq%3Da%26b',
    'HTTPS://example.test/guide?q=a%26b'],
  ['encoded path, multiple query fields and fragment with a literal scheme',
    'HTTPS://example.test' + encodeURIComponent('/guide?one=1&two=2#details'),
    'HTTPS://example.test/guide?one=1&two=2#details'],
  ['encoded path and query with a nested escape and a literal scheme',
    'HTTPS://example.test' + encodeURIComponent('/docs/v1?q=a%26b'), 'HTTPS://example.test/docs/v1?q=a%26b'],
  ['encoded path and query delimiters with a literal network-path prefix', '//example.test%2Fguide%3Fq%3Da%26b',
    'http://example.test/guide?q=a%26b'],
  ['nested encoded port delimiter before a literal path', 'HTTPS://example.test%253A8443/a%2Fb?q=%FF',
    'HTTPS://example.test:8443/a%2Fb?q=%FF'],
  ['literal network-path reference', networkPath, networkDestination],
  ['encoded network-path reference', encodeURIComponent(networkPath), networkDestination],
  ['literal host and path without a scheme', hostPath, `http://${hostPath}`],
  ['encoded host and path without a scheme', encodeURIComponent(hostPath), `http://${hostPath}`],
  ['IPv6 host and port without a scheme', '[2001:db8::1]:8443/a%2Fb?q=a%26b',
    'http://[2001:db8::1]:8443/a%2Fb?q=a%26b'],
  ['legacy escaped byte in a literal HTTPS target', withLegacyByte, withLegacyByte],
  ['legacy escaped byte in an encoded HTTPS target', encodeURIComponent(withLegacyByte), withLegacyByte],
];

const catalogSpecs = [['public catalog fixture', catalog], ['bundled rules submodule', bundledCatalog]];
const redirectProviders = rules => Object.entries(rules.providers).filter(([, provider]) => provider.redirections?.length);
const legacyRedditPattern = String.raw`^https?:\/\/(?:[a-z0-9-]+\.)*?reddit.com`;

for (const [label, rules] of catalogSpecs) {
  test(`exercise every redirect rule in the ${label}`, { skip: rules === null && noBundledCatalog }, async t => {
    const addon = await loadAddon({ rules });

    for (const [name, provider] of redirectProviders(rules)) {
      assert.equal(wrappers[name]?.length, provider.redirections.length, `wrapper count for ${name}`);
      const matchers = provider.redirections.map(source => new RegExp(source, 'i'));

      for (const [index, matcher] of matchers.entries()) {
        const wrapper = wrappers[name][index];

        await t.test(`${name} rule ${index + 1}`, () => {
          const instance = addon.context.providers.find(candidate => candidate.getName() === name);
          // Older catalogs omit the Reddit mail hostname from the provider pattern.
          const reachable = name !== 'reddit' || index !== 1 || provider.urlPattern !== legacyRedditPattern;
          const failures = [];
          let exercised = 0;

          for (const [format, capture, expected] of targets) {
            const url = wrapper.replace('{target}', () => capture);
            // Some rules require a certain encoding or stop at raw delimiters.
            if (matcher.exec(url)?.[1] !== capture) continue;
            assert.equal(matchers.findIndex(rule => rule.exec(url)?.[1]), index, `${format}: first matching rule`);

            const ruleTarget = instance.getRedirection(url);
            const requestTarget = addon.request(url).redirectUrl;
            const cleaned = addon.clean(url);
            const matchesProvider = instance.matchURL(url);
            if (matchesProvider !== reachable || ruleTarget !== expected ||
                requestTarget !== (reachable ? expected : undefined) || cleaned !== (reachable ? expected : url)) {
              failures.push({ format, expected, matchesProvider, ruleTarget, requestTarget, cleaned });
            }
            exercised++;
          }

          assert(exercised > 0, `No representative target matched ${matcher.source}`);
          assert.deepEqual(failures, []);
        });
      }
    }
  });
}

test('the matrix accounts for redirect providers', () => {
  const availableCatalogs = catalogSpecs.filter(([, rules]) => rules !== null);
  const testedProviders = new Set(availableCatalogs.flatMap(([, rules]) => redirectProviders(rules).map(([name]) => name)));
  for (const name of testedProviders) assert(Object.hasOwn(wrappers, name), `missing wrapper for ${name}`);
  if (bundledCatalog) assert.equal(testedProviders.size, Object.keys(wrappers).length);
});
