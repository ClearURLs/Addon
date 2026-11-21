const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../core_js/storage.js'), 'utf8');
const cachedCatalog = {
  ClearURLsData: '{"providers":{}}',
  dataHash: 'cached',
  hashStatus: 'hash_status_code_2',
};

function startWithStorage(disk) {
  return new Promise((resolve, reject) => {
    const context = vm.createContext({
      browser: {
        storage: {
          local: {
            get: async () => ({ ...disk }),
            set: async values => Object.assign(disk, values),
          },
        },
      },
      console: { log() {} },
      handleError: reject,
      isEmpty: value => Object.getOwnPropertyNames(value).length === 0,
      getBrowser: () => 'Firefox',
      translate: key => key,
      start: () => resolve(context.getData('referralMarketing')),
      changeIcon() {},
      contextMenuStart() {},
      historyListenerStart() {},
    });
    vm.runInContext(source, context, { filename: 'core_js/storage.js' });
  });
}

test('a fresh install enables referral marketing by default', async () => {
  assert.equal(await startWithStorage({}), true);
});

test('an upgrade without a saved preference uses the enabled default', async () => {
  assert.equal(await startWithStorage({ ...cachedCatalog }), true);
});

test('an explicit saved referral preference survives startup', async () => {
  for (const enabled of [false, true]) {
    const disk = { ...cachedCatalog, referralMarketing: enabled };
    assert.equal(await startWithStorage(disk), enabled);
  }
});
