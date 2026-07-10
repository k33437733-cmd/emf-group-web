import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen(s => !s);
    } else {
      setCollapsed(s => !s);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(s => !s)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div style={{
        flex: 1,
        marginRight: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        transition: 'margin-right var(--transition-slow)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <Navbar onToggleSidebar={toggleSidebar} />
        <main style={{
          flex: 1,
          padding: 'var(--space-8)',
          background: 'var(--bg-primary)',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
