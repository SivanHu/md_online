import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { projectIdentity } from '../src/utils/project.js';

describe('projectIdentity', () => {
  it('normalizes project names to ids', () => {
    const p = projectIdentity('Md Online');
    assert.equal(p.name, 'Md Online');
    assert.equal(p.id, 'md-online');
  });

  it('rejects newlines and overlong names', () => {
    assert.throws(() => projectIdentity('a\nb'), (err) => err.status === 400);
  });
});
