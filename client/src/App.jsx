import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import DocsPage from './pages/DocsPage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useEffect, useState } from 'react';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('md_online_theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('md_online_theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

export default function App() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">MD</span>
          <div>
            <div className="brand-title">md_online</div>
            <div className="brand-sub">文档库 · 每日变更总结</div>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>首页</NavLink>
          <NavLink to="/docs">文档</NavLink>
          <NavLink to="/workspace/summary">总结工作台</NavLink>
          <NavLink to="/search">搜索</NavLink>
          <NavLink to="/settings">设置</NavLink>
        </nav>
        <button
          className="btn ghost"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="切换主题"
        >
          {theme === 'dark' ? '浅色' : '深色'}
        </button>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs/*" element={<DocsPage />} />
          <Route path="/workspace/summary" element={<SummaryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
