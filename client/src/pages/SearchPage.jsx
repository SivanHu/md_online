import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

function highlight(text, query) {
  if (!query || !text) return text;
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts = [];
  let i = 0;
  while (i < text.length) {
    const found = lower.indexOf(ql, i);
    if (found === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (found > i) parts.push(text.slice(i, found));
    parts.push(
      <mark key={`${found}-${i}`} className="search-mark">
        {text.slice(found, found + q.length)}
      </mark>,
    );
    i = found + q.length;
  }
  return parts;
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);
  const reqId = useRef(0);

  async function runSearch(query) {
    const value = query.trim();
    if (!value) {
      setResults([]);
      setSearched(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.search(value);
      if (id !== reqId.current) return;
      setResults(data.results || []);
      setSearched(true);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err.message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return undefined;
    }
    timer.current = setTimeout(() => runSearch(q), 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function onSearch(e) {
    e?.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    runSearch(q);
  }

  return (
    <div className="page">
      <div className="card">
        <h1>搜索文档</h1>
        <p className="muted small">标题命中优先；输入后自动搜索，也可用 Enter。</p>
        <form className="row gap" onSubmit={onSearch}>
          <input
            className="grow"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="标题或正文关键词"
            autoFocus
          />
          <button type="submit" className="btn primary" disabled={loading || !q.trim()}>
            {loading ? '搜索中…' : '搜索'}
          </button>
        </form>
        {error && <div className="alert error">{error}</div>}
        <ul className="search-results">
          {results.map((item) => (
            <li key={item.path}>
              <Link to={`/docs/${item.path}`}>{highlight(item.title || item.path, q)}</Link>
              <div className="muted small">{highlight(item.path, q)}</div>
              {item.snippet && <div className="snippet">{highlight(item.snippet, q)}</div>}
            </li>
          ))}
          {!loading && searched && !results.length && <li className="muted">无匹配结果</li>}
        </ul>
      </div>
    </div>
  );
}
