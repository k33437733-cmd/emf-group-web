import { Check, CheckCheck, Clock, Loader2 } from 'lucide-react';
import type { DeliveryStatus as DeliveryStatusType } from '../../types';

interface Props {
  status: DeliveryStatusType;
  edited?: boolean;
  deleted?: boolean;
}

export default function DeliveryStatus({ status, edited, deleted }: Props) {
  if (deleted) return null;
  const icon = status === 'sent' ? <Check size={12} />
    : status === 'delivered' ? <CheckCheck size={12} />
    : status === 'read' ? <CheckCheck size={12} style={{ color: 'var(--color-primary)' }} />
    : <Clock size={12} style={{ opacity: 0.5 }} />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', color: 'var(--text-tertiary)', lineHeight: 1 }}>
      {edited && <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>edited </span>}
      {icon}
    </span>
  );
}
