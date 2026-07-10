import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = 'var(--accent-blue)', height = 40 }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const w = 80;
    const h = height;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  }, [data, height]);

  if (data.length < 2) return null;

  return (
    <svg width="80" height={height} viewBox={`0 0 80 ${height}`} style={{ flexShrink: 0 }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
