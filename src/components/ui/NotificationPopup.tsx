import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, X, MessageSquareText, Eye } from 'lucide-react';

interface NotificationPopupProps {
  customerName: string;
  messagePreview?: string;
  conversationId: string;
  onClose: () => void;
}

export default function NotificationPopup({
  customerName,
  messagePreview,
  conversationId,
  onClose,
}: NotificationPopupProps) {
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleGoToCustomer = () => {
    navigate(`/chat?conv=${conversationId}`);
    onClose();
  };

  const handleViewNotifications = () => {
    navigate('/chat');
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="إشعار برسالة جديدة"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="animate-scale"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-2xl)',
          width: '100%',
          maxWidth: '380px',
          padding: '34px 28px 24px',
          direction: 'rtl',
          position: 'relative',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="إغلاق"
          className="modal-close-btn"
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
          }}
        >
          <X size={15} />
        </button>

        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sidebar-active)',
          border: '1px solid rgba(59,130,246,0.15)',
        }}>
          <Bell size={28} style={{ color: 'var(--accent-blue)' }} />
        </div>

        <div style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '2px',
        }}>
          رسالة جديدة من
        </div>
        <div style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textAlign: 'center',
          marginBottom: messagePreview ? 'var(--space-4)' : 'var(--space-6)',
          lineHeight: 1.4,
        }}>
          {customerName}
        </div>

        {messagePreview && (
          <div style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            lineHeight: 1.65,
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--badge-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: 'var(--space-6)',
            wordBreak: 'break-word',
          }}>
            {messagePreview}
          </div>
        )}

        <button
          onClick={handleGoToCustomer}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: 'var(--space-4) var(--space-5)',
            fontSize: 'var(--text-base)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <MessageSquareText size={16} />
          الانتقال إلى العميل
        </button>

        <button
          onClick={handleViewNotifications}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <Eye size={16} />
          عرض الإشعارات
        </button>
      </div>
    </div>,
    document.body,
  );
}
