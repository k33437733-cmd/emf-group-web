import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToNotifications } from '../../firebase/db';
import { NotificationCenter } from '../notifications';
import { playNotificationSound } from '../../lib/notificationSound';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import type { SystemNotification } from '../../types';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Fetch Notifications — sound on new, no double-play on initial load or reconnect
  useEffect(() => {
    if (!user) return;
    const seenIds = new Set<string>();
    let isFirstBatch = true;
    let initialTimer: ReturnType<typeof setTimeout>;

    const unsub = subscribeToNotifications(user.uid, (list) => {
      setNotifications(list);

      if (isFirstBatch) {
        list.forEach(n => seenIds.add(n.id));
        clearTimeout(initialTimer);
        initialTimer = setTimeout(() => { isFirstBatch = false; }, 800);
        return;
      }

      let played = false;
      for (const n of list) {
        if (!n.read && !seenIds.has(n.id) && !played) {
          playNotificationSound();
          played = true;
        }
        seenIds.add(n.id);
      }
    });

    return () => {
      unsub();
      clearTimeout(initialTimer);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass-navbar" style={{ height: 'var(--navbar-height)', direction: 'rtl' }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none',
          fontSize: '1.6rem',
          fontWeight: 900,
          fontFamily: 'var(--font-en)',
          letterSpacing: '0.5px',
          direction: 'ltr'
        }}>
          <span style={{ color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>EMF</span>
          <span style={{ 
            background: 'var(--gradient-gold)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 15px rgba(241, 196, 15, 0.2)'
          }}>GROUP</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div style={{ display: 'none', gap: '8px' }} className="desktop-nav">
          {user && (
            <>
              <Link to="/content" className={`nav-link ${isActive('/content') ? 'active' : ''}`}>المكتبة الرقمية</Link>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>لوحة التحكم</Link>
              {isAdmin ? (
                <Link to="/chat" className={`nav-link ${isActive('/chat') ? 'active' : ''}`}>
                  الشات الداخلي
                </Link>
              ) : (
                <Link to="/support" className={`nav-link ${isActive('/support') ? 'active' : ''}`}>
                  الدعم الفني 💬
                </Link>
              )}
            </>
          )}
        </div>

        {/* User & Notifications Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              {/* Notifications bell — opens Notification Center drawer */}
              <button
                onClick={() => setNotifCenterOpen(true)}
                aria-label="مركز الإشعارات"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--accent-red)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown / Sign out */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-user desktop-badge" style={{
                  display: 'none',
                  fontSize: '0.7rem'
                }}>
                  {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }} className="desktop-username">{user.name}</span>
                <button 
                  onClick={logout}
                  title="تسجيل الخروج"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: 'var(--accent-red)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
              تسجيل الدخول
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            className="mobile-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="animate-fade" style={{
          position: 'fixed',
          top: 'var(--navbar-height)',
          right: 0,
          left: 0,
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 999,
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {user && (
            <>
              <Link to="/content" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'white', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block' }}>المكتبة الرقمية</Link>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'white', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block' }}>لوحة التحكم</Link>
              {isAdmin ? (
                <Link to="/chat" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'white', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block' }}>الشات الداخلي</Link>
              ) : (
                <Link to="/support" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'white', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block' }}>الدعم الفني 💬</Link>
              )}
            </>
          )}
        </div>
      )}

      {/* Inject custom inline styles for Responsive design */}
      <style>{`
        .nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .nav-link:hover, .nav-link.active {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
          .desktop-badge {
            display: inline-flex !important;
          }
        }
        @media (max-width: 480px) {
          .desktop-username {
            display: none !important;
          }
        }
      `}</style>

      <NotificationCenter
        isOpen={notifCenterOpen}
        onClose={() => setNotifCenterOpen(false)}
      />
    </nav>
  );
}
