import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalDate,
  normalizeDateInput,
  localDayBounds,
  isValidDateString,
} from '../src/utils/date.js';

describe('date utils', () => {
  it('formats local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 6, 20, 23, 30, 0); // July 20 local
    assert.equal(formatLocalDate(d), '2026-07-20');
  });

  it('keeps bare YYYY-MM-DD without UTC shift', () => {
    assert.equal(normalizeDateInput('2026-07-20'), '2026-07-20');
  });

  it('localDayBounds uses wall-clock strings', () => {
    const b = localDayBounds('2026-07-20');
    assert.equal(b.date, '2026-07-20');
    assert.equal(b.start, '2026-07-20T00:00:00');
    assert.equal(b.end, '2026-07-20T23:59:59');
  });

  it('validates calendar dates', () => {
    assert.equal(isValidDateString('2026-07-20'), true);
    assert.equal(isValidDateString('2026-02-30'), false);
    assert.equal(isValidDateString('bad'), false);
  });
});
