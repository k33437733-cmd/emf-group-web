import { Phone, Video, Loader2 } from 'lucide-react';

interface Props {
  onStartVoice: () => void;
  onStartVideo: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function CallButton({ onStartVoice, onStartVideo, loading, disabled }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px' }}>
        <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '2px', padding: '2px' }}>
      <button onClick={onStartVoice} disabled={disabled}
        title="مكالمة صوتية"
        style={{
          background: 'none', border: 'none', borderRadius: '8px',
          color: disabled ? 'var(--text-tertiary)' : '#22C55E',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '6px', display: 'flex', transition: 'all 0.15s',
        }}>
        <Phone size={16} />
      </button>
      <button onClick={onStartVideo} disabled={disabled}
        title="مكالمة فيديو"
        style={{
          background: 'none', border: 'none', borderRadius: '8px',
          color: disabled ? 'var(--text-tertiary)' : 'var(--color-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '6px', display: 'flex', transition: 'all 0.15s',
        }}>
        <Video size={16} />
      </button>
    </div>
  );
}
