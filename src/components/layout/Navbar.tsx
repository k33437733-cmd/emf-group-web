import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { Bell, LogOut, Sun, Moon, Menu, Search, Settings, User, ChevronDown } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase/db';
import type { SystemNotification } from '../../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
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
    if (notif.link) navigate(notif.link);
  };

  const pageTitle = (() => {
    switch (location.pathname) {
      case '/dashboard': return 'لوحة التحكم';
      case '/content': return 'المكتبة الرقمية';
      case '/chat': return 'الشات الداخلي';
      case '/support': return 'الدعم الفني';
      case '/projects': return 'المشاريع';
      default: return 'لوحة التحكم';
    }
  })();

  const sharedMenuStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: 'var(--space-2)',
    zIndex: 1050,
  };

  return (
    <header style={{
      height: 'var(--navbar-height)',
      background: 'var(--navbar-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-6)',
      direction: 'rtl',
      position: 'sticky',
      top: 0,
      zIndex: 1020,
      transition: 'background var(--transition-base)',
    }}>
      {/* Right side: menu + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            padding: 'var(--space-2)', display: 'flex', borderRadius: 'var(--radius-md)',
            transition: 'var(--transition-base)',
          }}
          className="navbar-icon-btn"
        >
          <Menu size={20} />
        </button>
        <h1 style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}>{pageTitle}</h1>
      </div>

      {/* Left side: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {/* Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            padding: 'var(--space-2)', display: 'flex', borderRadius: 'var(--radius-md)',
            transition: 'var(--transition-base)',
          }}
          className="navbar-icon-btn"
        >
          <Search size={19} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            padding: 'var(--space-2)', display: 'flex', borderRadius: 'var(--radius-md)',
            transition: 'var(--transition-base)',
          }}
          className="navbar-icon-btn"
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              padding: 'var(--space-2)', display: 'flex', borderRadius: 'var(--radius-md)',
              position: 'relative', transition: 'var(--transition-base)',
            }}
            className="navbar-icon-btn"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', left: '2px',
                background: 'var(--accent-red)', color: 'white',
                borderRadius: '50%', width: '16px', height: '16px',
                fontSize: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 'bold',
                boxShadow: '0 0 0 2px var(--navbar-bg)',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              ...sharedMenuStyle,
              position: 'absolute', top: '48px', left: '0',
              width: '360px', maxHeight: '460px', overflowY: 'auto',
              animation: 'scaleIn 0.18s ease',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--space-2) var(--space-3) var(--space-3)',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  الإشعارات
                  {unreadCount > 0 && (
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, marginRight: 'var(--space-1)' }}>
                      ({unreadCount})
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{
                    background: 'none', border: 'none',
                    color: 'var(--accent-blue)', fontSize: 'var(--text-xs)',
                    cursor: 'pointer', fontWeight: 600,
                  }}>قراءة الكل</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                    padding: 'var(--space-3) var(--space-4)', cursor: 'pointer',
                    background: n.read ? 'transparent' : 'var(--sidebar-active)',
                    borderBottom: '1px solid var(--border-light)',
                    textAlign: 'right', transition: 'var(--transition-fast)',
                  }} className="notif-item">
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: n.read ? 600 : 700, color: 'var(--text-primary)' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{n.body}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                      {new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        {user && (
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-1)', borderRadius: 'var(--radius-md)',
                transition: 'var(--transition-base)',
              }}
              className="navbar-profile-btn"
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'var(--gradient-cyber)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: 'var(--text-xs)',
                flexShrink: 0,
              }}>
                {user.name?.charAt(0) || '?'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', lineHeight: 1.2 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
                </span>
              </div>
              <ChevronDown size={14} color="var(--text-tertiary)" style={{ transition: 'var(--transition-base)', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {profileOpen && (
              <div style={{
                ...sharedMenuStyle,
                position: 'absolute', top: '48px', left: '0', width: '220px',
                animation: 'scaleIn 0.18s ease',
              }}>
                <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{user.email}</div>
                </div>
                <div style={{ padding: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => { setProfileOpen(false); navigate('/dashboard'); }} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)', border: 'none',
                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)',
                    transition: 'var(--transition-fast)', textAlign: 'right',
                  }} className="dropdown-item-custom">
                    <Settings size={15} />
                    الإعدادات
                  </button>
                  <button onClick={() => { setProfileOpen(false); logout(); }} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)', border: 'none',
                    background: 'transparent', color: 'var(--accent-red)', cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)',
                    transition: 'var(--transition-fast)', textAlign: 'right',
                  }} className="dropdown-item-custom">
                    <LogOut size={15} />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .navbar-icon-btn:hover {
          background: var(--sidebar-hover) !important;
          color: var(--text-primary) !important;
        }
        .navbar-profile-btn:hover {
          background: var(--sidebar-hover) !important;
        }
        .notif-item:hover {
          background: var(--sidebar-hover) !important;
        }
        .dropdown-item-custom:hover {
          background: var(--sidebar-hover) !important;
        }
        @media (max-width: 767px) {
          .navbar-profile-btn > div:last-of-type {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
