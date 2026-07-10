import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const SIDEBAR_STORAGE_KEY = 'emf_sidebar_collapsed';

function getInitialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {}
  return false;
}

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768 && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen(s => !s);
    } else {
      setCollapsed(s => !s);
    }
  }, [isMobile]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(s => !s)}
        mobileOpen={isMobile ? mobileOpen : undefined}
        onMobileClose={closeMobile}
      />
      <div style={{
        flex: 1,
        minWidth: 0,
        marginRight: 'var(--sidebar-collapsed-width)',
        transition: 'margin-right 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <Navbar onToggleSidebar={toggleSidebar} />
        <main role="main" aria-label="المحتوى الرئيسي" style={{
          flex: 1,
          background: 'var(--bg-primary)',
          width: '100%',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          div[style*="margin-right"] {
            margin-right: ${collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'} !important;
          }
        }
        @media (max-width: 767px) {
          div[style*="margin-right"] {
            margin-right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
