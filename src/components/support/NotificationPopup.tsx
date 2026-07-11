import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, ExternalLink, Bell } from 'lucide-react';
import { playNotificationSound } from '../../lib/notificationSound';

interface Alert {
  id: string;
  customerName: string;
  body: string;
  conversationId: string;
}

const listeners = new Set<(alert: Alert) => void>();

export function emitSupportNotification(alert: Alert) {
  listeners.forEach(fn => fn(alert));
}

export default function NotificationPopup() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const navigate = useNavigate();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handler = (alert: Alert) => {
      setAlerts(prev => {
        const existing = prev.find(a => a.id === alert.id);
        if (existing) {
          return prev.map(a => a.id === alert.id ? alert : a);
        }
        return [...prev, alert];
      });
      playNotificationSound();
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const dismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
  };

  const openConv = (convId: string) => {
    dismiss(convId);
    navigate(`/support?conv=${convId}`);
  };

  const openNotifications = () => {
    setAlerts([]);
    navigate('/support');
  };

  const showAll = alerts.length > 1;

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '80px', left: '20px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px', direction: 'rtl',
      maxWidth: '380px', width: '100%',
    }}>
      {showAll && (
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: '12px', padding: '10px 14px',
          border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
          animation: 'popupIn 0.25s ease',
        }} onClick={openNotifications}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={14} style={{ color: '#050816' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {alerts.length} رسائل جديدة
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {alerts.map(a => a.customerName).join('، ')}
            </div>
          </div>
          <X size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setAlerts([]); }} />
        </div>
      )}
      {!showAll && alerts.map(alert => (
        <div key={alert.id} style={{
          background: 'var(--bg-elevated)', borderRadius: '12px', overflow: 'hidden',
          border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'popupIn 0.25s ease',
        }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
              {alert.customerName.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alert.customerName}</span>
                <button onClick={() => dismiss(alert.id)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                  <X size={13} />
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {alert.body}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)' }}>
            <button onClick={() => openConv(alert.conversationId)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px', border: 'none', background: 'transparent', color: 'var(--color-primary)',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}>
              <MessageSquare size={12} /> فتح المحادثة
            </button>
            <button onClick={openNotifications} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px', border: 'none', borderRight: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}>
              <ExternalLink size={12} /> الإشعارات
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
