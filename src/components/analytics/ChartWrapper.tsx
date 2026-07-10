import { memo, Suspense, lazy, type ReactNode } from 'react';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

function ChartWrapperInner({ title, subtitle, children, action, className }: ChartWrapperProps) {
  return (
    <div className={`card-base ${className || ''}`} style={{ padding: 'var(--space-5) var(--space-6)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ width: '100%', minHeight: 200 }}>
        {children}
      </div>
    </div>
  );
}

export default memo(ChartWrapperInner);
