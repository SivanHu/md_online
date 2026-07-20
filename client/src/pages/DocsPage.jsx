import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import DocTree from '../components/DocTree.jsx';
import MarkdownView from '../components/MarkdownView.jsx';

function pathFromLocation(pathname) {
  const prefix = '/docs/';
  if (!pathname.startsWith(prefix)) return '';
  return decodeURIComponent(pathname.slice(prefix.length));
}

export default function DocsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = pathFromLocation(location.pathname);

  const [tree, setTree] = useState(null);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [allowWrite, setAllowWrite] = useState(true);

  useEffect(() => {
    api.config().then((c) => setAllowWrite(Boolean(c.allowWrite))).catch(() => {});
  }, []);

  function refreshTree() {
    return api.docTree().then(setTree).catch((e) => setError(e.message));
  }

  useEffect(() => {
    refreshTree();
  }, []);

  useEffect(() => {
    if (!currentPath) {
      setDoc(null);
      setEditing(false);
      setDraft('');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    setEditing(false);
    api.docContent(currentPath)
      .then((d) => {
        setDoc(d);
        setDraft(d.raw || d.content || '');
      })
      .catch((e) => {
        setDoc(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [currentPath]);

  function onSelect(path) {
    navigate(`/docs/${path}`);
  }

  async function saveDoc() {
    if (!currentPath || !allowWrite) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.saveDoc(currentPath, draft);
      const refreshed = await api.docContent(currentPath);
      setDoc(refreshed);
      setDraft(refreshed.raw || refreshed.content || '');
      setEditing(false);
      setMessage('已保存');
      refreshTree();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDraft(doc?.raw || doc?.content || '');
    setEditing(false);
    setMessage('');
  }

  return (
    <div className="docs-layout">
      <aside className="sidebar card flat">
        <div className="sidebar-title">文档目录</div>
        <DocTree tree={tree} currentPath={currentPath} onSelect={onSelect} />
      </aside>
      <section className="doc-main card flat">
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert ok">{message}</div>}
        {!currentPath && !error && (
          <div className="empty">
            <h2>选择一篇文档</h2>
            <p className="muted">从左侧目录打开 Markdown 文件。支持 GFM、代码高亮与 Mermaid 图，也可在线编辑保存。</p>
          </div>
        )}
        {loading && <div className="muted pad">加载中…</div>}
        {doc && !loading && (
          <>
            <div className="doc-meta">
              <div>
                <div className="doc-path">{doc.path}</div>
                {doc.frontmatter?.title && !editing && (
                  <h1 className="doc-title">{doc.frontmatter.title}</h1>
                )}
              </div>
              <div className="doc-actions">
                <div className="muted small">
                  更新于 {new Date(doc.stats.mtime).toLocaleString()}
                </div>
                {allowWrite && !editing && (
                  <button type="button" className="btn" onClick={() => setEditing(true)}>
                    编辑
                  </button>
                )}
                {editing && (
                  <div className="row gap">
                    <button type="button" className="btn primary" disabled={saving} onClick={saveDoc}>
                      {saving ? '保存中…' : '保存'}
                    </button>
                    <button type="button" className="btn ghost" disabled={saving} onClick={cancelEdit}>
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
            {editing ? (
              <div className="doc-editor-layout">
                <textarea
                  className="doc-editor"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  spellCheck={false}
                />
                <div className="preview-box compact">
                  <h3>预览</h3>
                  <MarkdownView content={draft.replace(/^---[\s\S]*?---\s*/, '')} showToc={false} />
                </div>
              </div>
            ) : (
              <MarkdownView content={doc.content} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
