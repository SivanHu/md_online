export default function DocTree({ tree, currentPath, onSelect }) {
  if (!tree?.children?.length) {
    return <div className="muted pad">暂无文档。请在 docs/ 下添加 Markdown 文件。</div>;
  }

  return (
    <ul className="doc-tree">
      {tree.children.map((node) => (
        <TreeNode key={node.path} node={node} currentPath={currentPath} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function TreeNode({ node, currentPath, onSelect }) {
  if (node.type === 'dir') {
    return (
      <li className="tree-dir">
        <div className="tree-dir-label">📁 {node.name}</div>
        <ul>
          {node.children?.map((child) => (
            <TreeNode key={child.path} node={child} currentPath={currentPath} onSelect={onSelect} />
          ))}
        </ul>
      </li>
    );
  }

  const active = currentPath === node.path;
  return (
    <li>
      <button
        className={`tree-file ${active ? 'active' : ''}`}
        onClick={() => onSelect(node.path)}
        title={node.path}
      >
        📄 {node.name}
      </button>
    </li>
  );
}
