import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSearch(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.search(q);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>搜索文档</h1>
        <form className="row gap" onSubmit={onSearch}>
          <input
            className="grow"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="标题或正文关键词"
            autoFocus
          />
          <button className="btn primary" disabled={loading || !q.trim()}>
            {loading ? '搜索中…' : '搜索'}
          </button>
        </form>
        {error && <div className="alert error">{error}</div>}
        <ul className="search-results">
          {results.map((item) => (
            <li key={item.path}>
              <Link to={`/docs/${item.path}`}>{item.title || item.path}</Link>
              <div className="muted small">{item.path}</div>
              {item.snippet && <div className="snippet">{item.snippet}</div>}
            </li>
          ))}
          {!loading && q && !results.length && <li className="muted">无匹配结果</li>}
        </ul>
      </div>
    </div>
  );
}
