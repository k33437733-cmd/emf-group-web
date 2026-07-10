import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscribeNotificationsFiltered, subscribeUnreadCount, listNotifications, markAsRead, markAllAsRead, deleteNotification, archiveNotification } from '../../firebase/db';
import {
  Bell,
  Search,
  X,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import type { SystemNotification, NotificationCategory } from '../../types/notification';
import NotificationItem from './NotificationItem';

const CATEGORIES: { key: NotificationCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'system', label: 'النظام' },
  { key: 'updates', label: 'التحديثات' },
  { key: 'security', label: 'الأمان' },
  { key: 'users', label: 'المستخدمين' },
  { key: 'content', label: 'المحتوى' },
  { key: 'support', label: 'الدعم' },
  { key: 'projects', label: 'المشاريع' },
  { key: 'messages', label: 'الرسائل' },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return 'الأسبوع الماضي';
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [allNotifications, setAllNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<NotificationCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const agentId = user?.uid;
  const pageSize = 20;
  const lastDocRef = useRef<Record<string, unknown> | null>(null);

  // Real-time subscription for latest notifications (first page)
  useEffect(() => {
    if (!agentId || !isOpen) return;
    setLoading(true);
    setAllNotifications([]);
    setHasMore(true);
    lastDocRef.current = null;

    const cat = category === 'all' ? undefined : category;
    const unsub = subscribeNotificationsFiltered(agentId, (list) => {
      setAllNotifications(list);
      setLoading(false);
      if (list.length > 0) {
        lastDocRef.current = list[list.length - 1] as unknown as Record<string, unknown>;
      }
      if (list.length < pageSize) {
        setHasMore(false);
      }
    }, { category: cat as NotificationCategory | undefined, pageSize });

    return () => unsub();
  }, [agentId, isOpen, category]);

  // Infinite scroll: load more when sentinel is visible
  useEffect(() => {
    if (!isOpen || !hasMore || loading || loadingMore || !agentId) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && lastDocRef.current) {
          setLoadingMore(true);
          const cat = category === 'all' ? undefined : category;
          listNotifications(agentId, {
            lastDoc: lastDocRef.current,
            pageSize,
            category: cat as NotificationCategory | undefined,
          }).then((more) => {
            if (more.length > 0) {
              setAllNotifications(prev => [...prev, ...more]);
              lastDocRef.current = more[more.length - 1] as unknown as Record<string, unknown>;
            }
            if (more.length < pageSize) {
              setHasMore(false);
            }
            setLoadingMore(false);
          }).catch(() => setLoadingMore(false));
        }
      },
      { root: null, rootMargin: '100px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, hasMore, loading, loadingMore, agentId, category]);

  useEffect(() => {
    if (!agentId) return;
    const unsub = subscribeUnreadCount(agentId, setUnreadCount);
    return () => unsub();
  }, [agentId]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allNotifications;
    const q = searchQuery.trim().toLowerCase();
    return allNotifications.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q),
    );
  }, [allNotifications, searchQuery]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchRef.current?.focus();
  }, []);

  const handleAction = useCallback(async (action: string, notif: SystemNotification) => {
    switch (action) {
      case 'read':
        await markAsRead(notif.id);
        break;
      case 'archive':
        await archiveNotification(notif.id);
        break;
      case 'delete':
        await deleteNotification(notif.id);
        break;
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (!agentId) return;
    await markAllAsRead(agentId);
  }, [agentId]);

  const handleNotifClick = useCallback(async (notif: SystemNotification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    onClose();
    if (notif.link) {
      navigate(notif.link);
    }
  }, [navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        width: '380px',
        maxHeight: '520px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-elevated), 0 0 30px rgba(0, 0, 0, 0.15)',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'dropdownIn 0.15s ease',
        direction: 'rtl',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 10px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} style={{ color: 'var(--accent-blue, #38bdf8)' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            الإشعارات
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                background: 'var(--accent-red, #ef4444)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              title="تحديد الكل كمقروء"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-blue, #3b82f6)',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              <CheckCheck size={12} />
              قراءة الكل
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0 10px',
            transition: 'border-color 0.2s ease',
          }}
        >
          <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="ابحث في الإشعارات..."
            aria-label="بحث في الإشعارات"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              padding: '7px 0',
              fontFamily: 'inherit',
              direction: 'rtl',
            }}
            onFocus={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--accent-blue)';
            }}
            onBlur={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--input-border)';
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              aria-label="مسح البحث"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div
        style={{
          padding: '0 12px 8px',
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        {CATEGORIES.map((chip) => {
          const active = category === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setCategory(chip.key)}
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                border: active
                  ? '1px solid var(--accent-blue)'
                  : '1px solid var(--border-light)',
                background: active
                  ? 'rgba(59, 130, 246, 0.12)'
                  : 'transparent',
                color: active
                  ? 'var(--accent-blue)'
                  : 'var(--text-tertiary)',
                fontSize: '0.68rem',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                lineHeight: '22px',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--badge-bg)',
                    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      height: '12px',
                      width: '70%',
                      borderRadius: '4px',
                      background: 'var(--badge-bg)',
                      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                    }}
                  />
                  <div
                    style={{
                      height: '10px',
                      width: '90%',
                      borderRadius: '4px',
                      background: 'var(--badge-bg)',
                      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                    }}
                  />
                  <div
                    style={{
                      height: '8px',
                      width: '40%',
                      borderRadius: '4px',
                      background: 'var(--badge-bg)',
                      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--badge-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: 'var(--text-tertiary)',
              }}
            >
              {searchQuery ? <Search size={20} /> : <Inbox size={20} />}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد إشعارات'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {searchQuery
                ? 'حاول تغيير كلمات البحث'
                : 'ستظهر الإشعارات الجديدة هنا'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                relativeTime={relativeTime(notif.createdAt)}
                onClick={() => handleNotifClick(notif)}
                onAction={(action) => handleAction(action, notif)}
              />
            ))}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: '1px' }} />
            {loadingMore && (
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid var(--border-color)',
                    borderTopColor: 'var(--accent-blue)',
                    borderRadius: '50%',
                    margin: '0 auto',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
