import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, FileText, MessageSquare, HeadphonesIcon,
  FolderKanban, ChevronLeft, LogOut,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, adminOnly: true },
    { path: '/content', label: 'المكتبة الرقمية', icon: FileText, adminOnly: false },
    { path: '/chat', label: 'الشات الداخلي', icon: MessageSquare, adminOnly: true },
    { path: '/support', label: 'الدعم الفني', icon: HeadphonesIcon, adminOnly: true },
    { path: '/projects', label: 'المشاريع', icon: FolderKanban, adminOnly: true },
  ];

  const filteredNav = navItems.filter(n => !n.adminOnly || isAdmin);

  const linkStyle = (path: string): React.CSSProperties => {
    const active = isActive(path);
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '12px',
      textDecoration: 'none',
      fontSize: '0.88rem',
      fontWeight: active ? 600 : 500,
      color: active ? '#ffffff' : 'var(--text-secondary)',
      background: active ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
      border: active ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      margin: '4px 12px',
      cursor: 'pointer',
      justifyContent: collapsed ? 'center' : 'flex-start',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      position: 'relative',
    };
  };

  return (
    <>
      <aside 
        style={{
          width: collapsed ? '70px' : '260px',
          height: '100vh',
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 1030,
          background: 'linear-gradient(180deg, #090d16 0%, #06090f 100%)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
        className={`sidebar-element ${mobileOpen ? 'mobile-show' : ''}`}
      >
        {/* Logo area */}
        <div style={{
          height: 'var(--navbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid var(--border-color)',
          gap: '8px',
        }}>
          {!collapsed && (
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.5px' }}>EMF</span>
              <span style={{
                background: 'var(--gradient-gold)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800, fontSize: '1.25rem',
              }}>GROUP</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>E</span>
            </Link>
          )}

          {/* Close button on mobile, toggle on desktop */}
          <button 
            onClick={onToggle} 
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.2s',
              flexShrink: 0,
            }}
            className="sidebar-toggle-btn"
          >
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 0', direction: 'rtl' }} className="sidebar-nav">
          {filteredNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={linkStyle(item.path)}
              title={collapsed ? item.label : undefined}
              onClick={() => {
                if (window.innerWidth <= 768 && onCloseMobile) {
                  onCloseMobile();
                }
              }}
              className={`sidebar-link-item ${isActive(item.path) ? 'active' : ''}`}
            >
              {/* Highlight bar for active state */}
              {isActive(item.path) && !collapsed && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '25%',
                  height: '50%',
                  width: '4px',
                  background: 'var(--accent-blue)',
                  borderRadius: '0 4px 4px 0',
                }} />
              )}
              <item.icon size={18} style={{ flexShrink: 0, color: isActive(item.path) ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
              {!collapsed && <span style={{ marginRight: '4px' }}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User footer profile */}
        {user && (
          <div style={{
            borderTop: '1px solid var(--border-color)',
            padding: collapsed ? '12px' : '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              border: '2px solid rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: '0.82rem',
            }}>
              {user.name?.charAt(0) || '?'}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', marginTop: '1px' }}>
                    {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    logout();
                    if (window.innerWidth <= 768 && onCloseMobile) onCloseMobile();
                  }} 
                  style={{
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '10px',
                    color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex',
                    transition: 'all 0.2s',
                  }} 
                  title="تسجيل الخروج"
                  className="sidebar-logout-btn"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </aside>

      <style>{`
        .sidebar-link-item:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          color: #ffffff !important;
        }
        .sidebar-link-item.active:hover {
          background: rgba(59, 130, 246, 0.16) !important;
        }
        .sidebar-logout-btn:hover {
          background: rgba(239,68,68,0.12) !important;
          color: #f87171 !important;
        }
        @media (max-width: 768px) {
          .sidebar-element {
            width: 250px !important;
            transform: translateX(100%);
            box-shadow: -10px 0 30px rgba(0,0,0,0.5);
          }
          .sidebar-element.mobile-show {
            transform: translateX(0);
          }
          .sidebar-toggle-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
