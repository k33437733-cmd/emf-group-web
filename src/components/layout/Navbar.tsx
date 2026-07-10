import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import { UserAvatar } from '../ui/UIComponents';
import { subscribeUnreadCount } from '../../firebase/db';
import NotificationCenter from '../notifications/NotificationCenter';
import CommandPalette from '../ui/CommandPalette';
import {
  Menu, Search, Bell, Settings, Plus,
  PanelLeftClose, ChevronDown, LogOut, User, Shield,
  Palette, X, FileText, FolderKanban, MessageSquare, Languages
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
  const { language, setLanguage, t, rtl } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellShake, setBellShake] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
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
        setCmdPaletteOpen(true);
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

  const translateBreadcrumb = useCallback((label: string) => {
    if (label === 'الرئيسية') return t('mainMenu');
    if (label === 'لوحة التحكم') return t('dashboard');
    if (label === 'المكتبة الرقمية') return t('content');
    if (label === 'الشات الداخلي') return t('chat');
    if (label === 'الدعم الفني') return t('support');
    if (label === 'المشاريع') return t('projects');
    if (label === 'سجل الإصدارات') return t('releaseNotes');
    if (label === 'الإصدارات') return t('systemMenu');
    if (label === 'التواصل') return t('managementMenu');
    return label;
  }, [t]);

  const translatePageTitle = useCallback((path: string) => {
    if (path === '/dashboard') return t('dashboard');
    if (path === '/content') return t('content');
    if (path === '/chat') return t('chat');
    if (path === '/support') return t('support');
    if (path === '/projects') return t('projects');
    if (path === '/admin/release-notes') return t('releaseNotes');
    return t('dashboard');
  }, [t]);

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

  const roleLabel = user?.role === 'super_admin' ? t('roleSuperAdmin') : user?.role === 'admin' ? t('roleAdmin') : t('roleUser');
  const roleClass = roleClasses[user?.role || ''] || styles.roleUser;
  const dotClass = user ? dotClasses[user.onlineStatus] || styles.offlineDot : '';

  return (
    <header className={styles.navbar} style={{ direction: rtl ? 'rtl' : 'ltr', background: 'var(--navbar-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-color)', height: 'var(--navbar-height)' }}>
      <div className={styles.inner} style={{ flexDirection: rtl ? 'row' : 'row-reverse' }}>
        {/* ── Left section (brand avatar & user status info) ── */}
        <div className={styles.sectionLeft} style={{ flexDirection: rtl ? 'row' : 'row-reverse' }}>
          <button
            className={styles.sidebarToggle}
            onClick={onToggleSidebar}
            aria-label="Open sidebar"
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
              aria-label="User Profile menu"
              aria-expanded={profileOpen}
              style={{ flexDirection: rtl ? 'row' : 'row' }}
            >
              <div className={styles.avatarWrap}>
                <UserAvatar name={user.name} size={34} />
                <span className={`${styles.onlineDot} ${dotClass}`} />
              </div>
              <div className={styles.userInfo} style={{ textAlign: rtl ? 'right' : 'left' }}>
                <span className={styles.userName}>{user.name}</span>
                <span className={`${styles.roleBadge} ${roleClass}`}>{roleLabel}</span>
              </div>
              <span className={`${styles.dropdownArrow} ${profileOpen ? styles.dropdownArrowOpen : ''}`}>
                <ChevronDown size={14} />
              </span>

              {profileOpen && (
                <div className={styles.profileDropdown} style={{ left: rtl ? 'auto' : 0, right: rtl ? 0 : 'auto', textAlign: rtl ? 'right' : 'left' }}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownHeaderName}>{user.name}</div>
                    <div className={styles.dropdownHeaderEmail}>{user.email}</div>
                  </div>
                  <div style={{ padding: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button className={styles.dropdownItem} onClick={() => handleNavigate('/dashboard')}>
                      <User size={15} />
                      {t('dashboard')}
                    </button>
                    <button className={styles.dropdownItem} onClick={() => handleNavigate('/settings')}>
                      <Settings size={15} />
                      {t('settings')}
                    </button>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <div style={{ padding: 'var(--space-1)' }}>
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Center section (Breadcrumb & Search Bar) ── */}
        <div className={styles.sectionCenter} style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--space-4)', flexDirection: rtl ? 'row' : 'row-reverse' }}>
          <div className={styles.titleArea} style={{ textAlign: rtl ? 'right' : 'left' }}>
            <div className={styles.breadcrumbs} style={{ direction: rtl ? 'rtl' : 'ltr' }}>
              {config.breadcrumbs.map((item, i) => (
                <span key={i} className={styles.breadcrumbItem}>
                  {i > 0 && <span className={styles.breadcrumbSeparator}>/</span>}
                  {item.path ? (
                    <span className={styles.breadcrumbLink} onClick={() => navigate(item.path!)}>
                      {translateBreadcrumb(item.label)}
                    </span>
                  ) : (
                    <span className={styles.breadcrumbCurrent}>{translateBreadcrumb(item.label)}</span>
                  )}
                </span>
              ))}
            </div>
            <h2 className={styles.pageTitle} style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              {translatePageTitle(location.pathname)}
            </h2>
          </div>

          {/* Search Trigger */}
          <div
            className={styles.searchBar}
            onClick={() => setCmdPaletteOpen(true)}
            role="search"
            aria-label="Quick Search command palette"
            style={{ cursor: 'pointer', maxWidth: '300px', display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', gap: '8px' }}
          >
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', flex: 1, textAlign: rtl ? 'right' : 'left' }}>
              {t('searchPlaceholder')}
            </span>
            <kbd className={styles.searchKbd} style={{ background: 'var(--badge-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.65rem', padding: '2px 4px', color: 'var(--text-secondary)' }}>
              <span>⌘</span>K
            </kbd>
          </div>
        </div>

        {/* ── Right section (Notifications, Theme Swatch, Language Switcher) ── */}
        <div className={styles.sectionRight} style={{ flexDirection: rtl ? 'row' : 'row-reverse', gap: 'var(--space-2)' }}>
          
          {/* Language Switcher */}
          <button
            className={styles.navIconBtn}
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            aria-label="Switch interface language"
            style={{ fontWeight: 700, fontSize: '0.78rem', background: 'var(--badge-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', height: '36px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-primary)' }}
          >
            <Languages size={15} style={{ opacity: 0.8 }} />
            <span style={{ textTransform: 'uppercase' }}>{language === 'ar' ? 'EN' : 'AR'}</span>
          </button>

          {/* Notification bell */}
          <div ref={notifRef} className={styles.notifWrapper}>
            <button
              className={`${styles.navIconBtn} ${bellShake ? styles.bellShake : ''}`}
              onClick={() => setNotifOpen(o => !o)}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              style={{ height: '36px', width: '36px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)' }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className={styles.notifBadge} style={{ background: 'var(--accent-red)', border: '2px solid var(--bg-primary)', position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%' }} />
              )}
            </button>

            <NotificationCenter
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          {/* Theme Palette Swatches */}
          <div ref={themeRef} style={{ position: 'relative' }}>
            <button
              className={`${styles.navIconBtn} ${styles.themeControl}`}
              onClick={() => setThemeOpen(open => !open)}
              aria-label="Theme Swatches panel"
              style={{ height: '36px', width: '36px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)' }}
            >
              <Palette size={18} />
            </button>

            {themeOpen && (
              <div className={styles.themeDropdown} style={{ left: rtl ? 0 : 'auto', right: rtl ? 'auto' : 0 }}>
                <div className={styles.themeSection}>
                  <div className={styles.themeSectionTitle}>{t('theme')}</div>
                  <div className={styles.themeModeOptions}>
                    <button
                      type="button"
                      className={`${styles.themeModeButton} ${mode === 'light' ? 'active' : ''}`}
                      onClick={() => setMode('light')}
                    >{rtl ? 'فاتح' : 'Light'}</button>
                    <button
                      type="button"
                      className={`${styles.themeModeButton} ${mode === 'dark' ? 'active' : ''}`}
                      onClick={() => setMode('dark')}
                    >{rtl ? 'داكن' : 'Dark'}</button>
                    <button
                      type="button"
                      className={`${styles.themeModeButton} ${mode === 'system' ? 'active' : ''}`}
                      onClick={() => setMode('system')}
                    >{rtl ? 'تلقائي' : 'Auto'}</button>
                  </div>
                </div>
                <div className={styles.themeSection}>
                  <div className={styles.themeSectionTitle}>{rtl ? 'ألوان لوحة التحكم' : 'Accent Swatch'}</div>
                  <div className={styles.themeAccentSwatches}>
                    {['blue','purple','pink','red','orange','gold','green','cyan','dark','navy'].map(color => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Switch color to ${color}`}
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

          {/* Quick Actions Add Plus */}
          <div ref={quickRef} className={styles.quickWrapper}>
            <button
              className={styles.navIconBtn}
              onClick={() => setQuickOpen(o => !o)}
              aria-label="Quick Actions"
              style={{ height: '36px', width: '36px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)' }}
            >
              <Plus size={18} />
            </button>

            {quickOpen && (
              <div className={styles.quickActionsDropdown} style={{ left: rtl ? 0 : 'auto', right: rtl ? 'auto' : 0, textAlign: rtl ? 'right' : 'left' }}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setQuickOpen(false); navigate('/content'); }}
                >
                  <FileText size={14} />
                  {rtl ? 'إضافة محتوى' : 'Add Content'}
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setQuickOpen(false); navigate('/projects'); }}
                >
                  <FolderKanban size={14} />
                  {rtl ? 'مشروع جديد' : 'New Project'}
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setQuickOpen(false); navigate('/chat'); }}
                >
                  <MessageSquare size={14} />
                  {rtl ? 'رسالة جديدة' : 'New Message'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Command Palette search Modal */}
      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
    </header>
  );
}
