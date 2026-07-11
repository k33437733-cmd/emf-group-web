import { useState, useRef, useEffect } from 'react';
import { SmilePlus } from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  reactions?: Record<string, { emoji: string; users: string[] }>;
  currentUid: string;
  onReact: (emoji: string) => void;
}

export default function MessageReactions({ reactions, currentUid, onReact }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const entries = reactions ? Object.entries(reactions) : [];
  if (entries.length === 0 && !showPicker) {
    return (
      <button onClick={() => setShowPicker(true)} title="إضافة رد فعل"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', opacity: 0.4, transition: 'opacity 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
        <SmilePlus size={12} />
      </button>
    );
  }

  const hasReacted = (emoji: string) => reactions?.[emoji]?.users?.includes(currentUid);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', position: 'relative' }}>
      {entries.map(([emoji, data]) => (
        <button key={emoji} onClick={() => onReact(emoji)}
          style={{
            background: hasReacted(emoji) ? 'rgba(0,210,255,0.15)' : 'var(--badge-bg)',
            border: `1px solid ${hasReacted(emoji) ? 'rgba(0,210,255,0.3)' : 'transparent'}`,
            borderRadius: '12px', cursor: 'pointer', padding: '1px 5px',
            fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px',
            transition: 'all 0.12s',
          }}>
          <span>{emoji}</span>
          {data.users.length > 1 && <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)' }}>{data.users.length}</span>}
        </button>
      ))}
      <button onClick={() => setShowPicker(s => !s)} title="إضافة رد فعل"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', opacity: 0.5, transition: 'opacity 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
        <SmilePlus size={10} />
      </button>
      {showPicker && (
        <div ref={pickerRef} style={{
          position: 'absolute', bottom: '100%', left: '0', marginBottom: '4px',
          background: 'var(--bg-elevated)', borderRadius: '10px',
          border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          padding: '4px', display: 'flex', gap: '2px', zIndex: 60,
          animation: 'popupIn 0.12s ease',
        }}>
          {QUICK_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onReact(emoji); setShowPicker(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1rem', borderRadius: '6px', lineHeight: 1 }}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
