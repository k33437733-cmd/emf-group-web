import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Bell, LogOut, Menu, X } from 'lucide-react';
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
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
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
    <header style={{
      height: 'var(--navbar-height)',
      background: 'rgba(15,23,36,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      direction: 'rtl',
      position: 'sticky',
      top: 0,
      zIndex: 1020,
    }}>
      {/* Left side: mobile menu + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => { setMobileSidebar(s => !s); onToggleSidebar?.(); }} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          display: 'none', padding: '4px',
        }} className="btn-toggle-sidebar">
          <Menu size={22} />
        </button>
      </div>

      {/* Right side: user area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button onClick={() => setNotifOpen(!notifOpen)} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'white',
            display: 'flex', alignItems: 'center', position: 'relative',
          }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', left: '-4px',
                background: '#ef4444', color: 'white', borderRadius: '50%',
                width: '18px', height: '18px', fontSize: '0.65rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', boxShadow: '0 0 10px rgba(239,68,68,0.5)',
              }}>{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: '48px', left: '0', width: '340px',
              maxHeight: '420px', overflowY: 'auto', zIndex: 1000, padding: '8px 0',
              background: '#1a2332', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>الإشعارات ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{
                    background: 'none', border: 'none', color: '#60a5fa',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  }}>قراءة الكل</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                    padding: '12px 16px', cursor: 'pointer',
                    background: n.read ? 'transparent' : 'rgba(59,130,246,0.06)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    textAlign: 'right', transition: '0.15s',
                  }} className="notif-item">
                    <div style={{ fontSize: '0.85rem', fontWeight: n.read ? 600 : 700, color: n.read ? 'rgba(255,255,255,0.7)' : 'white' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{n.body}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                      {new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User info */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              border: '2px solid rgba(59,130,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: '0.75rem',
            }}>
              {user.name?.charAt(0) || '?'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', lineHeight: 1.3 }}>{user.name}</span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
              </span>
            </div>
            <button onClick={logout} style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)',
              borderRadius: '10px', padding: '7px', cursor: 'pointer', color: '#ef4444',
              display: 'flex', alignItems: 'center',
            }}>
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .notif-item:hover { background: rgba(255,255,255,0.04) !important; }
        @media (max-width: 767px) {
          .btn-toggle-sidebar { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
