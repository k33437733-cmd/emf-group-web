import { Phone, PhoneOff, Video } from 'lucide-react';
import type { Meeting } from '../../types/call';

interface Props {
  meeting: Meeting;
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({ meeting, callerName, onAccept, onDecline }: Props) {
  return (
    <div style={{
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 10001, animation: 'slideDown 0.3s ease',
      background: 'var(--bg-elevated)', borderRadius: '16px',
      border: '1px solid var(--color-border)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
      padding: '20px 28px', minWidth: '280px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    }}>
      {/* Avatar */}
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#fff',
      }}>
        {meeting.type === 'video' ? <Video size={24} /> : <Phone size={24} />}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {meeting.type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          من {callerName}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
        <button onClick={onDecline}
          style={{
            background: '#EF4444', border: 'none', borderRadius: '50%',
            width: '48px', height: '48px', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}>
          <PhoneOff size={20} />
        </button>
        <button onClick={onAccept}
          style={{
            background: '#22C55E', border: 'none', borderRadius: '50%',
            width: '48px', height: '48px', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
            animation: 'pulse 1.5s infinite',
          }}>
          <Phone size={20} style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 4px 12px rgba(34,197,94,0.3); } 50% { box-shadow: 0 4px 24px rgba(34,197,94,0.6); } }
      `}</style>
    </div>
  );
}
