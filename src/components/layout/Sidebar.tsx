import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, FileText, MessageSquare, HeadphonesIcon,
  FolderKanban, ChevronLeft, LogOut, Sun, Moon, Megaphone,
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
  const location = useLocation();

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  const navSections = [
    {
      label: 'الرئيسية',
      items: [
        { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, adminOnly: false },
      ],
    },
    {
      label: 'المحتوى',
      items: [
        { path: '/content', label: 'المكتبة الرقمية', icon: FileText, adminOnly: false },
      ],
    },
    {
      label: 'التواصل',
      adminOnly: true,
      items: [
        { path: '/chat', label: 'الشات الداخلي', icon: MessageSquare, adminOnly: true },
        { path: '/support', label: 'الدعم الفني', icon: HeadphonesIcon, adminOnly: true },
      ],
    },
    {
      label: 'المشاريع',
      items: [
        { path: '/projects', label: 'المشاريع', icon: FolderKanban, adminOnly: false },
      ],
    },
    {
      label: 'الإصدارات',
      adminOnly: true,
      items: [
        { path: '/admin/release-notes', label: 'سجل الإصدارات', icon: Megaphone, adminOnly: true },
      ],
    },
  ];

  const visibleSections = navSections.filter(s => {
    if (!isAdmin && s.adminOnly) return false;
    const hasVisibleItems = s.items.filter(i => !i.adminOnly || isAdmin).length > 0;
    return hasVisibleItems;
  });

  const isActive = (path: string) => location.pathname === path;

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
        aria-label="القائمة الجانبية"
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 1032,
          background: 'var(--sidebar-bg)',
          borderLeft: '1px solid var(--sidebar-border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          boxShadow: mobileOpen ? 'var(--shadow-sidebar)' : 'none',
          transform: mobileOpen !== undefined
            ? `translateX(${mobileOpen ? '0' : 'calc(100% + 20px)'})`
            : 'none',
          ...(mobileOpen !== undefined ? {
            position: 'fixed' as const,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 1032,
            transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          } : {}),
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
        }}>
          {!collapsed && (
            <Link to="/" onClick={handleNavClick} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.3px' }}>EMF</span>
              <span style={{
                background: 'var(--gradient-gold)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 900, fontSize: '1.1rem',
              }}>GROUP</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/" onClick={handleNavClick} style={{ textDecoration: 'none' }}>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 900, fontSize: '1.1rem' }}>E</span>
            </Link>
          )}
          <button
            onClick={onToggle}
            onKeyDown={(e) => { if (e.key === 'Escape') onMobileClose?.(); }}
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
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'var(--transition-base)' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? 'var(--space-3) 0' : 'var(--space-4) 0',
          direction: 'rtl',
        }}>
          {visibleSections.map(section => (
            <div key={section.label} style={{ marginBottom: collapsed ? 'var(--space-2)' : 'var(--space-4)' }}>
              {!collapsed && (
                <div style={{
                  padding: '0 var(--space-5)',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}>
                  {section.label}
                </div>
              )}
              {section.items.filter(i => !i.adminOnly || isAdmin).map(item => {
                const active = isActive(item.path);
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
                      borderRadius: collapsed ? '50%' : 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: 'var(--text-sm)',
                      fontWeight: active ? 700 : 500,
                      color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      background: active ? 'var(--sidebar-active)' : 'transparent',
                      transition: 'all var(--transition-base)',
                      position: 'relative',
                      borderRight: active && !collapsed ? '3px solid var(--accent-blue)' : '3px solid transparent',
                      width: collapsed ? '44px' : 'auto',
                      height: collapsed ? '44px' : 'auto',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={collapsed ? item.label : undefined}
                    className="sidebar-link"
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.icon size={20} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                    {!collapsed && <span>{item.label}</span>}
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
            aria-label={appliedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {appliedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span style={{ fontSize: 'var(--text-xs)' }}>{appliedTheme === 'dark' ? 'فاتح' : 'داكن'}</span>}
          </button>

          {/* User */}
          {user && !collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, flex: 1 }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--gradient-cyber)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: 'var(--text-xs)',
              }}>
                {user.name?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1, textAlign: 'right', minWidth: 0, lineHeight: 1.2 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'عضو'}
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
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut size={15} />
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
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <style>{`
        .sidebar-toggle-btn:hover {
          color: var(--sidebar-text-active) !important;
          opacity: 1 !important;
        }
        .sidebar-theme-btn:hover {
          border-color: var(--border-hover) !important;
          color: var(--sidebar-text-active) !important;
        }
        @media (max-width: 1023px) {
          aside[style*="position: fixed"] {
            transform: translateX(\${mobileOpen ? '0' : 'calc(100% + 20px)'}) !important;
          }
        }
      `}</style>
    </>
  );
}
