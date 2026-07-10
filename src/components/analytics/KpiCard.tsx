import { memo, type FC } from 'react';
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import Sparkline from './Sparkline';

interface KpiCardProps {
  label: string;
  value: number;
  trend: number;
  icon: string;
  color: string;
  sparklineData: number[];
}

function KpiCardInner({ label, value, trend, icon, color, sparklineData }: KpiCardProps) {
  const IconComp: FC<LucideProps> = (Icons as unknown as Record<string, FC<LucideProps>>)[icon] || Icons.BarChart3;
  const trendUp = trend >= 0;

  return (
    <div className="card-base kpi-card" style={{ padding: 'var(--space-5) var(--space-6)', position: 'relative', overflow: 'hidden' }}>
      <div className="kpi-card-top">
        <div className="kpi-icon" style={{ background: `${color}16`, color }}>
          <IconComp size={20} />
        </div>
        <Sparkline data={sparklineData} color={color} />
      </div>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <div className="stat-number">{(value ?? 0).toLocaleString('ar-SA')}</div>
        <div className="kpi-card-meta">
          <span className="small-label">{label}</span>
          <span className="kpi-trend" style={{ color: trendUp ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
            {trendUp ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(KpiCardInner);
