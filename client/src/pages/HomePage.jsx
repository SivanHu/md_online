import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatCards from '../components/StatCards.jsx';

export default function HomePage() {
  const [recent, setRecent] = useState([]);
  const [today, setToday] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.recent(8), api.gitToday(), api.config()])
      .then(([r, t, c]) => {
        setRecent(r.items || []);
        setToday(t);
        setConfig(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  const todayPath = `daily/${new Date().toISOString().slice(0, 10)}.md`;
  const hasTodaySummary = recent.some((item) => item.path === todayPath || item.path.endsWith(`/${todayPath}`));

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <h1>Markdown 知识库 + 每日变更工作台</h1>
          <p className="lead">
            在线阅读项目文档，并在 Codex 改完代码后一键生成、预览、归档每日修改总结。
          </p>
          <div className="row gap">
            <Link className="btn primary" to="/docs">浏览文档</Link>
            <Link className="btn" to="/workspace/summary">生成今日总结</Link>
            <Link className="btn ghost" to="/search">搜索</Link>
          </div>
        </div>
        <div className="hero-meta">
          <div className="pill">{config?.llmEnabled ? `LLM · ${config.llmModel}` : '模板模式 · 无需 API Key'}</div>
          <div className="pill">docs · {config?.docsRoot || 'docs'}</div>
          <div className="pill">{hasTodaySummary ? '今日总结已存在' : '今日总结未生成'}</div>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>今日变更速览</h2>
            <Link to="/workspace/summary">打开工作台 →</Link>
          </div>
          {today ? (
            <>
              <StatCards stats={today.stats} />
              <div className="muted small" style={{ marginTop: 12 }}>
                分支相关 commits：{today.commits?.length || 0} · 工作区变更已计入
              </div>
              <ul className="file-list compact">
                {(today.files || []).slice(0, 8).map((f) => (
                  <li key={f.path}>
                    <code>{f.path}</code>
                    <span className="muted">+{f.insertions}/-{f.deletions}</span>
                  </li>
                ))}
                {!today.files?.length && <li className="muted">暂无文件变更</li>}
              </ul>
            </>
          ) : (
            <div className="muted">加载中…</div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>最近文档</h2>
            <Link to="/docs">全部文档 →</Link>
          </div>
          <ul className="recent-list">
            {recent.map((item) => (
              <li key={item.path}>
                <Link to={`/docs/${item.path}`}>{item.title || item.path}</Link>
                <span className="muted small">{new Date(item.mtime).toLocaleString()}</span>
              </li>
            ))}
            {!recent.length && <li className="muted">暂无文档</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
