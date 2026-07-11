export default function SkeletonChat() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '4px 0' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}><div style={{ height: '14px', width: '40%', borderRadius: '4px', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} /></div>
      </div>

      {/* Messages skeleton - alternating sides */}
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start', gap: '8px', padding: '0 16px' }}>
          <div style={{
            width: `${50 + Math.random() * 30}%`,
            height: `${24 + Math.random() * 24}px`,
            borderRadius: i % 2 === 0 ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: i % 2 === 0 ? 'rgba(0,210,255,0.12)' : 'var(--badge-bg)',
            animation: 'skeleton-pulse 1.5s infinite',
          }} />
        </div>
      ))}
    </div>
  );
}
