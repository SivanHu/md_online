import { useEffect, useMemo, useState } from 'react';

function collectAncestorDirs(currentPath) {
  if (!currentPath) return new Set();
  const parts = currentPath.split('/');
  const set = new Set();
  for (let i = 1; i < parts.length; i += 1) {
    set.add(parts.slice(0, i).join('/'));
  }
  return set;
}

export default function DocTree({ tree, currentPath, onSelect }) {
  const ancestors = useMemo(() => collectAncestorDirs(currentPath), [currentPath]);
  const [open, setOpen] = useState(() => new Set(ancestors));

  useEffect(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      for (const p of ancestors) next.add(p);
      return next;
    });
  }, [ancestors]);

  if (!tree?.children?.length) {
    return <div className="muted pad">暂无文档。请在 docs/ 下添加 Markdown 文件。</div>;
  }

  function toggle(path) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <ul className="doc-tree">
      {tree.children.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          currentPath={currentPath}
          onSelect={onSelect}
          open={open}
          toggle={toggle}
        />
      ))}
    </ul>
  );
}

function TreeNode({ node, currentPath, onSelect, open, toggle }) {
  if (node.type === 'dir') {
    const isOpen = open.has(node.path);
    return (
      <li className="tree-dir">
        <button
          type="button"
          className="tree-dir-label"
          onClick={() => toggle(node.path)}
          aria-expanded={isOpen}
        >
          <span className="tree-chevron">{isOpen ? '▾' : '▸'}</span>
          <span>📁 {node.name}</span>
        </button>
        {isOpen && (
          <ul>
            {node.children?.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                currentPath={currentPath}
                onSelect={onSelect}
                open={open}
                toggle={toggle}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const active = currentPath === node.path;
  return (
    <li>
      <button
        type="button"
        className={`tree-file ${active ? 'active' : ''}`}
        onClick={() => onSelect(node.path)}
        title={node.path}
      >
        📄 {node.name}
      </button>
    </li>
  );
}
