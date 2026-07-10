import { type CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = 'var(--radius-sm)', style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--badge-bg)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card-base" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Skeleton width="48px" height="48px" borderRadius="var(--radius-lg)" />
      <Skeleton width="60%" height="20px" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${70 + Math.random() * 30}%`} height="14px" />
      ))}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
        <Skeleton width="80px" height="36px" borderRadius="var(--radius-md)" />
        <Skeleton width="36px" height="36px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-6)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-color)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${80 / columns}%`} height="18px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 'var(--space-6)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} width={`${80 / columns}%`} height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid-cards">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}


