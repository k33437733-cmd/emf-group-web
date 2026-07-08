import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu, X, Bell, LogOut } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase/db';
import type { SystemNotification } from '../../types';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Fetch Notifications
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [user]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const handleNotifClick = async (notif: SystemNotification) => {
    await markNotificationAsRead(notif.id);
    setNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

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
              {isAdmin && (
                <>
                  <Link to="/chat" className={`nav-link ${isActive('/chat') ? 'active' : ''}`}>
                    الشات الداخلي
                  </Link>
                  <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                    المشاريع
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* User & Notifications Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              {/* Notifications bell */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button 
                  onClick={() => setNotifOpen(!notifOpen)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative'
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
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifOpen && (
                  <div className="animate-scale" style={{
                    position: 'absolute',
                    top: '48px',
                    left: '0',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: '12px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 16px 10px',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>الإشعارات ({unreadCount})</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-blue)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          قراءة الكل
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          لا توجد إشعارات حالياً
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id}
                            onClick={() => handleNotifClick(notif)}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                              cursor: 'pointer',
                              background: notif.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              textAlign: 'right'
                            }}
                            className="notif-item"
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: notif.read ? '600' : '700', color: notif.read ? 'var(--text-primary)' : 'white' }}>
                              {notif.title}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {notif.body}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {new Date(notif.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

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
              {isAdmin && (
                <>
                  <Link to="/chat" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'white', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block' }}>الشات الداخلي</Link>
                  <Link to="/projects" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'white', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block' }}>المشاريع</Link>
                </>
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
        .notif-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
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
    </nav>
  );
}
