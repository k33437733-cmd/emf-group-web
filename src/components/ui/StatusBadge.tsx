interface StatusBadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'gold';
  label: string;
  dot?: boolean;
}

const variants: Record<string, { bg: string; color: string; border: string }> = {
  success: { bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.2)' },
  warning: { bg: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)', border: 'rgba(245,158,11,0.2)' },
  danger:  { bg: 'rgba(239,68,68,0.1)',   color: 'var(--accent-red)',   border: 'rgba(239,68,68,0.2)' },
  info:    { bg: 'rgba(59,130,246,0.1)',  color: 'var(--accent-blue)',  border: 'rgba(59,130,246,0.2)' },
  gold:    { bg: 'rgba(241,196,15,0.1)',  color: 'var(--accent-gold)',  border: 'rgba(241,196,15,0.2)' },
  default: { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: 'var(--border-color)' },
};

export default function StatusBadge({ variant = 'default', label, dot = false }: StatusBadgeProps) {
  const v = variants[variant] || variants.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: v.color,
            display: 'inline-block',
          }}
        />
      )}
      {label}
    </span>
  );
}
