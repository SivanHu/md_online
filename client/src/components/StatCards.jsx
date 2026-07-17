export default function StatCards({ stats }) {
  const items = [
    { label: '文件', value: stats?.filesChanged ?? 0 },
    { label: '新增行', value: stats?.insertions ?? 0, tone: 'plus' },
    { label: '删除行', value: stats?.deletions ?? 0, tone: 'minus' },
    { label: 'Commits', value: stats?.commits ?? 0 },
  ];
  return (
    <div className="stat-grid">
      {items.map((item) => (
        <div key={item.label} className={`stat-card ${item.tone || ''}`}>
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
