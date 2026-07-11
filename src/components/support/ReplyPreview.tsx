import { X, CornerUpLeft } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface Props {
  message: ChatMessage;
  onCancel: () => void;
  rtl?: boolean;
}

export default function ReplyPreview({ message, onCancel }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 12px', marginBottom: '6px',
      background: 'var(--badge-bg)', borderRadius: '8px',
      borderRight: '3px solid var(--color-primary)',
      fontSize: '0.72rem',
    }}>
      <CornerUpLeft size={12} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.65rem', marginBottom: '1px' }}>
          {message.senderName}
        </div>
        <div style={{
          color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {message.content || (message.fileName ? `📎 ${message.fileName}` : '')}
        </div>
      </div>
      <button onClick={onCancel}
        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}
