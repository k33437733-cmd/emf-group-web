import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    // If it's a mobile screen (detected via window width or CSS media queries, but let's toggle mobileOpen)
    if (window.innerWidth <= 768) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', background: 'var(--bg-primary)' }}>
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1025,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* Sidebar - handles its own collapse / responsive states */}
      <Sidebar 
        collapsed={collapsed} 
        onToggle={toggleSidebar} 
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      
      {/* Main Content Wrapper */}
      <div 
        style={{
          flex: 1,
          marginRight: window.innerWidth > 768 ? (collapsed ? '70px' : '260px') : '0px',
          transition: 'margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        }}
        className="main-layout-content"
      >
        <Navbar onToggleSidebar={toggleSidebar} />
        <main style={{ flex: 1, padding: '24px', background: 'var(--bg-primary)' }} className="main-container">
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-layout-content {
            margin-right: 0px !important;
          }
          .main-container {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
