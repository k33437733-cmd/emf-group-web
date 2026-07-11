import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  status: 'online' | 'offline' | 'reconnecting';
  rtl?: boolean;
}

export default function ReconnectIndicator({ status, rtl = true }: Props) {
  if (status === 'online') return null;

  const isOffline = status === 'offline';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      padding: '6px 16px',
      background: isOffline ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
      borderBottom: `1px solid ${isOffline ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
      fontSize: '0.72rem', fontWeight: 600,
      color: isOffline ? '#EF4444' : '#F59E0B',
      animation: 'fadeIn 0.3s ease',
      flexShrink: 0,
    }}>
      {isOffline ? <WifiOff size={14} /> : <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      <span>{isOffline
        ? (rtl ? 'أنت غير متصل بالإنترنت' : 'You are offline')
        : (rtl ? 'جاري إعادة الاتصال...' : 'Reconnecting...')}
      </span>
    </div>
  );
}
