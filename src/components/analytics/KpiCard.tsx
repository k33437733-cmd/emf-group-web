import { memo } from 'react';
import * as Icons from 'lucide-react';
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
  const IconComp = (Icons as any)[icon] || Icons.BarChart3;
  const trendUp = trend >= 0;

  return (
    <div className="card-base" style={{ padding: 'var(--space-5) var(--space-6)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `${color}14`, flexShrink: 0 }}>
          <IconComp size={20} style={{ color }} />
        </div>
        <Sparkline data={sparklineData} color={color} />
      </div>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <div className="stat-number">{value.toLocaleString('ar-SA')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          <span className="small-label">{label}</span>
          <span style={{
            fontSize: 'var(--text-xs)', fontWeight: 700,
            color: trendUp ? 'var(--accent-emerald)' : 'var(--accent-red)',
            display: 'inline-flex', alignItems: 'center', gap: '2px',
          }}>
            {trendUp ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(KpiCardInner);
