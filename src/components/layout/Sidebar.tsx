import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, FileText, MessageSquare, HeadphonesIcon,
  FolderKanban, ChevronLeft, LogOut, UserCircle,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
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

  const linkStyle = (path: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: isActive(path) ? 700 : 500,
    color: isActive(path) ? 'white' : 'rgba(255,255,255,0.65)',
    background: isActive(path) ? 'rgba(59,130,246,0.2)' : 'transparent',
    transition: 'all 0.15s ease',
    margin: '2px 8px',
    cursor: 'pointer',
    border: 'none',
    width: collapsed ? '44px' : 'auto',
    justifyContent: collapsed ? 'center' : 'flex-start',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  });

  return (
    <aside style={{
      width: collapsed ? '60px' : '250px',
      height: '100vh',
      position: 'fixed',
      top: 0,
      right: 0,
      zIndex: 1030,
      background: 'linear-gradient(180deg, #0f1724 0%, #0b1120 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--navbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0' : '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: '8px',
      }}>
        {!collapsed && (
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '0.5px' }}>EMF</span>
            <span style={{
              background: 'linear-gradient(135deg, #f1c40f, #f39c12)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900, fontSize: '1.3rem',
            }}>GROUP</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>E</span>
          </Link>
        )}
        <button onClick={onToggle} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: '0.2s',
          flexShrink: 0,
        }}>
          <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0', direction: 'rtl' }}>
        {filteredNav.map(item => (
          <Link
            key={item.path}
            to={item.path}
            style={linkStyle(item.path)}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={20} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: collapsed ? '8px' : '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
            border: '2px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold', fontSize: '0.8rem',
          }}>
            {user.name?.charAt(0) || '?'}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                  {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
                </div>
              </div>
              <button onClick={logout} style={{
                background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px',
                color: '#ef4444', cursor: 'pointer', padding: '6px', display: 'flex',
              }} title="تسجيل الخروج">
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
