const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('the generated utilities match their recorded Core export', () => {
  const root = path.resolve(__dirname, '..');
  const source = JSON.parse(fs.readFileSync(path.join(root, 'build_tools/core-utils-source.json')));
  for (const [file, digest] of Object.entries(source.files)) {
    const bytes = fs.readFileSync(path.join(root, 'core_js/utils', file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), digest, file);
  }
});
