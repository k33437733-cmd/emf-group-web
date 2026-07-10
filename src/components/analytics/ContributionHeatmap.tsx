import { useState, useMemo } from 'react';
import { useI18n } from '../../context/I18nContext';

interface HeatmapTile {
  date: string;
  count: number;
  dayIndex: number;
  weekIndex: number;
}

export default function ContributionHeatmap() {
  const { rtl } = useI18n();
  const [hoveredTile, setHoveredTile] = useState<HeatmapTile | null>(null);

  // Generate 24 weeks of mock activity data
  const data = useMemo(() => {
    const list: HeatmapTile[] = [];
    const now = new Date();
    // Start 24 weeks ago
    const startDate = new Date(now.getTime() - 24 * 7 * 24 * 60 * 60 * 1000);
    
    for (let w = 0; w < 24; w++) {
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startDate.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000);
        // Generate random activity level weighted toward lower activity
        const rand = Math.random();
        const count = rand > 0.85 ? Math.floor(Math.random() * 8) + 3 : rand > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
        
        list.push({
          date: currentDate.toISOString().slice(0, 10),
          count,
          dayIndex: d,
          weekIndex: w,
        });
      }
    }
    return list;
  }, []);

  const dayLabels = rtl ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خميس', 'جمع', 'سبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Helper to color tiles
  const getShadingColor = (count: number) => {
    if (count === 0) return 'var(--border-light)';
    if (count <= 2) return 'rgba(16, 185, 129, 0.15)'; // Emerald-500 alpha
    if (count <= 4) return 'rgba(16, 185, 129, 0.4)';
    if (count <= 7) return 'rgba(16, 185, 129, 0.7)';
    return 'rgba(16, 185, 129, 1)'; // Emerald-500 fully filled
  };

  return (
    <div style={{ padding: 'var(--space-2) 0', width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', minWidth: '480px', alignItems: 'flex-start', flexDirection: rtl ? 'row' : 'row' }}>
        
        {/* Days label column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '16px', color: 'var(--text-tertiary)', fontSize: '0.68rem', width: '32px' }}>
          {dayLabels.map((lbl, idx) => (
            idx % 2 === 0 ? <span key={idx} style={{ height: '10px', display: 'flex', alignItems: 'center' }}>{lbl}</span> : <div key={idx} style={{ height: '10px' }} />
          ))}
        </div>

        {/* Heatmap Grid container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {/* Month headers row (approximate) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: rtl ? 0 : '12px', paddingRight: rtl ? '12px' : 0, color: 'var(--text-tertiary)', fontSize: '0.68rem', marginBottom: '2px' }}>
            <span>{rtl ? 'منذ 6 أشهر' : '6 months ago'}</span>
            <span>{rtl ? 'منذ 3 أشهر' : '3 months ago'}</span>
            <span>{rtl ? 'الآن' : 'Now'}</span>
          </div>

          {/* Actual grid matrix (weeks as columns, days as rows) */}
          <div style={{ display: 'flex', gap: '4px', direction: 'ltr' }}>
            {Array.from({ length: 24 }).map((_, weekIdx) => (
              <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const tile = data.find(t => t.weekIndex === weekIdx && t.dayIndex === dayIdx);
                  if (!tile) return null;

                  return (
                    <div
                      key={dayIdx}
                      onMouseEnter={() => setHoveredTile(tile)}
                      onMouseLeave={() => setHoveredTile(null)}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: getShadingColor(tile.count),
                        cursor: 'pointer',
                        transition: 'transform 100ms ease, background 150ms ease',
                        transform: hoveredTile?.date === tile.date ? 'scale(1.3)' : 'none',
                        border: '1px solid rgba(0,0,0,0.05)',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Tooltip Display */}
      <div style={{
        marginTop: 'var(--space-3)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        minHeight: '16px',
        textAlign: rtl ? 'right' : 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.68rem' }}>{rtl ? 'أقل' : 'Less'}</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: 'var(--border-light)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: 'rgba(16, 185, 129, 0.15)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: 'rgba(16, 185, 129, 0.5)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: 'rgba(16, 185, 129, 1)' }} />
          <span style={{ fontSize: '0.68rem' }}>{rtl ? 'أكثر' : 'More'}</span>
        </div>
        <span style={{ margin: '0 var(--space-2)' }}>|</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {hoveredTile
            ? `${hoveredTile.count} ${rtl ? 'عمليات' : 'actions'} - ${new Date(hoveredTile.date).toLocaleDateString(rtl ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
            : (rtl ? 'مرر الماوس لمشاهدة تفاصيل الأحداث' : 'Hover over squares for details')}
        </span>
      </div>
    </div>
  );
}
