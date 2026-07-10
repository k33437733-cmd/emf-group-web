interface LoaderProps {
  size?: number;
  color?: string;
}

export function Loader({ size = 28, color = '#3b82f6' }: LoaderProps) {
  return (
    <div
      className="animate-spin-fast"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid var(--border-color)`,
        borderTopColor: color,
        display: 'inline-block'
      }}
    />
  );
}

export function FullScreenLoader({ message = 'جاري التحميل...' }: { message?: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 15, 29, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#f3f4f6',
        direction: 'rtl'
      }}
    >
      <Loader size={48} color="#3b82f6" />
      <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>{message}</span>
    </div>
  );
}
