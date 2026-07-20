/**
 * Heading slug compatible with rehype-slug-like behavior for CJK + ASCII.
 * Keep client TOC and server exports consistent.
 */
export function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
