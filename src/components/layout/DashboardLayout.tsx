import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  };

  // Close mobile sidebar on route change
  const sidebarW = collapsed ? 'var(--sidebar-w-sm)' : 'var(--sidebar-w)';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', background: 'var(--bg-app)' }}>

      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(4, 8, 16, 0.70)',
            backdropFilter: 'blur(4px)',
            zIndex:         1025,
          }}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content */}
      <div
        className="main-layout-area"
        style={{
          flex:       1,
          marginRight: sidebarW,
          transition: 'margin-right 0.3s var(--ease-spring)',
          display:    'flex',
          flexDirection: 'column',
          minHeight:  '100vh',
          minWidth:   0,
        }}
      >
        <Navbar onToggleSidebar={toggleSidebar} />

        <main
          key={location.pathname}
          className="main-content-area anim-fade-up"
          style={{
            flex:       1,
            padding:    '24px',
            background: 'var(--bg-app)',
            minWidth:   0,
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Collapsed sidebar expand button — visible on desktop */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="sidebar-expand-fab"
          title="توسيع القائمة"
          style={{
            position:   'fixed',
            right:      'calc(var(--sidebar-w-sm) - 12px)',
            top:        '50%',
            transform:  'translateY(-50%)',
            width:      24,
            height:     48,
            borderRadius: '0 8px 8px 0',
            background: 'rgba(255,255,255,0.06)',
            border:     '1px solid var(--border-2)',
            borderRight:'none',
            color:      'var(--text-3)',
            cursor:     'pointer',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex:     1029,
            transition: 'all 0.2s',
          }}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <path d="M7 2L2 7L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <style>{`
        .sidebar-expand-fab:hover { background: rgba(255,255,255,0.10) !important; color: var(--text-1) !important; }
        @media (max-width: 768px) {
          .main-layout-area { margin-right: 0 !important; }
          .main-content-area { padding: 16px !important; }
          .sidebar-expand-fab { display: none !important; }
        }
      `}</style>
    </div>
  );
}
