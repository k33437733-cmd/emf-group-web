import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleNewToast = (newToast: ToastMessage) => {
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        removeToast(newToast.id);
      }, 4000);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" style={{ direction: 'rtl' }}>
      {toasts.map(toast => {
        let icon = <CheckCircle className="text-emerald-500" style={{ color: '#10b981' }} size={20} />;
        let borderColor = '#10b981';
        let bgGlow = 'rgba(16, 185, 129, 0.1)';

        if (toast.type === 'error') {
          icon = <XCircle style={{ color: '#ef4444' }} size={20} />;
          borderColor = '#ef4444';
          bgGlow = 'rgba(239, 68, 68, 0.1)';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle style={{ color: '#f59e0b' }} size={20} />;
          borderColor = '#f59e0b';
          bgGlow = 'rgba(245, 158, 11, 0.1)';
        } else if (toast.type === 'info') {
          icon = <Info style={{ color: '#3b82f6' }} size={20} />;
          borderColor = '#3b82f6';
          bgGlow = 'rgba(59, 130, 246, 0.1)';
        }

        return (
          <div
            key={toast.id}
            className="animate-fade"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(15, 22, 42, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRight: `4px solid ${borderColor}`,
              boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.5), ${bgGlow} 0px 4px 15px`,
              minWidth: '300px',
              maxWidth: '450px',
              justifyContent: 'space-between',
              color: '#f3f4f6'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {icon}
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
