import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToSupportConversations } from '../../firebase/support';
import NotificationPopup, { emitSupportNotification } from '../support/NotificationPopup';

const SIDEBAR_STORAGE_KEY = 'emf_sidebar_collapsed';

function getInitialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {}
  return false;
}

export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const { rtl } = useI18n();
  const location = useLocation();
  const prevRef = useRef<Map<string, string>>(new Map());
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));

  const useOverlay = isMobile || (isTablet && mobileOpen);
  const sidebarMargin = !isMobile ? (collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)') : '0';
  const marginProp = rtl ? 'marginRight' : 'marginLeft';

  // Global notification listener for support messages
  useEffect(() => {
    if (!isAdmin || !user) return;
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    const unsub = subscribeToSupportConversations(user.uid, true, (convs) => {
      convs.forEach(c => {
        const prev = prevRef.current.get(c.id);
        const curr = c.lastMessageTime;
        if (c.lastMessageSenderId !== user.uid && prev && prev !== curr) {
          const customer = c.name || 'مستخدم';
          emitSupportNotification({ id: c.id, customerName: customer, body: c.lastMessage || 'رسالة جديدة', conversationId: c.id });
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const n = new Notification(customer, { body: c.lastMessage || 'رسالة جديدة', icon: '/favicon.ico' });
            n.onclick = () => { window.focus(); window.location.href = '/support'; };
          }
        }
        prevRef.current.set(c.id, curr);
      });
    });
    return () => unsub();
  }, [isAdmin, user]);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      if (w >= 768 && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
  }, [location.pathname]);

  const toggleSidebar = useCallback(() => {
    if (isMobile || isTablet) setMobileOpen(s => !s);
    else setCollapsed(s => !s);
  }, [isMobile, isTablet]);

  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: rtl ? 'rtl' : 'ltr' }}>
      <Sidebar
        collapsed={isTablet ? true : collapsed}
        onToggle={() => setCollapsed(s => !s)}
        mobileOpen={useOverlay ? mobileOpen : undefined}
        onMobileClose={closeSidebar}
      />
      <div className="main-layout-container" style={{
        flex: 1, minWidth: 0,
        [marginProp]: sidebarMargin,
        transition: 'margin-right 250ms cubic-bezier(0.16, 1, 0.3, 1), margin-left 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        <Navbar onToggleSidebar={toggleSidebar} />
        <main role="main" aria-label="المحتوى الرئيسي" style={{
          flex: 1, background: 'var(--bg-primary)', width: '100%', overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
      <NotificationPopup />
      <style>{`
        @media (max-width: 767px) {
          .main-layout-container { margin-right: 0 !important; margin-left: 0 !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .main-layout-container { margin-right: var(--sidebar-collapsed-width) !important; margin-left: 0 !important; }
          [dir="ltr"] .main-layout-container { margin-left: var(--sidebar-collapsed-width) !important; margin-right: 0 !important; }
        }
      `}</style>
    </div>
  );
}
