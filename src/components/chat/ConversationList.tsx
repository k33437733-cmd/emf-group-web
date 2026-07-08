import { useState, useMemo } from 'react';
import { Search, Users } from 'lucide-react';
import type { Conversation } from '../../types';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  currentUid: string;
  onSelect: (conv: Conversation) => void;
  emptyLabel?: string;
  showGroup?: boolean;
  onSelectGroup?: () => void;
}

export default function ConversationList({
  conversations, activeId, currentUid, onSelect,
  emptyLabel = 'لا توجد محادثات', showGroup, onSelectGroup
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = conversations;
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(term) || c.lastMessage?.toLowerCase().includes(term));
    }
    if (unreadOnly) {
      list = list.filter(c => (c.unreadCount?.[currentUid] || 0) > 0);
    }
    return list;
  }, [conversations, search, unreadOnly, currentUid]);

  const totalUnread = useMemo(() =>
    conversations.reduce((sum, c) => sum + (c.unreadCount?.[currentUid] || 0), 0),
  [conversations, currentUid]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text" className="form-input"
            style={{ paddingRight: '34px', paddingLeft: '34px', fontSize: '0.8rem' }}
            placeholder="بحث في المحادثات..." value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search size={14} style={{ position: 'absolute', right: '10px', top: '11px', color: 'var(--text-muted)' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', left: '6px', top: '7px', background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px'
            }}>✕</button>
          )}
        </div>
        <button onClick={() => setUnreadOnly(u => !u)} style={{
          background: unreadOnly ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px',
          color: unreadOnly ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer',
          fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', position: 'relative'
        }}>
          غير مقروء
          {totalUnread > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', left: '-4px', background: '#f59e0b',
              color: 'white', fontSize: '0.6rem', fontWeight: 'bold', borderRadius: '50%',
              width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{totalUnread > 9 ? '9+' : totalUnread}</span>
          )}
        </button>
      </div>

      {/* Group entry */}
      {showGroup && onSelectGroup && (
        <div onClick={onSelectGroup} style={{
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s',
          background: activeId === 'admin_group_chat' ? 'rgba(59,130,246,0.08)' : 'transparent'
        }} className="chat-hover">
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gradient-cyber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Users size={20} />
          </div>
          <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white' }}>مجموعة الإدارة العامة 📢</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>تواصل جماعي مع كافة المدراء</div>
          </div>
        </div>
      )}

      {/* Conversations */}
      <div>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{emptyLabel}</div>
        ) : filtered.map(conv => {
          const isActive = conv.id === activeId;
          const unread = conv.unreadCount?.[currentUid] || 0;
          const otherUid = conv.members.find(m => m !== currentUid);
          const otherName = otherUid ? conv.memberNames?.[otherUid] || conv.name : conv.name;

          return (
            <div key={conv.id} onClick={() => onSelect(conv)} style={{
              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s',
              background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent'
            }} className="chat-hover">
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: conv.type === 'agent_member' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                border: '1px solid', borderColor: conv.type === 'agent_member' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '0.8rem',
                color: conv.type === 'agent_member' ? '#10b981' : 'var(--accent-blue)'
              }}>
                {otherName?.substring(0, 2) || '??'}
              </div>
              <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white' }}>{otherName}</div>
                <div style={{
                  fontSize: '0.75rem', color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>{conv.lastMessage || '...'}</div>
              </div>
              {unread > 0 && (
                <div style={{
                  background: '#f59e0b', color: 'white', fontSize: '0.65rem', fontWeight: 'bold',
                  borderRadius: '50%', width: '20px', height: '20px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>{unread > 9 ? '9+' : unread}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
