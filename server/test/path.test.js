import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveDocsPath } from '../src/utils/path.js';
import config from '../src/config.js';

describe('resolveDocsPath', () => {
  it('resolves relative paths under docs root', () => {
    const { abs, rel } = resolveDocsPath('guide/api.md');
    assert.equal(rel, 'guide/api.md');
    assert.ok(abs.startsWith(path.resolve(config.docsRoot)));
  });

  it('blocks path traversal', () => {
    assert.throws(() => resolveDocsPath('../package.json'), (err) => err.status === 403);
    assert.throws(() => resolveDocsPath('foo/../../.env'), (err) => err.status === 403);
  });

  it('blocks null bytes', () => {
    assert.throws(() => resolveDocsPath('a\0b.md'), (err) => err.status === 400);
  });
});
