import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, FileText, MessageSquare, HeadphonesIcon,
  FolderKanban, ChevronLeft, LogOut, Layers,
} from 'lucide-react';
import { UserAvatar } from '../ui/UIComponents';

interface SidebarProps {
  collapsed:       boolean;
  onToggle:        () => void;
  mobileOpen?:     boolean;
  onCloseMobile?:  () => void;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  path:      string;
  label:     string;
  icon:      React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  adminOnly: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'الرئيسية',
    items: [
      { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, adminOnly: true },
      { path: '/content',   label: 'المكتبة الرقمية', icon: FileText,        adminOnly: false },
      { path: '/projects',  label: 'المشاريع',        icon: FolderKanban,    adminOnly: true },
    ],
  },
  {
    label: 'التواصل',
    items: [
      { path: '/chat',    label: 'الشات الداخلي', icon: MessageSquare,   adminOnly: true },
      { path: '/support', label: 'الدعم الفني',   icon: HeadphonesIcon,  adminOnly: false },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin    = user && (user.role === 'admin' || user.role === 'super_admin');
  const isActive   = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onCloseMobile) onCloseMobile();
  };

  return (
    <>
      <aside
        style={{
          width:      collapsed ? 'var(--sidebar-w-sm)' : 'var(--sidebar-w)',
          height:     '100vh',
          position:   'fixed',
          top:        0,
          right:      0,
          zIndex:     1030,
          background: 'linear-gradient(180deg, #07101f 0%, #060d19 60%, #050c18 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display:    'flex',
          flexDirection: 'column',
          transition: 'width 0.3s var(--ease-spring), transform 0.3s var(--ease-spring)',
          overflow:   'hidden',
        }}
        className={`sidebar-el ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
      >
        {/* ─── Logo Area ─── */}
        <div style={{
          height:          'var(--navbar-h)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  collapsed ? 'center' : 'space-between',
          padding:         collapsed ? '0' : '0 18px',
          borderBottom:    '1px solid rgba(255,255,255,0.05)',
          flexShrink:      0,
        }}>
          {!collapsed && (
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width:           32,
                height:          32,
                borderRadius:    10,
                background:      'var(--gradient-gold)',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                flexShrink:      0,
              }}>
                <Layers size={16} style={{ color: '#000' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#fff', letterSpacing: '0.5px' }}>EMF</span>
                <span style={{
                  fontSize:   '0.62rem',
                  fontWeight: 600,
                  background: 'var(--gradient-gold-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '1.5px',
                }}>GROUP</span>
              </div>
            </Link>
          )}

          {collapsed && (
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div style={{
                width:          34,
                height:         34,
                borderRadius:   10,
                background:     'var(--gradient-gold)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}>
                <Layers size={16} style={{ color: '#000' }} />
              </div>
            </Link>
          )}

          {/* Desktop collapse toggle */}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="sidebar-toggle-btn"
              style={{
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
                color:        'var(--text-3)',
                cursor:       'pointer',
                padding:      '6px',
                display:      'flex',
                alignItems:   'center',
                transition:   'all 0.2s',
                flexShrink:   0,
              }}
            >
              <ChevronLeft size={15} />
            </button>
          )}

          {collapsed && (
            <button
              onClick={onToggle}
              className="sidebar-toggle-btn sidebar-toggle-collapsed"
              style={{
                position:   'absolute',
                bottom:     -1,
                right:      0,
                width:      '100%',
                height:     0,
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                display:    'none', // shown via CSS
              }}
            >
              <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>

        {/* ─── Navigation ─── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0', direction: 'rtl' }} className="sidebar-nav">
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                {/* Section Label */}
                {!collapsed && (
                  <div className="sidebar-section-label">{section.label}</div>
                )}
                {collapsed && <div style={{ height: 12 }} />}

                {/* Items */}
                {visibleItems.map(item => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      title={collapsed ? item.label : undefined}
                      className={`sidebar-link ${active ? 'active' : ''}`}
                      style={{
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        margin: collapsed ? '2px 8px' : '2px 10px',
                        padding: collapsed ? '10px 0' : '10px 12px',
                      }}
                    >
                      <span className="link-icon">
                        <item.icon
                          size={18}
                          style={{ color: active ? 'var(--primary-light)' : 'var(--text-3)' }}
                        />
                      </span>
                      {!collapsed && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                      )}
                      {/* Active indicator */}
                      {active && !collapsed && (
                        <div style={{
                          marginRight: 'auto',
                          width:  6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          flexShrink: 0,
                        }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ─── User Footer ─── */}
        {user && (
          <div style={{
            borderTop:  '1px solid rgba(255,255,255,0.05)',
            padding:    collapsed ? '12px 8px' : '14px 14px',
            display:    'flex',
            alignItems: 'center',
            gap:        10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'rgba(0,0,0,0.12)',
            flexShrink: 0,
          }}>
            <UserAvatar name={user.name || '?'} size={34} />
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize:     '0.82rem',
                    fontWeight:   600,
                    color:        'var(--text-1)',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 1 }}>
                    {user.role === 'super_admin' ? '👑 مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
                  </div>
                </div>
                <button
                  onClick={() => { logout(); if (window.innerWidth <= 768 && onCloseMobile) onCloseMobile(); }}
                  title="تسجيل الخروج"
                  className="sidebar-logout-btn"
                  style={{
                    background:   'transparent',
                    border:       '1px solid transparent',
                    borderRadius: 8,
                    color:        'var(--text-3)',
                    cursor:       'pointer',
                    padding:      6,
                    display:      'flex',
                    alignItems:   'center',
                    flexShrink:   0,
                    transition:   'all 0.2s',
                  }}
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </aside>

      {/* ─── Collapsed expand button ─── */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="sidebar-expand-btn"
          style={{ display: 'none' }}
          title="توسيع القائمة"
        >
          <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
      )}

      <style>{`
        .sidebar-link:hover { background: rgba(255,255,255,0.04) !important; color: var(--text-1) !important; }
        .sidebar-link.active { background: var(--primary-bg) !important; color: var(--primary-light) !important; border-color: var(--primary-border) !important; }
        .sidebar-link.active:hover { background: rgba(79,142,247,0.14) !important; }
        .sidebar-logout-btn:hover { background: var(--danger-bg) !important; border-color: var(--danger-border) !important; color: var(--danger) !important; }
        .sidebar-toggle-btn:hover { background: rgba(255,255,255,0.07) !important; color: var(--text-1) !important; }

        @media (max-width: 768px) {
          .sidebar-el {
            width: var(--sidebar-w) !important;
            transform: translateX(100%);
            box-shadow: -10px 0 40px rgba(0,0,0,0.6);
          }
          .sidebar-el.sidebar-mobile-open {
            transform: translateX(0);
          }
          .sidebar-toggle-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
