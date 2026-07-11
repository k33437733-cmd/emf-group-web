import { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  threshold?: number;
  rtl?: boolean;
}

export default function ScrollToBottomFAB({ scrollRef, threshold = 150, rtl = true }: Props) {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setVisible(el.scrollHeight - el.scrollTop - el.clientHeight > threshold);
  }, [scrollRef, threshold]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef, handleScroll]);

  const scroll = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button onClick={scroll} aria-label="الانتقال إلى الأسفل"
      style={{
        position: 'absolute', bottom: '80px',
        [rtl ? 'left' : 'right']: '20px',
        width: '40px', height: '40px', borderRadius: '50%',
        background: 'var(--color-primary)', border: 'none',
        color: '#050816', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,210,255,0.3)',
        zIndex: 50, transition: 'all 0.2s',
        animation: 'fabIn 0.25s ease',
      }}>
      <ChevronDown size={20} />
      <style>{`@keyframes fabIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`}</style>
    </button>
  );
}
