import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import mermaid from 'mermaid';

function ensureMermaid(theme) {
  const mTheme = theme === 'light' ? 'default' : 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: mTheme,
    securityLevel: 'loose',
    fontFamily: 'IBM Plex Sans, sans-serif',
  });
}

function MermaidBlock({ code, theme }) {
  const ref = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!ref.current) return;
      try {
        ensureMermaid(theme);
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          ref.current.innerHTML = svg;
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Mermaid render failed');
          ref.current.innerHTML = '';
        }
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <pre className="mermaid-error">
        <code>{code}</code>
        <div className="error-text">{error}</div>
      </pre>
    );
  }
  return <div className="mermaid-block" ref={ref} />;
}

function extractToc(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const m = /^(#{1,4})\s+(.+)$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/#+\s*$/, '').trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
      .replace(/\s+/g, '-');
    items.push({ level: m[1].length, text, id });
  }
  return items;
}

function getNodeText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (node.props?.children) return getNodeText(node.props.children);
  return '';
}

export default function MarkdownView({ content, showToc = true }) {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const toc = useMemo(() => extractToc(content), [content]);

  const components = useMemo(
    () => ({
      pre({ children }) {
        const child = Array.isArray(children) ? children[0] : children;
        const className = child?.props?.className || '';
        const match = /language-(\w+)/.exec(className);
        const lang = match?.[1];
        const text = getNodeText(child).replace(/\n$/, '');
        if (lang === 'mermaid') {
          return <MermaidBlock code={text} theme={theme} />;
        }
        return <pre>{children}</pre>;
      },
      a({ href, children, ...props }) {
        const external = href?.startsWith('http');
        return (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            {...props}
          >
            {children}
          </a>
        );
      },
    }),
    [theme],
  );

  return (
    <div className={`markdown-layout ${showToc ? 'with-toc' : ''}`}>
      <article className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, rehypeHighlight]}
          components={components}
        >
          {content || ''}
        </ReactMarkdown>
      </article>
      {showToc && toc.length > 0 && (
        <aside className="toc">
          <div className="toc-title">大纲</div>
          <ul>
            {toc.map((item) => (
              <li key={`${item.id}-${item.text}`} style={{ paddingLeft: (item.level - 1) * 10 }}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
