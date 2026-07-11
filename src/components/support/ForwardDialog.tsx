import { useState, useEffect } from 'react';
import { X, Send, Search, MessageSquare } from 'lucide-react';
import type { ChatMessage, Conversation } from '../../types';
import { forwardMessage } from '../../firebase/support';

interface Props {
  message: ChatMessage;
  conversations: Conversation[];
  currentUser: { uid: string; name: string };
  onClose: () => void;
  onDone: () => void;
}

export default function ForwardDialog({ message, conversations, currentUser, onClose, onDone }: Props) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const filtered = conversations.filter(c =>
    c.id !== message.conversationId &&
    (c.name || c.groupName || c.memberNames?.[c.members[0]] || '')?.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await forwardMessage(message.conversationId, selectedId, message, currentUser.uid);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {}
    finally { setSending(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', animation: 'fadeBg 0.15s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-elevated)', borderRadius: '16px', width: '360px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        border: '1px solid var(--color-border)', animation: 'popupIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>توجيه الرسالة</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Message preview */}
        <div style={{ padding: '10px 18px', background: 'var(--bg-secondary)', margin: '8px 12px', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)', maxHeight: '40px', overflow: 'hidden' }}>
          {message.content || message.fileName || 'رسالة'}
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: '20px', top: '16px', color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن محادثة..."
            style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 32px 8px 12px', color: 'var(--text-primary)', fontSize: '0.78rem' }} />
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>لا توجد محادثات</div>
          )}
          {filtered.map(c => {
            const name = c.name || c.groupName || c.memberNames?.[c.members[0]] || 'محادثة';
            const sel = selectedId === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                background: sel ? 'var(--sidebar-active)' : 'transparent',
                cursor: 'pointer', textAlign: 'right', marginBottom: '2px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
                }}>
                  <MessageSquare size={14} />
                </div>
                <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: sel ? 600 : 400, color: 'var(--text-primary)' }}>{name}</span>
                {sel && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </button>
            );
          })}
        </div>

        {/* Send button */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={handleForward} disabled={!selectedId || sending || done}
            style={{
              width: '100%', background: done ? '#16A34A' : selectedId ? 'var(--color-primary)' : 'var(--border-color)',
              border: 'none', borderRadius: '10px', color: done ? '#fff' : selectedId ? '#050816' : 'var(--text-tertiary)',
              cursor: (!selectedId || sending) ? 'not-allowed' : 'pointer',
              padding: '10px', fontWeight: 600, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
            {done ? 'تم التوجيه ✓' : sending ? 'جاري...' : <><Send size={14} /> توجيه</>}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeBg { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popupIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
