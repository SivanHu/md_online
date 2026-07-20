import { isValidDateString } from './date.js';

const SUMMARY_STYLES = new Set(['daily_standup', 'changelog', 'release_note']);

export function asString(value, { max = 10_000, allowEmpty = true } = {}) {
  if (value == null) return allowEmpty ? '' : null;
  const s = String(value);
  if (s.length > max) {
    throw Object.assign(new Error(`Value too long (max ${max})`), { status: 400 });
  }
  return s;
}

export function asBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return fallback;
}

export function asStringArray(value, { maxItems = 100, maxLen = 500 } = {}) {
  if (value == null || value === '') return [];
  let list;
  if (Array.isArray(value)) {
    list = value.map((v) => String(v).trim()).filter(Boolean);
  } else {
    list = String(value)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (list.length > maxItems) {
    throw Object.assign(new Error(`Too many paths (max ${maxItems})`), { status: 400 });
  }
  for (const item of list) {
    if (item.length > maxLen) {
      throw Object.assign(new Error('Path filter entry too long'), { status: 400 });
    }
  }
  return list;
}

export function parseSummaryOptions(body = {}) {
  const date = body.date != null && body.date !== '' ? String(body.date).trim() : undefined;
  if (date && !isValidDateString(date) && !/^\d{4}-\d{2}-\d{2}/.test(date)) {
    throw Object.assign(new Error('date must be YYYY-MM-DD'), { status: 400 });
  }

  const style = body.style ? String(body.style) : undefined;
  if (style && !SUMMARY_STYLES.has(style)) {
    throw Object.assign(
      new Error(`style must be one of: ${[...SUMMARY_STYLES].join(', ')}`),
      { status: 400 },
    );
  }

  return {
    date,
    project: body.project != null ? asString(body.project, { max: 100 }) : undefined,
    since: body.since != null ? asString(body.since, { max: 64 }) : undefined,
    until: body.until != null ? asString(body.until, { max: 64 }) : undefined,
    baseRef: body.baseRef != null ? asString(body.baseRef, { max: 200 }) : undefined,
    headRef: body.headRef != null ? asString(body.headRef, { max: 200 }) : undefined,
    paths: asStringArray(body.paths),
    style,
    language: body.language != null ? asString(body.language, { max: 32 }) : undefined,
    save: asBoolean(body.save, false),
    outputPath: body.outputPath != null ? asString(body.outputPath, { max: 500 }) : undefined,
    customNotes: asString(body.customNotes ?? body.notes ?? '', { max: 20_000 }),
    includeWorkingTree: asBoolean(body.includeWorkingTree, true),
    useLlm: body.useLlm === undefined ? undefined : asBoolean(body.useLlm, false),
    force: asBoolean(body.force, false),
  };
}

export function parseDocWriteBody(body = {}) {
  const filePath = body.path ?? body.filePath;
  if (!filePath) {
    throw Object.assign(new Error('path is required'), { status: 400 });
  }
  if (typeof body.content !== 'string') {
    throw Object.assign(new Error('content string is required'), { status: 400 });
  }
  return {
    path: asString(filePath, { max: 500, allowEmpty: false }),
    content: body.content,
  };
}
