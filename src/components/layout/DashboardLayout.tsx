import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(s => !s)} />
      <div style={{
        flex: 1,
        marginRight: collapsed ? '60px' : '250px',
        transition: 'margin-right 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <Navbar />
        <main style={{ flex: 1, padding: '24px', background: '#0a0f1a' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
