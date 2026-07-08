import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, X, MessageSquareText } from 'lucide-react';

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="animate-scale"
        style={{
          background: 'linear-gradient(160deg, rgba(10, 22, 40, 0.98), rgba(7, 18, 34, 0.96))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          borderRadius: '22px',
          width: '100%',
          maxWidth: '380px',
          padding: '34px 28px 24px',
          direction: 'rtl',
          position: 'relative',
          boxShadow:
            '0 30px 70px rgba(0, 0, 0, 0.55), ' +
            '0 0 50px rgba(56, 189, 248, 0.05), ' +
            'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* ── Close ─────────────────────────────────── */}
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="إغلاق"
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-muted, #6b7280)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
          }}
        >
          <X size={15} />
        </button>

        {/* ── Icon ──────────────────────────────────── */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0.03))',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            boxShadow: '0 0 30px rgba(56, 189, 248, 0.08), inset 0 0 20px rgba(56, 189, 248, 0.03)',
          }}
        >
          <Bell size={28} color="#38bdf8" />
        </div>

        {/* ── Customer info ─────────────────────────── */}
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted, #6b7280)',
            textAlign: 'center',
            marginBottom: '2px',
            letterSpacing: '0.3px',
          }}
        >
          رسالة جديدة من
        </div>
        <div
          style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: messagePreview ? '14px' : '24px',
            lineHeight: 1.4,
          }}
        >
          {customerName}
        </div>

        {/* ── Message preview ──────────────────────── */}
        {messagePreview && (
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary, #9ca3af)',
              textAlign: 'center',
              lineHeight: 1.65,
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              marginBottom: '26px',
              wordBreak: 'break-word',
            }}
          >
            {messagePreview}
          </div>
        )}

        {/* ── Buttons ───────────────────────────────── */}
        <button
          onClick={handleGoToCustomer}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: '#38bdf8',
            color: '#0a0f1d',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: '0 4px 18px rgba(56, 189, 248, 0.25)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#7dd3fc';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(56, 189, 248, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#38bdf8';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 18px rgba(56, 189, 248, 0.25)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0.5px)';
          }}
        >
          <MessageSquareText size={16} />
          الانتقال إلى العميل
        </button>

        <button
          onClick={handleViewNotifications}
          style={{
            width: '100%',
            padding: '8px 14px',
            background: '#fca5a5',
            color: '#0a0f1d',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fecaca';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fca5a5';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0.5px)';
          }}
        >
          عرض الإشعارات
        </button>
      </div>
    </div>,
    document.body,
  );
}
