/**
 * Local-timezone date helpers.
 * Avoid UTC-only ISO slice which can shift "today" in non-UTC zones (e.g. China UTC+8).
 */

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Format a Date as YYYY-MM-DD in local timezone.
 */
export function formatLocalDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw Object.assign(new Error('Invalid date'), { status: 400 });
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Parse YYYY-MM-DD (or Date) into local calendar day bounds for git --since/--until.
 * Returns wall-clock strings without Z so git treats them as local time.
 */
export function localDayBounds(dateInput) {
  const date = normalizeDateInput(dateInput);
  return {
    date,
    start: `${date}T00:00:00`,
    end: `${date}T23:59:59`,
  };
}

/**
 * Accept YYYY-MM-DD, ISO datetime, or Date; return YYYY-MM-DD local calendar day.
 * Bare YYYY-MM-DD is kept as-is (not re-parsed via Date UTC).
 */
export function normalizeDateInput(dateInput) {
  if (dateInput == null || dateInput === '') {
    return formatLocalDate(new Date());
  }
  if (dateInput instanceof Date) {
    return formatLocalDate(dateInput);
  }
  const raw = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`Invalid date: ${raw}`), { status: 400 });
  }
  return formatLocalDate(parsed);
}

export function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [y, m, d] = String(value).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
