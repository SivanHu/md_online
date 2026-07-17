import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.config(), api.health()])
      .then(([c, h]) => {
        setConfig(c);
        setHealth(h);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="card">
        <h1>设置与运行状态</h1>
        <p className="muted">
          配置通过项目根目录 <code>.env</code> 管理（参考 <code>.env.example</code>）。修改后需重启服务端。
        </p>
        {error && <div className="alert error">{error}</div>}
        {config && (
          <table className="kv-table">
            <tbody>
              <tr><th>文档根目录</th><td><code>{config.docsRoot}</code></td></tr>
              <tr><th>日报目录</th><td><code>{config.dailyDir}</code></td></tr>
              <tr><th>Git 仓库</th><td><code>{config.gitRepoPath}</code></td></tr>
              <tr><th>允许写入</th><td>{config.allowWrite ? '是' : '否'}</td></tr>
              <tr><th>LLM</th><td>{config.llmEnabled ? `启用 · ${config.llmModel}` : '关闭（模板模式）'}</td></tr>
              <tr><th>默认语言</th><td>{config.summaryLanguage}</td></tr>
              <tr><th>默认风格</th><td>{config.summaryStyle}</td></tr>
              <tr><th>鉴权</th><td>{config.authRequired ? '已启用 Token' : '本地免鉴权'}</td></tr>
              <tr><th>服务时间</th><td>{health?.time || '-'}</td></tr>
            </tbody>
          </table>
        )}

        <h2>常用 API</h2>
        <ul className="api-list">
          <li><code>GET /api/health</code></li>
          <li><code>GET /api/docs/tree</code></li>
          <li><code>GET /api/docs/content?path=</code></li>
          <li><code>GET /api/git/today</code></li>
          <li><code>POST /api/summary/daily</code></li>
          <li><code>GET /api/summary/stats.svg</code></li>
        </ul>
      </div>
    </div>
  );
}
