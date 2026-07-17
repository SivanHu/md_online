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

  useEffect(() => {
    api.docTree()
      .then(setTree)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!currentPath) {
      setDoc(null);
      return;
    }
    setLoading(true);
    setError('');
    api.docContent(currentPath)
      .then(setDoc)
      .catch((e) => {
        setDoc(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [currentPath]);

  function onSelect(path) {
    navigate(`/docs/${path}`);
  }

  return (
    <div className="docs-layout">
      <aside className="sidebar card flat">
        <div className="sidebar-title">文档目录</div>
        <DocTree tree={tree} currentPath={currentPath} onSelect={onSelect} />
      </aside>
      <section className="doc-main card flat">
        {error && <div className="alert error">{error}</div>}
        {!currentPath && !error && (
          <div className="empty">
            <h2>选择一篇文档</h2>
            <p className="muted">从左侧目录打开 Markdown 文件。支持 GFM、代码高亮与 Mermaid 图。</p>
          </div>
        )}
        {loading && <div className="muted pad">加载中…</div>}
        {doc && !loading && (
          <>
            <div className="doc-meta">
              <div>
                <div className="doc-path">{doc.path}</div>
                {doc.frontmatter?.title && <h1 className="doc-title">{doc.frontmatter.title}</h1>}
              </div>
              <div className="muted small">
                更新于 {new Date(doc.stats.mtime).toLocaleString()}
              </div>
            </div>
            <MarkdownView content={doc.content} />
          </>
        )}
      </section>
    </div>
  );
}
