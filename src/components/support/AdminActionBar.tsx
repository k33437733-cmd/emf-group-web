import { useState } from 'react';
import { Pin, Download, Bell, BellOff, Tag, Star, CheckCheck, Archive as ArchiveIcon } from 'lucide-react';
import { muteConversation, unmuteConversation, toggleImportant, archiveConversation, setConversationTags } from '../../firebase/support';
import type { Conversation } from '../../types';

interface Props {
  conversation: Conversation;
}

export default function AdminActionBar({ conversation }: Props) {
  const [muted, setMuted] = useState(!!conversation.muted);
  const [important, setImportant] = useState(!!conversation.isImportant);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagText, setTagText] = useState('');
  const [tags, setTags] = useState<string[]>(conversation.tags || []);

  const doAction = async (_action: string, fn: () => Promise<void>) => {
    try { await fn(); } catch {}
  };

  const addTag = async () => {
    const t = tagText.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagText('');
    await setConversationTags(conversation.id, next);
  };

  const removeTag = async (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    await setConversationTags(conversation.id, next);
  };

  const pinConvMsg = async () => {
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px',
      background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)',
      flexWrap: 'wrap',
    }}>
      <ActionBtn icon={muted ? BellOff : Bell} active={muted} danger={muted}
        tooltip={muted ? 'إلغاء الكتم' : 'كتم المحادثة'}
        onClick={() => doAction('mute', async () => { if (muted) { await unmuteConversation(conversation.id); setMuted(false); } else { await muteConversation(conversation.id); setMuted(true); } })} />
      <ActionBtn icon={Star} active={important}
        tooltip={important ? 'إزالة الأهمية' : 'تحديد كمهم'}
        onClick={() => doAction('imp', async () => { await toggleImportant(conversation.id, !important); setImportant(!important); })} />
      <ActionBtn icon={Pin} tooltip="تثبيت"
        onClick={() => doAction('pin', pinConvMsg)} />
      <ActionBtn icon={ArchiveIcon} tooltip="أرشفة"
        onClick={() => doAction('archive', () => archiveConversation(conversation.id))} />
      <ActionBtn icon={Tag} active={showTagInput}
        tooltip="وسوم"
        onClick={() => setShowTagInput(s => !s)} />
      <ActionBtn icon={Download} tooltip="تصدير"
        onClick={() => { /* future: export conversation */ }} />

      {/* Tag input */}
      {showTagInput && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px' }}>
          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
            {tags.map(t => (
              <span key={t} style={{
                padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem',
                background: 'var(--badge-bg)', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                {t}
                <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0, fontSize: '0.55rem' }}>×</button>
              </span>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); addTag(); }} style={{ display: 'flex', gap: '2px' }}>
            <input value={tagText} onChange={e => setTagText(e.target.value)} placeholder="وسم..."
              style={{ width: '60px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', color: 'var(--text-primary)', fontSize: '0.6rem' }} />
            <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
              <CheckCheck size={12} />
            </button>
          </form>
        </div>
      )}

      <style>{`@keyframes spinBtn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ActionBtn({ icon: Icon, active, danger, tooltip, onClick }: {
  icon: any; active?: boolean; danger?: boolean; tooltip: string; onClick: () => void;
}) {
  return (
    <button title={tooltip} onClick={onClick}
      style={{
        background: active ? (danger ? 'rgba(239,68,68,0.12)' : 'rgba(0,210,255,0.1)') : 'none',
        border: 'none', borderRadius: '6px', color: danger && active ? '#EF4444' : active ? 'var(--color-primary)' : 'var(--text-tertiary)',
        cursor: 'pointer', padding: '5px', display: 'flex', transition: 'all 0.1s',
      }}>
      <Icon size={14} />
    </button>
  );
}
