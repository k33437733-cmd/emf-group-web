import { Search, Inbox } from 'lucide-react';
import type { Conversation } from '../../types';
import { useState, useMemo } from 'react';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  rtl?: boolean;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'أمس' : `منذ ${days} ي`;
}

export default function ConversationList({ conversations, activeId, onSelect, loading, rtl = true }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => (c.name || '').toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q));
  }, [conversations, search]);

  if (loading) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', direction: rtl ? 'rtl' : 'ltr' }}>
        <div style={{ height: '36px', borderRadius: '8px', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} />
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ height: '12px', width: '60%', borderRadius: '4px', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} />
              <div style={{ height: '10px', width: '80%', borderRadius: '4px', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ padding: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في المحادثات..."
            style={{
              width: '100%', padding: '8px 32px 8px 8px', borderRadius: '8px',
              border: '1px solid var(--color-border)', background: 'var(--input-bg)',
              color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit',
            }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Inbox size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
            <div style={{ fontSize: '0.8rem' }}>لا توجد محادثات</div>
          </div>
        ) : filtered.map(c => {
          const isActive = c.id === activeId;
          const unread = Object.values(c.unreadCount || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{
                display: 'flex', gap: '10px', padding: '12px', cursor: 'pointer',
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                borderRight: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.85rem', fontWeight: 700,
              }}>
                {(c.name || 'U').charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name || 'مستخدم'}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{relativeTime(c.lastMessageTime)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {c.lastMessage}
                  </span>
                  {unread > 0 && (
                    <span style={{
                      background: 'var(--color-primary)', color: '#050816', fontSize: '0.55rem', fontWeight: 700,
                      minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                    }}>{unread}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
