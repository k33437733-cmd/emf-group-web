import { memo, useState, useCallback } from 'react';
import {
  Settings,
  RefreshCw,
  Shield,
  Users,
  FileText,
  Headphones,
  FolderKanban,
  MessageSquare,
  Bell,
  Check,
  Archive,
  Trash2,
} from 'lucide-react';
import type { SystemNotification, NotificationCategory } from '../../types/notification';

const CATEGORY_ICON: Record<NotificationCategory, typeof Settings> = {
  system: Settings,
  updates: RefreshCw,
  security: Shield,
  users: Users,
  content: FileText,
  support: Headphones,
  projects: FolderKanban,
  messages: MessageSquare,
};

const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  system: '#6b7280',
  updates: '#3b82f6',
  security: '#ef4444',
  users: '#8b5cf6',
  content: '#10b981',
  support: '#f59e0b',
  projects: '#06b6d4',
  messages: '#ec4899',
};

interface NotificationItemProps {
  notification: SystemNotification;
  relativeTime: string;
  onClick: () => void;
  onAction: (action: 'read' | 'archive' | 'delete') => void;
}

function NotificationItem({ notification, relativeTime, onClick, onAction }: NotificationItemProps) {
  const [hovered, setHovered] = useState(false);
  const n = notification;
  const Icon = CATEGORY_ICON[n.category] || Bell;
  const color = CATEGORY_COLOR[n.category] || '#6b7280';

  const handleAction = useCallback(
    (e: React.MouseEvent, action: 'read' | 'archive' | 'delete') => {
      e.stopPropagation();
      onAction(action);
    },
    [onAction],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 14px',
        cursor: 'pointer',
        background: hovered
          ? 'var(--sidebar-hover)'
          : n.read
            ? 'transparent'
            : 'var(--sidebar-active)',
        borderBottom: '1px solid var(--border-light)',
        transition: 'background 0.15s ease',
        position: 'relative',
        outline: 'none',
        alignItems: 'flex-start',
      }}
      onFocus={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
      onBlur={(e) => {
        e.currentTarget.style.background = n.read ? 'transparent' : 'var(--sidebar-active)';
      }}
    >
      {/* Unread dot */}
      {!n.read && (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '4px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent-blue, #3b82f6)',
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: '34px',
          height: '34px',
          minWidth: '34px',
          borderRadius: '10px',
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          marginTop: '1px',
        }}
      >
        <Icon size={16} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: n.read ? 500 : 700,
              color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.4,
            }}
          >
            {n.title}
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', direction: 'ltr', flexShrink: 0, marginTop: '1px' }}>
            {relativeTime}
          </span>
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
            marginTop: '2px',
          }}
        >
          {n.body}
        </div>

        {/* Actions on hover */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            marginTop: '6px',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            height: hovered ? 'auto' : '0',
            overflow: hovered ? 'visible' : 'hidden',
          }}
        >
          {!n.read && (
            <ActionBtn
              icon={<Check size={11} />}
              label="تحديد كمقروء"
              color="var(--accent-blue)"
              onClick={(e) => handleAction(e, 'read')}
            />
          )}
          <ActionBtn
            icon={<Archive size={11} />}
            label="أرشفة"
            color="var(--text-tertiary)"
            onClick={(e) => handleAction(e, 'archive')}
          />
          <ActionBtn
            icon={<Trash2 size={11} />}
            label="حذف"
            color="var(--accent-red)"
            onClick={(e) => handleAction(e, 'delete')}
          />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '3px 7px',
        borderRadius: '5px',
        border: 'none',
        background: 'transparent',
        color,
        fontSize: '0.62rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--badge-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      {label}
    </button>
  );
}

export default memo(NotificationItem);
