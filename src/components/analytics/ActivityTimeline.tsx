import { memo, type FC } from 'react';
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ActivityEvent } from '../../hooks/useAnalytics';

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

function ActivityTimelineInner({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
        لا توجد أحداث حتى الآن
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 420, overflowY: 'auto', paddingLeft: 'var(--space-2)' }}>
      {events.map((event, i) => {
        const IconComp: FC<LucideProps> = (Icons as Record<string, FC<LucideProps>>)[event.icon] || Icons.Circle;
        return (
          <div
            key={event.id}
            style={{
              display: 'flex', gap: 'var(--space-3)',
              padding: 'var(--space-3) 0',
              position: 'relative',
              borderBottom: i < events.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            {/* Timeline dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 'var(--radius-full)',
                background: `${event.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
              }}>
                <IconComp size={10} style={{ color: event.color }} />
              </div>
              {i < events.length - 1 && (
                <div style={{ width: 1, flex: 1, background: 'var(--border-color)', marginTop: '4px' }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: i < events.length - 1 ? 0 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{event.user}</span>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', direction: 'ltr', whiteSpace: 'nowrap' }}>
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                {event.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} ي`;
  return new Date(iso).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

export default memo(ActivityTimelineInner);
