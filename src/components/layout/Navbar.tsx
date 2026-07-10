import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { UserAvatar } from '../ui/UIComponents';
import { subscribeUnreadCount } from '../../firebase/db';
import NotificationCenter from '../notifications/NotificationCenter';
import {
  Menu, Search, Bell, Settings, Plus,
  PanelLeftClose, ChevronDown, LogOut, User, Shield,
  Palette, X, FileText, FolderKanban, MessageSquare,
} from 'lucide-react';
import styles from './Navbar.module.css';

interface NavbarProps {
  onToggleSidebar: () => void;
}

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageConfig {
  title: string;
  breadcrumbs: BreadcrumbItem[];
}

const pageConfigs: Record<string, PageConfig> = {
  '/dashboard': { title: 'لوحة التحكم', breadcrumbs: [{ label: 'الرئيسية' }, { label: 'لوحة التحكم' }] },
  '/content': { title: 'المكتبة الرقمية', breadcrumbs: [{ label: 'الرئيسية', path: '/dashboard' }, { label: 'المكتبة الرقمية' }] },
  '/chat': { title: 'الشات الداخلي', breadcrumbs: [{ label: 'الرئيسية', path: '/dashboard' }, { label: 'التواصل' }, { label: 'الشات الداخلي' }] },
  '/support': { title: 'الدعم الفني', breadcrumbs: [{ label: 'الرئيسية', path: '/dashboard' }, { label: 'التواصل' }, { label: 'الدعم الفني' }] },
  '/projects': { title: 'المشاريع', breadcrumbs: [{ label: 'الرئيسية', path: '/dashboard' }, { label: 'المشاريع' }] },
  '/admin/release-notes': { title: 'سجل الإصدارات', breadcrumbs: [{ label: 'الرئيسية', path: '/dashboard' }, { label: 'الإصدارات' }, { label: 'سجل الإصدارات' }] },
};

const roleLabels: Record<string, string> = {
  super_admin: 'مدير عام',
  admin: 'مدير',
  agent: 'وكيل',
  user: 'عضو',
};

const roleClasses: Record<string, string> = {
  super_admin: styles.roleSuperAdmin,
  admin: styles.roleAdmin,
  agent: styles.roleAgent,
  user: styles.roleUser,
};

const dotClasses: Record<string, string> = {
  online: styles.onlineDot,
  away: styles.awayDot,
  offline: styles.offlineDot,
};

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { accent, setAccent, mode, setMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellShake, setBellShake] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUnreadCount(user.uid, setUnreadCount);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && prevUnreadRef.current !== 0) {
      setBellShake(true);
      const t = setTimeout(() => setBellShake(false), 600);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileSearchOpen(true);
        } else {
          searchInputRef.current?.focus();
        }
      }
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
        setQuickOpen(false);
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const config = pageConfigs[location.pathname] || pageConfigs['/dashboard'];

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    await logout();
  }, [logout]);

  const handleNavigate = useCallback((path: string) => {
    setProfileOpen(false);
    navigate(path);
  }, [navigate]);

  const handleAccentChange = useCallback((color: string) => {
    setAccent(color as any);
  }, [setAccent]);

  const roleLabel = roleLabels[user?.role || ''] || 'عضو';
  const roleClass = roleClasses[user?.role || ''] || styles.roleUser;
  const dotClass = user ? dotClasses[user.onlineStatus] || styles.offlineDot : '';

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        {/* ── Left section ── */}
        <div className={styles.sectionLeft}>
          <button
            className={styles.sidebarToggle}
            onClick={onToggleSidebar}
            aria-label="فتح القائمة الجانبية"
            aria-controls="sidebar-nav"
          >
            <Menu size={20} />
          </button>

          {user && (
            <div
              ref={profileRef}
              className={styles.userSection}
              onClick={() => setProfileOpen(p => !p)}
              role="button"
              tabIndex={0}
              aria-label="قائمة الملف الشخصي"
              aria-expanded={profileOpen}
            >
              <div className={styles.avatarWrap}>
                <UserAvatar name={user.name} size={38} />
                <span className={`${styles.onlineDot} ${dotClass}`} />
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={`${styles.roleBadge} ${roleClass}`}>{roleLabel}</span>
              </div>
              <span className={`${styles.dropdownArrow} ${profileOpen ? styles.dropdownArrowOpen : ''}`}>
                <ChevronDown size={14} />
              </span>

              {profileOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownHeaderName}>{user.name}</div>
                    <div className={styles.dropdownHeaderEmail}>{user.email}</div>
                  </div>
                  <div style={{ padding: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button className={styles.dropdownItem} onClick={() => handleNavigate('/dashboard')}>
                      <User size={15} />
                      الملف الشخصي
                    </button>
                    <button className={styles.dropdownItem} onClick={() => handleNavigate('/settings')}>
                      <Settings size={15} />
                      إعدادات الحساب
                    </button>
                    <button className={styles.dropdownItem} onClick={() => handleNavigate('/settings?tab=appearance')}>
                      <Palette size={15} />
                      المظهر
                    </button>
                    <button className={styles.dropdownItem} onClick={() => handleNavigate('/settings?tab=security')}>
                      <Shield size={15} />
                      الأمان
                    </button>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <div style={{ padding: 'var(--space-1)' }}>
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Center section ── */}
        <div className={styles.sectionCenter}>
          <div className={styles.titleArea}>
            <div className={styles.breadcrumbs}>
              {config.breadcrumbs.map((item, i) => (
                <span key={i} className={styles.breadcrumbItem}>
                  {i > 0 && <span className={styles.breadcrumbSeparator}>/</span>}
                  {item.path ? (
                    <span className={styles.breadcrumbLink} onClick={() => navigate(item.path!)}>
                      {item.label}
                    </span>
                  ) : (
                    <span className={styles.breadcrumbCurrent}>{item.label}</span>
                  )}
                </span>
              ))}
            </div>
            <h2 className={styles.pageTitle}>{config.title}</h2>
          </div>

          <div
            className={styles.searchBar}
            onClick={() => searchInputRef.current?.focus()}
            role="search"
            aria-label="بحث سريع"
          >
            <span className={styles.searchIcon}>
              <Search size={15} />
            </span>
            <input
              ref={searchInputRef}
              className={styles.searchInput}
              type="text"
              placeholder="بحث سريع..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="بحث سريع"
            />
            <kbd className={styles.searchKbd}>
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* ── Right section ── */}
        <div className={styles.sectionRight}>
          {/* Notification bell */}
          <div ref={notifRef} className={styles.notifWrapper}>
            <button
              className={`${styles.navIconBtn} ${bellShake ? styles.bellShake : ''}`}
              onClick={() => setNotifOpen(o => !o)}
              aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروء)` : ''}`}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className={`${styles.notifBadge} ${styles.notifBadgePulse}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationCenter
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          <div ref={themeRef} style={{ position: 'relative' }}>
            {/* Theme toggle */}
            <button
              className={styles.navIconBtn}
              onClick={() => setThemeOpen(open => !open)}
              aria-label="تبديل الألوان"
            >
              <Palette size={19} />
            </button>

            {themeOpen && (
              <div className={styles.themeDropdown}>
                <div className={styles.themeSection}>
                  <div className={styles.themeSectionTitle}>الوضع</div>
                  <div className={styles.themeModeOptions}>
                    <button
                      type="button"
                      className={`${styles.themeModeButton} ${mode === 'light' ? 'active' : ''}`}
                      onClick={() => setMode('light')}
                    >فاتح</button>
                    <button
                      type="button"
                      className={`${styles.themeModeButton} ${mode === 'dark' ? 'active' : ''}`}
                      onClick={() => setMode('dark')}
                    >داكن</button>
                    <button
                      type="button"
                      className={`${styles.themeModeButton} ${mode === 'system' ? 'active' : ''}`}
                      onClick={() => setMode('system')}
                    >نظام</button>
                  </div>
                </div>
                <div className={styles.themeSection}>
                  <div className={styles.themeSectionTitle}>ألوان لوحة التحكم</div>
                  <div className={styles.themeAccentSwatches}>
                    {['blue','purple','pink','red','orange','gold','green','cyan','dark','navy'].map(color => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`تبديل اللون إلى ${color}`}
                        className={`${styles.themeAccentSwatch} ${accent === color ? 'active' : ''}`}
                        onClick={() => handleAccentChange(color)}
                        style={{ background: `var(--accent-${color})` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            className={styles.navIconBtn}
            onClick={() => navigate('/settings')}
            aria-label="الإعدادات"
          >
            <Settings size={19} />
          </button>

          {/* Quick actions */}
          <div ref={quickRef} className={styles.quickWrapper}>
            <button
              className={styles.navIconBtn}
              onClick={() => setQuickOpen(o => !o)}
              aria-label="إجراءات سريعة"
            >
              <Plus size={19} />
            </button>

            {quickOpen && (
              <div className={styles.quickActionsDropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setQuickOpen(false); navigate('/content'); }}
                >
                  <FileText size={15} />
                  إضافة محتوى
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setQuickOpen(false); navigate('/projects'); }}
                >
                  <FolderKanban size={15} />
                  مشروع جديد
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setQuickOpen(false); navigate('/chat'); }}
                >
                  <MessageSquare size={15} />
                  رسالة جديدة
                </button>
              </div>
            )}
          </div>

          {/* Sidebar collapse (desktop) */}
          <button
            className={`${styles.navIconBtn} ${styles.sidebarCollapseDesk}`}
            onClick={onToggleSidebar}
            aria-label="طي القائمة"
          >
            <PanelLeftClose size={19} />
          </button>

          {/* Mobile search trigger */}
          <button
            className={`${styles.navIconBtn} ${styles.searchMobileTrigger}`}
            onClick={() => setMobileSearchOpen(true)}
            aria-label="بحث"
          >
            <Search size={19} />
          </button>
        </div>
      </div>

      {/* ── Mobile search overlay ── */}
      {mobileSearchOpen && (
        <div className={styles.mobileSearchOverlay}>
          <div className={styles.mobileSearchHeader}>
            <input
              className={styles.mobileSearchInput}
              type="text"
              placeholder="ابحث عن صفحة..."
              autoFocus
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="بحث"
            />
            <button
              className={styles.navIconBtn}
              onClick={() => setMobileSearchOpen(false)}
              aria-label="إغلاق البحث"
            >
              <X size={20} />
            </button>
          </div>
          <div className={styles.mobileSearchHint}>
            ابدأ الكتابة للبحث...
          </div>
        </div>
      )}
    </header>
  );
}
