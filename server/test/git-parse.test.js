import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumstat, parseNameStatus, matchesPathFilters } from '../src/services/git.js';

describe('git parsers', () => {
  it('parses numstat lines', () => {
    const text = ['10\t2\tserver/src/index.js', '-\t-\timage.png', ''].join('\n');
    const { files, insertions, deletions } = parseNumstat(text);
    assert.equal(files.length, 2);
    assert.equal(insertions, 10);
    assert.equal(deletions, 2);
    assert.equal(files[1].binary, true);
  });

  it('parses name-status including renames', () => {
    const text = ['M\ta.js', 'R100\told.js\tnew.js'].join('\n');
    const map = parseNameStatus(text);
    assert.equal(map.get('a.js'), 'M');
    assert.equal(map.get('new.js'), 'R100');
  });

  it('matches path filters by prefix', () => {
    assert.equal(matchesPathFilters('server/src/a.js', ['server']), true);
    assert.equal(matchesPathFilters('client/src/a.js', ['server']), false);
    assert.equal(matchesPathFilters('server/src/a.js', []), true);
  });
});
