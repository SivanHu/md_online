import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatCards from '../components/StatCards.jsx';
import MarkdownView from '../components/MarkdownView.jsx';
import { formatLocalDate } from '../utils/date.js';

function projectId(value) {
  return String(value || 'project')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

export default function SummaryPage() {
  const [date, setDate] = useState(formatLocalDate());
  const [project, setProject] = useState('');
  const [style, setStyle] = useState('daily_standup');
  const [language, setLanguage] = useState('zh-CN');
  const [customNotes, setCustomNotes] = useState('');
  const [baseRef, setBaseRef] = useState('');
  const [pathsText, setPathsText] = useState('');
  const [includeWorkingTree, setIncludeWorkingTree] = useState(true);
  const [useLlm, setUseLlm] = useState(false);
  const [outputPath, setOutputPath] = useState('');
  const [changes, setChanges] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [exists, setExists] = useState(false);
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark',
  );

  const paths = useMemo(
    () => pathsText.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean),
    [pathsText],
  );

  useEffect(() => {
    api.config().then((c) => {
      setConfig(c);
      setUseLlm(Boolean(c.llmEnabled));
      setLanguage(c.summaryLanguage || 'zh-CN');
      setStyle(c.summaryStyle || 'daily_standup');
      setProject(c.defaultProject || 'project');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      setTheme(el.getAttribute('data-theme') || 'dark');
    });
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (project) setOutputPath(`projects/${projectId(project)}/daily/${date}.md`);
  }, [date, project]);

  useEffect(() => {
    if (!outputPath) {
      setExists(false);
      return;
    }
    api.docExists(outputPath)
      .then((r) => setExists(Boolean(r.exists)))
      .catch(() => setExists(false));
  }, [outputPath]);

  useEffect(() => {
    setError('');
    const params = {
      date,
      includeWorkingTree,
      baseRef: baseRef || undefined,
      paths: paths.length ? paths.join(',') : undefined,
    };
    api.gitToday(params)
      .then(setChanges)
      .catch((e) => setError(e.message));
  }, [date, includeWorkingTree, baseRef, pathsText]);

  const statsImg = useMemo(
    () => api.statsSvgUrl({
      date,
      includeWorkingTree,
      baseRef: baseRef || undefined,
      paths: paths.length ? paths.join(',') : undefined,
      theme,
    }),
    [date, includeWorkingTree, baseRef, pathsText, theme],
  );

  async function generate(save = false, force = false) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (save && exists && !force) {
        const ok = window.confirm(
          `目标文件已存在：\n${outputPath}\n\n是否覆盖保存？`,
        );
        if (!ok) {
          setLoading(false);
          return;
        }
        force = true;
      }

      const body = {
        date,
        project,
        style,
        language,
        customNotes,
        includeWorkingTree,
        useLlm,
        save,
        force,
        outputPath: outputPath || undefined,
        baseRef: baseRef || undefined,
        paths: paths.length ? paths : undefined,
      };
      const result = await api.summaryDaily(body);
      setMarkdown(result.summaryMarkdown || '');
      setMeta(result);
      setChanges({
        stats: result.stats,
        files: result.files,
        commits: result.commits,
        truncated: result.truncated,
      });
      if (result.savedPath) setExists(true);

      let msg = save
        ? `已保存到 ${result.savedPath}`
        : `已生成（模式：${result.mode}）`;
      if (result.mode === 'template_fallback' && result.fallbackReason) {
        msg += ` · LLM 失败已回退：${result.fallbackReason}`;
      }
      setMessage(msg);
    } catch (e) {
      if (e.status === 409) {
        const ok = window.confirm(`${e.message}\n\n是否强制覆盖？`);
        if (ok) {
          setLoading(false);
          return generate(true, true);
        }
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveEdited() {
    if (!markdown.trim()) return;
    const path = outputPath || `projects/${projectId(project)}/daily/${date}.md`;
    if (exists) {
      const ok = window.confirm(`目标文件已存在：\n${path}\n\n是否覆盖保存当前编辑？`);
      if (!ok) return;
    }
    setSaving(true);
    setError('');
    try {
      await api.summarySave(path, markdown);
      setExists(true);
      setMessage(`已保存到 ${path}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page summary-page">
      <div className="card">
        <div className="card-head">
          <h1>每日修改总结工作台</h1>
          <span className="muted small">基于 Git 变更生成 MD，可预览后归档到 docs</span>
        </div>

        <div className="form-grid">
          <label>
            日期
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            项目
            <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="例如 md_online" />
          </label>
          <label>
            风格
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="daily_standup">站会日报</option>
              <option value="changelog">Changelog</option>
              <option value="release_note">发布说明</option>
            </select>
          </label>
          <label>
            语言
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <label>
            baseRef（可选，如 main 或 HEAD~10）
            <input
              placeholder="留空则按日期 + 工作区"
              value={baseRef}
              onChange={(e) => setBaseRef(e.target.value)}
            />
          </label>
          <label>
            路径过滤（可选，逗号分隔）
            <input
              placeholder="例如 server,client/src"
              value={pathsText}
              onChange={(e) => setPathsText(e.target.value)}
            />
          </label>
          <label>
            输出路径（相对 docs）
            <input value={outputPath} onChange={(e) => setOutputPath(e.target.value)} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeWorkingTree}
              onChange={(e) => setIncludeWorkingTree(e.target.checked)}
            />
            包含工作区未提交变更
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={useLlm}
              disabled={!config?.llmEnabled}
              onChange={(e) => setUseLlm(e.target.checked)}
            />
            使用 LLM{!config?.llmEnabled ? '（未配置 API Key）' : ''}
          </label>
        </div>

        {exists && (
          <div className="alert warn">
            目标文件已存在：<code>{outputPath}</code>。生成并保存时会提示确认覆盖。
          </div>
        )}

        <label className="block">
          备注（会写入总结）
          <textarea
            rows={3}
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="例如：今日重点修复了鉴权问题，明天继续补测试"
          />
        </label>

        <div className="row gap">
          <button type="button" className="btn primary" disabled={loading} onClick={() => generate(false)}>
            {loading ? '生成中…' : '生成预览'}
          </button>
          <button type="button" className="btn" disabled={loading} onClick={() => generate(true)}>
            生成并保存
          </button>
          <button type="button" className="btn ghost" disabled={saving || !markdown} onClick={saveEdited}>
            {saving ? '保存中…' : '保存当前编辑'}
          </button>
          {meta?.savedPath && (
            <Link className="btn ghost" to={`/docs/${meta.savedPath}`}>
              打开已保存文档
            </Link>
          )}
        </div>

        {message && <div className="alert ok">{message}</div>}
        {error && <div className="alert error">{error}</div>}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>变更统计</h2>
          </div>
          <StatCards stats={changes?.stats} />
          <div className="stats-image-wrap">
            <img src={statsImg} alt="变更统计图" />
          </div>
          <h3>文件</h3>
          <ul className="file-list">
            {(changes?.files || []).map((f) => (
              <li key={f.path}>
                <code>{f.path}</code>
                <span className="muted">{f.status || 'M'} · +{f.insertions}/-{f.deletions}</span>
              </li>
            ))}
            {!changes?.files?.length && <li className="muted">无变更文件</li>}
          </ul>
          <h3>Commits</h3>
          <ul className="file-list">
            {(changes?.commits || []).map((c) => (
              <li key={c.hash || c.shortHash}>
                <code>{c.shortHash || c.hash?.slice(0, 7)}</code>
                <span>{c.message}</span>
              </li>
            ))}
            {!changes?.commits?.length && <li className="muted">无 commit</li>}
          </ul>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>总结预览 / 编辑</h2>
          </div>
          <textarea
            className="summary-editor"
            rows={18}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="点击「生成预览」后在此编辑 Markdown"
          />
          {markdown && (
            <div className="preview-box">
              <h3>渲染预览</h3>
              <MarkdownView content={markdown} showToc={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
