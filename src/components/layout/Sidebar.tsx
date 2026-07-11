import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import {
  LayoutDashboard, FileText, MessageSquare, HeadphonesIcon,
  FolderKanban, ChevronLeft, LogOut, Sun, Moon, Megaphone,
  User, Settings,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { appliedTheme, toggleTheme } = useTheme();
  const { t, rtl } = useI18n();
  const location = useLocation();

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  const navSections = [
    {
      key: 'mainMenu',
      items: [
        { path: '/dashboard', key: 'home', icon: LayoutDashboard, adminOnly: false },
      ],
    },
    {
      key: 'digitalLibrary',
      items: [
        { path: '/content', key: 'digitalLibrary', icon: FileText, adminOnly: false },
      ],
    },
    {
      key: 'projects',
      items: [
        { path: '/projects', key: 'projects', icon: FolderKanban, adminOnly: false },
      ],
    },
    {
      key: 'supportServices',
      items: [
        { path: '/support', key: 'support', icon: HeadphonesIcon, adminOnly: false },
      ],
    },
    {
      key: 'managementMenu',
      adminOnly: true,
      items: [
        { path: '/chat', key: 'chat', icon: MessageSquare, adminOnly: true },
      ],
    },
    {
      key: 'systemMenu',
      adminOnly: true,
      items: [
        { path: '/admin/release-notes', key: 'releaseNotes', icon: Megaphone, adminOnly: true },
      ],
    },
    {
      key: 'accountSection',
      adminOnly: false,
      items: [
        { path: '/settings', key: 'profile', icon: User, adminOnly: false },
        { path: '/settings', key: 'settings', icon: Settings, adminOnly: false },
      ],
    },
  ];

  const visibleSections = navSections.filter(s => {
    if (!isAdmin && s.adminOnly) return false;
    const hasVisibleItems = s.items.filter(i => !i.adminOnly || isAdmin).length > 0;
    return hasVisibleItems;
  });

  const isActive = (path: string, key: string) => {
    if (key === 'profile' || key === 'settings') {
      return location.pathname.startsWith('/settings');
    }
    return location.pathname === path;
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768 && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          onKeyDown={(e) => { if (e.key === 'Escape') onMobileClose?.(); }}
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 1031,
            background: 'var(--bg-overlay)',
            animation: 'fadeIn 0.2s ease',
          }}
          tabIndex={-1}
        />
      )}

      <aside
        role="navigation"
        aria-label={t('mainMenu')}
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          right: rtl ? 0 : 'auto',
          left: !rtl ? 0 : 'auto',
          zIndex: 1032,
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px)',
          borderLeft: rtl ? '1px solid var(--sidebar-border)' : 'none',
          borderRight: !rtl ? '1px solid var(--sidebar-border)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          boxShadow: mobileOpen ? 'var(--shadow-sidebar)' : 'none',
          transform: mobileOpen !== undefined
            ? `translateX(${mobileOpen ? '0' : (rtl ? 'calc(100% + 20px)' : 'calc(-100% - 20px)')})`
            : 'none',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 'var(--navbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 var(--space-5)',
          borderBottom: '1px solid var(--sidebar-border)',
          gap: 'var(--space-2)',
          flexShrink: 0,
          flexDirection: rtl ? 'row' : 'row-reverse',
        }}>
          {!collapsed && (
            <Link to="/" onClick={handleNavClick} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', flexDirection: rtl ? 'row' : 'row-reverse' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>EMF</span>
              <span style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800, fontSize: '1.1rem',
                letterSpacing: '-0.02em'
              }}>GROUP</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/" onClick={handleNavClick} style={{ textDecoration: 'none' }}>
              <span style={{ color: 'var(--accent-indigo)', fontWeight: 800, fontSize: '1.1rem' }}>E</span>
            </Link>
          )}
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--sidebar-text)',
              cursor: 'pointer',
              padding: 'var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-base)',
              flexShrink: 0,
            }}
            className="sidebar-toggle-btn"
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <ChevronLeft size={16} style={{ transform: collapsed ? (rtl ? 'rotate(180deg)' : 'none') : (rtl ? 'none' : 'rotate(180deg)'), transition: 'var(--transition-base)' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? 'var(--space-3) 0' : 'var(--space-4) 0',
          direction: rtl ? 'rtl' : 'ltr',
        }}>
          {visibleSections.map(section => (
            <div key={section.key} style={{ marginBottom: collapsed ? 'var(--space-2)' : 'var(--space-4)' }}>
              {!collapsed && (
                <div style={{
                  padding: '0 var(--space-5)',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  textAlign: rtl ? 'right' : 'left',
                }}>
                  {t(section.key)}
                </div>
              )}
              {section.items.filter(i => !i.adminOnly || isAdmin).map(item => {
                const active = isActive(item.path, item.key);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? '0' : 'var(--space-3)',
                      padding: collapsed ? 'var(--space-3) 0' : 'var(--space-3) var(--space-5)',
                      margin: collapsed ? 'var(--space-1) auto' : 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: 'var(--text-sm)',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      background: active ? 'var(--sidebar-active)' : 'transparent',
                      transition: 'all var(--transition-base)',
                      position: 'relative',
                      borderRight: active && !collapsed && rtl ? '3px solid var(--accent-indigo)' : '3px solid transparent',
                      borderLeft: active && !collapsed && !rtl ? '3px solid var(--accent-indigo)' : '3px solid transparent',
                      width: collapsed ? '44px' : 'auto',
                      height: collapsed ? '44px' : 'auto',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flexDirection: rtl ? 'row' : 'row',
                    }}
                    title={collapsed ? t(item.key) : undefined}
                    className="sidebar-link"
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.icon size={18} style={{ flexShrink: 0, opacity: active ? 1 : 0.7, strokeWidth: active ? 2.5 : 2 }} />
                    {!collapsed && <span>{t(item.key)}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--sidebar-border)',
          padding: collapsed ? 'var(--space-3)' : 'var(--space-4) var(--space-5)',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: collapsed ? 'var(--space-2)' : 'var(--space-3)',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--sidebar-text)',
              cursor: 'pointer',
              padding: collapsed ? 'var(--space-2)' : 'var(--space-2) var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? '0' : 'var(--space-2)',
              transition: 'var(--transition-base)',
              flexShrink: 0,
              width: collapsed ? '40px' : 'auto',
              justifyContent: 'center',
            }}
            className="sidebar-theme-btn"
            aria-label={appliedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {appliedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            {!collapsed && <span style={{ fontSize: 'var(--text-xs)' }}>{appliedTheme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>

          {/* User */}
          {user && !collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, flex: 1, flexDirection: rtl ? 'row' : 'row' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: 'var(--text-xs)',
              }}>
                {user.name?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1, textAlign: rtl ? 'right' : 'left', minWidth: 0, lineHeight: 1.2 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {user.role === 'super_admin' ? t('roleSuperAdmin') : user.role === 'admin' ? t('roleAdmin') : t('roleUser')}
                </div>
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--accent-red)', cursor: 'pointer',
                  padding: 'var(--space-1)', display: 'flex', opacity: 0.7,
                  transition: 'var(--transition-base)',
                }}
                title={t('logout')}
                aria-label={t('logout')}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          {user && collapsed && (
            <button
              onClick={logout}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--accent-red)', cursor: 'pointer',
                padding: 'var(--space-1)', display: 'flex', opacity: 0.7,
              }}
              title={t('logout')}
              aria-label={t('logout')}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
