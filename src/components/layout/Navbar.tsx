import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Bell, LogOut, Menu, Search, ChevronLeft } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase/db';
import type { SystemNotification } from '../../types';
import { UserAvatar, Badge } from '../ui/UIComponents';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

// Map routes to page titles
const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'لوحة التحكم', subtitle: 'نظرة عامة على النظام' },
  '/content':   { title: 'المكتبة الرقمية', subtitle: 'إدارة الملفات والمحتوى' },
  '/chat':      { title: 'الشات الداخلي', subtitle: 'التواصل مع الفريق' },
  '/support':   { title: 'الدعم الفني', subtitle: 'تواصل مع فريق الدعم' },
  '/projects':  { title: 'المشاريع', subtitle: 'إدارة مشاريع الشركة' },
};

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifications,  setNotifications]  = useState<SystemNotification[]>([]);
  const [userMenuOpen,   setUserMenuOpen]    = useState(false);
  const [searchFocused,  setSearchFocused]   = useState(false);

  const notifRef    = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'EMF Group', subtitle: '' };
  const unreadCount = notifications.filter(n => !n.read).length;

  // Notifications subscription
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user]);

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const handleNotifClick = async (notif: SystemNotification) => {
    await markNotificationAsRead(notif.id);
    setNotifOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const getNotifTypeColor = (type?: string) => {
    if (type === 'success') return 'var(--success)';
    if (type === 'warning') return 'var(--warning)';
    if (type === 'error')   return 'var(--danger)';
    return 'var(--primary)';
  };

  return (
    <header
      className="app-navbar"
      style={{
        height:          'var(--navbar-h)',
        background:      'rgba(8, 14, 26, 0.85)',
        backdropFilter:  'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom:    '1px solid rgba(255,255,255,0.055)',
        display:         'flex',
        alignItems:      'center',
        padding:         '0 20px',
        direction:       'rtl',
        position:        'sticky',
        top:             0,
        zIndex:          1020,
        gap:             16,
      }}
    >
      {/* ─── Mobile Hamburger ─── */}
      <button
        onClick={onToggleSidebar}
        className="navbar-hamburger"
        style={{
          display:      'none',
          background:   'transparent',
          border:       '1px solid var(--border-1)',
          borderRadius: 'var(--radius-md)',
          color:        'var(--text-2)',
          cursor:       'pointer',
          padding:      8,
          alignItems:   'center',
          justifyContent: 'center',
          transition:   'all 0.2s',
          flexShrink:   0,
        }}
      >
        <Menu size={18} />
      </button>

      {/* ─── Page Title (Desktop) ─── */}
      <div className="navbar-page-title" style={{ flex: '0 0 auto' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
          {pageInfo.title}
        </div>
        {pageInfo.subtitle && (
          <div style={{ fontSize: '0.70rem', color: 'var(--text-3)', marginTop: 1 }}>
            {pageInfo.subtitle}
          </div>
        )}
      </div>

      {/* ─── Search Bar (Desktop) ─── */}
      <div
        className={`navbar-search ${searchFocused ? 'focused' : ''}`}
        style={{
          flex:         1,
          maxWidth:     340,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          background:   searchFocused ? 'var(--bg-input-focus)' : 'var(--bg-input)',
          border:       `1px solid ${searchFocused ? 'var(--primary)' : 'var(--border-1)'}`,
          borderRadius: 'var(--radius-md)',
          padding:      '0 12px',
          height:       38,
          transition:   'all 0.2s',
          boxShadow:    searchFocused ? '0 0 0 3px rgba(79,142,247,0.10)' : 'none',
        }}
      >
        <Search size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <input
          placeholder="بحث..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            background:  'transparent',
            border:      'none',
            outline:     'none',
            color:       'var(--text-1)',
            fontFamily:  'inherit',
            fontSize:    '0.84rem',
            flex:        1,
            minWidth:    0,
          }}
        />
        <kbd style={{
          background:    'rgba(255,255,255,0.05)',
          border:        '1px solid var(--border-1)',
          borderRadius:  5,
          padding:       '2px 6px',
          fontSize:      '0.62rem',
          color:         'var(--text-3)',
          fontFamily:    'monospace',
          flexShrink:    0,
        }}>
          ⌘K
        </kbd>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ─── Right Actions ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
            className="navbar-action-btn"
            title="الإشعارات"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position:   'absolute',
                top:        -4,
                left:       -4,
                background: 'var(--danger)',
                color:      '#fff',
                borderRadius: '50%',
                width:      17,
                height:     17,
                fontSize:   '0.58rem',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                boxShadow:  '0 0 10px rgba(244,63,94,0.5)',
                border:     '2px solid var(--bg-app)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {notifOpen && (
            <div
              className="anim-slide-d"
              style={{
                position:    'absolute',
                top:         46,
                left:        0,
                width:       360,
                maxHeight:   420,
                background:  'var(--bg-card)',
                border:      '1px solid var(--border-2)',
                borderRadius: 'var(--radius-xl)',
                boxShadow:   'var(--shadow-xl)',
                overflow:    'hidden',
                zIndex:      1050,
                display:     'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
                padding:       '14px 18px',
                borderBottom:  '1px solid var(--border-1)',
                flexShrink:    0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>
                    الإشعارات
                  </span>
                  {unreadCount > 0 && (
                    <Badge variant="blue" size="sm">{unreadCount} جديد</Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border:     'none',
                      color:      'var(--primary)',
                      fontSize:   '0.75rem',
                      cursor:     'pointer',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      padding:    '2px 6px',
                      borderRadius: 6,
                      transition: 'all 0.15s',
                    }}
                    className="notif-mark-all-btn"
                  >
                    قراءة الكل
                  </button>
                )}
              </div>

              {/* Items */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
                    <Bell size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <div>لا توجد إشعارات حالياً</div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className="notif-item"
                      style={{
                        padding:      '12px 18px',
                        cursor:       'pointer',
                        background:   n.read ? 'transparent' : 'rgba(79,142,247,0.04)',
                        borderBottom: '1px solid var(--border-1)',
                        textAlign:    'right',
                        display:      'flex',
                        gap:          10,
                        alignItems:   'flex-start',
                        transition:   'background 0.15s',
                      }}
                    >
                      {/* Type dot */}
                      <div style={{
                        width:     8,
                        height:    8,
                        borderRadius: '50%',
                        background: n.read ? 'var(--border-2)' : getNotifTypeColor(n.type),
                        flexShrink: 0,
                        marginTop:  6,
                        boxShadow:  !n.read ? `0 0 8px ${getNotifTypeColor(n.type)}60` : 'none',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize:  '0.84rem',
                          fontWeight: n.read ? 500 : 700,
                          color:      n.read ? 'var(--text-2)' : 'var(--text-1)',
                          marginBottom: 3,
                        }}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                            {n.body}
                          </div>
                        )}
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-4)', marginTop: 5 }}>
                          {new Date(n.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Separator ─── */}
        <div style={{ width: 1, height: 22, background: 'var(--border-1)', margin: '0 4px' }} />

        {/* ─── User Menu ─── */}
        {user && (
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                background:   userMenuOpen ? 'var(--bg-card)' : 'transparent',
                border:       `1px solid ${userMenuOpen ? 'var(--border-2)' : 'transparent'}`,
                borderRadius: 'var(--radius-md)',
                padding:      '5px 10px 5px 6px',
                cursor:       'pointer',
                transition:   'all 0.2s',
                color:        'var(--text-1)',
              }}
              className="navbar-user-btn"
            >
              <UserAvatar name={user.name || '?'} size={30} />
              <div className="navbar-user-text" style={{ textAlign: 'right', lineHeight: 1.25 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-3)' }}>
                  {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
                </div>
              </div>
              <ChevronLeft
                size={14}
                style={{
                  color:     'var(--text-3)',
                  transform: userMenuOpen ? 'rotate(90deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.2s',
                  marginRight: 2,
                }}
              />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                className="anim-slide-d"
                style={{
                  position:    'absolute',
                  top:         46,
                  left:        0,
                  minWidth:    190,
                  background:  'var(--bg-card)',
                  border:      '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow:   'var(--shadow-lg)',
                  overflow:    'hidden',
                  zIndex:      1050,
                  padding:     '6px',
                }}
              >
                {/* User info */}
                <div style={{
                  padding:      '10px 12px',
                  borderBottom: '1px solid var(--border-1)',
                  marginBottom: 6,
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-3)', marginTop: 2 }}>{user.email}</div>
                </div>

                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="user-menu-item"
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          10,
                    padding:      '8px 12px',
                    width:        '100%',
                    borderRadius: 'var(--radius-sm)',
                    background:   'transparent',
                    border:       'none',
                    cursor:       'pointer',
                    color:        'var(--danger)',
                    fontFamily:   'inherit',
                    fontSize:     '0.84rem',
                    fontWeight:   500,
                    textAlign:    'right',
                    transition:   'background 0.15s',
                  }}
                >
                  <LogOut size={14} />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .notif-item:hover { background: rgba(255,255,255,0.025) !important; }
        .notif-mark-all-btn:hover { background: var(--primary-bg) !important; }
        .user-menu-item:hover { background: var(--danger-bg) !important; }
        .navbar-user-btn:hover { background: var(--bg-card) !important; border-color: var(--border-1) !important; }
        @media (max-width: 768px) {
          .navbar-hamburger { display: flex !important; }
          .navbar-page-title { display: none !important; }
          .navbar-search { display: none !important; }
          .navbar-user-text { display: none !important; }
        }
      `}</style>
    </header>
  );
}
