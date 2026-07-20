import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSummaryOptions, asStringArray } from '../src/utils/validate.js';

describe('validate', () => {
  it('parses summary options with defaults', () => {
    const opts = parseSummaryOptions({
      project: 'md_online',
      save: true,
      paths: 'server,client',
      style: 'daily_standup',
    });
    assert.equal(opts.project, 'md_online');
    assert.equal(opts.save, true);
    assert.deepEqual(opts.paths, ['server', 'client']);
    assert.equal(opts.force, false);
  });

  it('rejects invalid style', () => {
    assert.throws(
      () => parseSummaryOptions({ style: 'nope' }),
      (err) => err.status === 400,
    );
  });

  it('parses path arrays', () => {
    assert.deepEqual(asStringArray(['a', 'b']), ['a', 'b']);
    assert.deepEqual(asStringArray('a, b'), ['a', 'b']);
  });
});
