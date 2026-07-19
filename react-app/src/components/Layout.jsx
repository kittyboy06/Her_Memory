import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ALL_NAV_ITEMS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut, isOwner, isViewer, role } = useAuth();
  const location = useLocation();

  // Filter nav items based on role
  const navItems = ALL_NAV_ITEMS.filter(n => isOwner || !n.ownerOnly);

  const mobileMain = navItems.filter(n => ['home','timeline','diary', ...(isOwner ? ['chat'] : [])].includes(n.id));
  const mobileMore = navItems.filter(n => !mobileMain.some(m => m.id === n.id));

  return (
    <div className="app">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="logo">
            <span>Private Diary</span> <span>🔒</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="nav-links">
          {navItems.map(item => (
            <NavLink key={item.id} to={item.path} className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>
              <span style={{fontSize:'18px'}}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="export-btn" onClick={signOut}>🚪 Sign Out</button>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <div className="mobile-nav">
        <div className="mobile-nav-items">
          {mobileMain.map(item => (
            <NavLink key={item.id} to={item.path} className={({isActive}) => `mobile-nav-item${isActive ? ' active' : ''}`}>
              <span className="mobile-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button className={`mobile-nav-item${moreOpen ? ' active' : ''}`} onClick={() => setMoreOpen(!moreOpen)}>
            <span className="mobile-nav-icon">⋯</span>
            <span>More</span>
          </button>
        </div>
        {moreOpen && (
          <div className="mobile-more-menu">
            {mobileMore.map(item => (
              <NavLink key={item.id} to={item.path} className="mobile-more-item" onClick={() => setMoreOpen(false)}>
                <span>{item.icon}</span> {item.label}
              </NavLink>
            ))}
            <button className="mobile-more-item" onClick={signOut}>🚪 Sign Out</button>
          </div>
        )}
      </div>
    </div>
  );
}
