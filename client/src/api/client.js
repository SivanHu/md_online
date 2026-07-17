const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const message = data?.error || data?.message || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  config: () => request('/api/config'),
  docTree: () => request('/api/docs/tree'),
  docContent: (path) => request(`/api/docs/content?path=${encodeURIComponent(path)}`),
  saveDoc: (path, content) =>
    request('/api/docs/content', {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ path, content }),
    }),
  search: (q) => request(`/api/docs/search?q=${encodeURIComponent(q)}`),
  recent: (limit = 8) => request(`/api/docs/recent?limit=${limit}`),
  gitStatus: () => request('/api/git/status'),
  gitToday: (date) =>
    request(`/api/git/today${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  gitDiff: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/git/diff?${qs}`);
  },
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
  statsSvgUrl: (date) =>
    `/api/summary/stats.svg${date ? `?date=${encodeURIComponent(date)}` : ''}`,
};
