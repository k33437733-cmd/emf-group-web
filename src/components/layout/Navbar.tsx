import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Bell, LogOut, Menu } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase/db';
import type { SystemNotification } from '../../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
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
    if (notif.link) navigate(notif.link);
  };

  return (
    <header 
      style={{
        height: 'var(--navbar-height)',
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        direction: 'rtl',
        position: 'sticky',
        top: 0,
        zIndex: 1020,
      }}
      className="glass-navbar-header"
    >
      {/* Left side: Hamburger button + Logo on Mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={onToggleSidebar} 
          style={{
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', 
            cursor: 'pointer',
            display: 'none', 
            padding: '8px',
            borderRadius: '10px',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }} 
          className="btn-toggle-sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Small Brand Logo Indicator on Mobile */}
        <div className="mobile-brand-logo" style={{ display: 'none', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>EMF</span>
          <span style={{
            background: 'var(--gradient-gold)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800, fontSize: '1.05rem',
            marginRight: '3px'
          }}>GROUP</span>
        </div>
      </div>

      {/* Right side: Actions, Notifications and User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Notifications Popover */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)} 
            style={{
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)',
              borderRadius: '12px', 
              padding: '10px', 
              cursor: 'pointer', 
              color: 'var(--text-primary)',
              display: 'flex', 
              alignItems: 'center', 
              position: 'relative',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="navbar-action-btn"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span 
                style={{
                  position: 'absolute', 
                  top: '-3px', 
                  left: '-3px',
                  background: 'var(--accent-red)', 
                  color: 'white', 
                  borderRadius: '50%',
                  width: '18px', 
                  height: '18px', 
                  fontSize: '0.62rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold', 
                  boxShadow: '0 0 12px rgba(239,68,68,0.4)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifOpen && (
            <div 
              style={{
                position: 'absolute', 
                top: '52px', 
                left: '0', 
                width: '350px',
                maxHeight: '440px', 
                overflowY: 'auto', 
                zIndex: 1050, 
                padding: '8px 0',
                background: '#0d1325', 
                border: '1px solid var(--border-color)',
                borderRadius: '16px', 
                boxShadow: 'var(--shadow-lg)',
              }}
              className="animate-scale"
            >
              <div 
                style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 18px', 
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white' }}>
                  الإشعارات ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead} 
                    style={{
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--accent-blue)',
                      fontSize: '0.75rem', 
                      cursor: 'pointer', 
                      fontWeight: 600,
                      transition: 'color 0.2s',
                    }}
                    className="notif-mark-read-btn"
                  >
                    قراءة الكل
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '36px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  لا توجد إشعارات حالياً
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotifClick(n)} 
                      style={{
                        padding: '14px 18px', 
                        cursor: 'pointer',
                        background: n.read ? 'transparent' : 'rgba(59,130,246,0.03)',
                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                        textAlign: 'right', 
                        transition: 'all 0.15s ease',
                      }} 
                      className="notif-item-row"
                    >
                      <div 
                        style={{ 
                          fontSize: '0.84rem', 
                          fontWeight: n.read ? 500 : 700, 
                          color: n.read ? 'var(--text-secondary)' : '#ffffff' 
                        }}
                      >
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                        {new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info Block */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              border: '2px solid rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: '0.8rem',
            }} className="navbar-avatar">
              {user.name?.charAt(0) || '?'}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }} className="navbar-user-text">
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'white', lineHeight: 1.25 }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1px', lineHeight: 1.25 }}>
                {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
              </span>
            </div>

            <button 
              onClick={logout} 
              style={{
                background: 'rgba(239,68,68,0.06)', 
                border: '1px solid rgba(239,68,68,0.12)',
                borderRadius: '12px', 
                padding: '9px', 
                cursor: 'pointer', 
                color: 'var(--accent-red)',
                display: 'flex', 
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              className="navbar-logout-btn"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .navbar-action-btn:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: #ffffff !important;
        }
        .navbar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          color: #f87171 !important;
        }
        .notif-item-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .notif-mark-read-btn:hover {
          color: #60a5fa !important;
        }
        @media (max-width: 768px) {
          .btn-toggle-sidebar {
            display: flex !important;
          }
          .mobile-brand-logo {
            display: flex !important;
          }
          .navbar-user-text {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
