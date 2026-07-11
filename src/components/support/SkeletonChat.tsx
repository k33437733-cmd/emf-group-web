export default function SkeletonChat() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 0' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}><div style={{ height: '14px', width: '40%', borderRadius: '4px', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} /></div>
      </div>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start', gap: '8px' }}>
          <div style={{ width: '60%', height: `${30 + Math.random() * 40}px`, borderRadius: '12px', background: 'var(--badge-bg)', animation: 'skeleton-pulse 1.5s infinite' }} />
        </div>
      ))}
    </div>
  );
}
