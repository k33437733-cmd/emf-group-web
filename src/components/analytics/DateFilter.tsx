import { memo, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import type { DatePreset } from '../../hooks/useAnalytics';

interface DateFilterProps {
  preset: DatePreset;
  onChange: (preset: DatePreset, start?: Date, end?: Date) => void;
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوم' },
  { key: '90d', label: 'آخر 90 يوم' },
  { key: 'year', label: 'هذه السنة' },
];

function DateFilterInner({ preset, onChange }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const currentLabel = PRESETS.find(p => p.key === preset)?.label ?? 'مخصص';

  const handleCustom = () => {
    if (customStart && customEnd) {
      onChange('custom', new Date(customStart), new Date(customEnd));
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-secondary"
        style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
      >
        <Calendar size={14} />
        <span>{currentLabel}</span>
        <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : '' }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="card-base"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
              minWidth: '220px', padding: 'var(--space-3)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => { onChange(p.key); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'right', padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)', border: 'none', background: preset === p.key ? 'var(--sidebar-active)' : 'transparent',
                  color: preset === p.key ? 'var(--sidebar-text-active)' : 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)', cursor: 'pointer', transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => { if (preset !== p.key) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                onMouseLeave={e => { if (preset !== p.key) e.currentTarget.style.background = 'transparent'; }}
              >
                {p.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="form-input" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }} />
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="form-input" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }} />
                <button onClick={handleCustom} className="btn btn-primary btn-sm" disabled={!customStart || !customEnd}>تطبيق</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(DateFilterInner);
