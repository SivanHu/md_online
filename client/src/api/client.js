import { authHeaders } from '../utils/auth.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(url, options = {}) {
  const headers = {
    ...authHeaders(),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const message = data?.error || data?.message || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  health: () => request('/api/health'),
  config: () => request('/api/config'),
  docTree: () => request('/api/docs/tree'),
  docContent: (path) => request(`/api/docs/content${qs({ path })}`),
  docExists: (path) => request(`/api/docs/exists${qs({ path })}`),
  saveDoc: (path, content) =>
    request('/api/docs/content', {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ path, content }),
    }),
  search: (q, limit) => request(`/api/docs/search${qs({ q, limit })}`),
  recent: (limit = 8) => request(`/api/docs/recent${qs({ limit })}`),
  gitStatus: () => request('/api/git/status'),
  gitToday: (params = {}) =>
    request(`/api/git/today${qs(typeof params === 'string' ? { date: params } : params)}`),
  gitDiff: (params = {}) => request(`/api/git/diff${qs(params)}`),
  summaryDaily: (body) =>
    request('/api/summary/daily', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }),
  summaryPreview: (body) =>
    request('/api/summary/preview', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }),
  summarySave: (path, content) =>
    request('/api/summary/save', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ path, content }),
    }),
  statsSvgUrl: (params = {}) => {
    const query = typeof params === 'string' ? { date: params } : params;
    // Bust cache when filters change
    return `/api/summary/stats.svg${qs({ ...query, _t: Date.now() })}`;
  },
};
