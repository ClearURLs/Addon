const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../core_js/log.js'), 'utf8');

async function renderLog({ uiLanguage, fetchImpl }) {
  const dataTableOptions = [];
  const fetchCalls = [];
  const warnings = [];
  const context = vm.createContext({
    browser: {
      downloads: { download: async () => {} },
      i18n: {
        getMessage: key => key,
        getUILanguage: () => uiLanguage,
      },
      runtime: {
        getURL: value => `moz-extension://test/${value.replace(/^\.\//, '')}`,
        sendMessage: () => new Promise(() => {}),
      },
    },
    console: {
      log() {},
      warn: (...args) => warnings.push(args),
    },
    document: {
      getElementById: () => ({ setAttribute() {} }),
    },
    fetch: (...args) => {
      fetchCalls.push(args);
      return fetchImpl(...args);
    },
    location: { reload() {} },
    $: () => ({
      DataTable(options) {
        dataTableOptions.push(options);
        return {
          order() { return this; },
          draw() {},
        };
      },
    }),
  });

  vm.runInContext(source, context, { filename: 'core_js/log.js' });
  context.browser.runtime.sendMessage = async () => ({ response: { log: [] } });
  await context.getLog();

  assert.equal(dataTableOptions.length, 1, 'the log table is initialized');
  return { options: dataTableOptions[0], fetchCalls, warnings };
}

test('English uses the built-in defaults without fetching a language file', async () => {
  const { options, fetchCalls } = await renderLog({
    uiLanguage: 'en-US',
    fetchImpl: async () => { throw new Error('English must not be fetched'); },
  });

  assert.equal(fetchCalls.length, 0);
  assert.equal(Object.keys(options.language).length, 0);
});

test('an available UI translation is loaded and passed to DataTables', async () => {
  const { options, fetchCalls, warnings } = await renderLog({
    uiLanguage: 'de-DE',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ emptyTable: 'Keine Daten' }),
    }),
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][0], 'moz-extension://test/external_js/dataTables/i18n/de.json');
  assert.equal(options.language.emptyTable, 'Keine Daten');
  assert.equal(warnings.length, 0);
});

const failures = [
  ['a missing translation', async () => ({ ok: false, status: 404 })],
  ['invalid JSON', async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new SyntaxError('invalid JSON'); },
  })],
  ['a network failure', async () => { throw new Error('offline'); }],
];

for (const [name, fetchImpl] of failures) {
  test(`DataTables falls back to English after ${name}`, async () => {
    const { options, warnings } = await renderLog({ uiLanguage: 'xx-XX', fetchImpl });

    assert.equal(Object.keys(options.language).length, 0);
    assert.equal(options.language.url, undefined);
    assert.equal(warnings.length, 1);
  });
}
