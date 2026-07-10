import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon = <Inbox size={48} />,
  title = 'لا توجد بيانات',
  message = 'لم يتم العثور على أي عناصر بعد.',
  action,
}: EmptyStateProps) {
  return (
    <div className="card-base" style={{
      padding: 'var(--space-16) var(--space-8)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-4)',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: 'var(--radius-2xl)',
        background: 'var(--badge-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          {title}
        </h4>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-tertiary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
      {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
    </div>
  );
}
