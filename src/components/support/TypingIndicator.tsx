interface Props { userName: string; rtl?: boolean }

export default function TypingIndicator({ userName, rtl = true }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', gap: '3px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--text-tertiary)',
            animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
        {userName} يكتب...
      </span>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
