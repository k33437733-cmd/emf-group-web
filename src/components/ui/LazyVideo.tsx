import { useRef, useEffect, useState } from 'react';

interface LazyVideoProps {
  src: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function LazyVideo({ src, style, className }: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    videoRef.current?.pause();
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'hidden',
      }}
      className={className}
    >
      {nearViewport && (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
        />
      )}
    </div>
  );
}
