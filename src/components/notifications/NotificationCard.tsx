import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TicketPriority, TicketStatus, Ticket } from '../../types/support';
import { isOpenTicket } from '../../types/support';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

// ─── Priority & Status config ─────────────────────────────────────────────────

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low:    'منخفضة',
  normal: 'عادية',
  high:   'عالية',
  urgent: 'عاجلة',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  low:    '#6b7280',
  normal: '#3b82f6',
  high:   '#f59e0b',
  urgent: '#ef4444',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  new:               'جديد',
  open:              'مفتوحة',
  pending_customer:  'انتظار العميل',
  pending_agent:     'انتظار الوكيل',
  resolved:          'تم الحل',
  closed:            'مغلقة',
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  new:              '#3b82f6',
  open:             '#10b981',
  pending_customer: '#f59e0b',
  pending_agent:    '#8b5cf6',
  resolved:         '#6b7280',
  closed:           '#374151',
};

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface NotificationCardProps {
  conversationId: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  priority: TicketPriority;
  status: TicketStatus;
  isHighlighted?: boolean;
}

function NotificationCard({
  conversationId,
  customerName,
  lastMessage,
  lastMessageTime,
  unreadCount,
  priority,
  status,
  isHighlighted,
}: NotificationCardProps) {
  const navigate = useNavigate();
  const bgColor = useMemo(() => hashColor(customerName), [customerName]);
  const initialsText = useMemo(() => initials(customerName), [customerName]);
  const timeText = useMemo(() => relativeTime(lastMessageTime), [lastMessageTime]);
  const openActive = useMemo(() => isOpenTicket({ status } as Ticket), [status]);

  const handleClick = () => {
    navigate(`/chat?conv=${conversationId}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '14px',
        cursor: 'pointer',
        background: isHighlighted
          ? 'rgba(56, 189, 248, 0.06)'
          : unreadCount > 0
            ? 'rgba(255, 255, 255, 0.02)'
            : 'transparent',
        border: `1px solid ${
          isHighlighted
            ? 'rgba(56, 189, 248, 0.12)'
            : 'transparent'
        }`,
        transition: 'all 0.2s ease',
        position: 'relative',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isHighlighted
          ? 'rgba(56, 189, 248, 0.06)'
          : unreadCount > 0
            ? 'rgba(255, 255, 255, 0.02)'
            : 'transparent';
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = isHighlighted
          ? 'rgba(56, 189, 248, 0.12)'
          : 'transparent';
      }}
    >
      {/* ── Avatar ─────────────────────────────────── */}
      <div
        style={{
          width: '44px',
          height: '44px',
          minWidth: '44px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: 700,
          fontFamily: 'var(--font-en, sans-serif)',
          boxShadow: `0 2px 8px ${bgColor}44`,
        }}
      >
        {initialsText}
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Row 1: Name + Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: unreadCount > 0 ? 700 : 600,
              color: unreadCount > 0 ? '#ffffff' : 'var(--text-primary, #f3f4f6)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {customerName}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', direction: 'ltr' }}>
            {timeText}
          </span>
        </div>

        {/* Row 2: Last message */}
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary, #9ca3af)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
          }}
        >
          {lastMessage || 'بدون رسائل'}
        </div>

        {/* Row 3: Priority badge + Status badge + Unread */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          {/* Priority */}
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: `${PRIORITY_COLOR[priority]}22`,
              color: PRIORITY_COLOR[priority],
              border: `1px solid ${PRIORITY_COLOR[priority]}33`,
              lineHeight: '18px',
            }}
          >
            {PRIORITY_LABEL[priority]}
          </span>

          {/* Status (only for open tickets) */}
          {openActive && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                background: `${STATUS_COLOR[status]}22`,
                color: STATUS_COLOR[status],
                border: `1px solid ${STATUS_COLOR[status]}33`,
                lineHeight: '18px',
              }}
            >
              {STATUS_LABEL[status]}
            </span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              style={{
                background: 'var(--accent-red, #ef4444)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                minWidth: '20px',
                height: '20px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(NotificationCard);
