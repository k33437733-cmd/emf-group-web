import { useState, useEffect, type FC } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export function showToast(message: string, type: ToastType = 'success') {
  const toast: ToastMessage = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    type
  };
  listeners.forEach(listener => listener(toast));
}

const config: Record<ToastType, { icon: FC<LucideProps>; border: string; glow: string }> = {
  success: { icon: CheckCircle, border: 'var(--accent-emerald)', glow: 'rgba(16,185,129,0.12)' },
  error:   { icon: XCircle,      border: 'var(--accent-red)',     glow: 'rgba(239,68,68,0.12)' },
  warning: { icon: AlertTriangle,border: 'var(--accent-amber)',   glow: 'rgba(245,158,11,0.12)' },
  info:    { icon: Info,          border: 'var(--accent-blue)',    glow: 'rgba(59,130,246,0.12)' },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleNewToast = (newToast: ToastMessage) => {
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => removeToast(newToast.id), 4000);
    };
    listeners.add(handleNewToast);
    return () => { listeners.delete(handleNewToast); };
  }, []);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--space-6)',
      left: 'var(--space-6)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      direction: 'rtl',
    }}>
      {toasts.map(toast => {
        const c = config[toast.type];
        const Icon = c.icon;
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-elevated)',
              border: `1px solid var(--border-color)`,
              borderRight: `3px solid ${c.border}`,
              boxShadow: `var(--shadow-elevated), 0 0 20px ${c.glow}`,
              minWidth: '320px',
              maxWidth: '460px',
              justifyContent: 'space-between',
              color: 'var(--text-primary)',
              animation: 'toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Icon size={20} style={{ color: c.border, flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} style={{
              background: 'none', border: 'none', color: 'var(--text-tertiary)',
              cursor: 'pointer', display: 'flex', padding: '2px', flexShrink: 0,
            }}>
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
