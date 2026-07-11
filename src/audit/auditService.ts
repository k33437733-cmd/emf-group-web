import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export type AuditAction =
  | 'message.sent'
  | 'message.edited'
  | 'message.deleted'
  | 'message.forwarded'
  | 'conversation.created'
  | 'conversation.archived'
  | 'conversation.transferred'
  | 'conversation.muted'
  | 'conversation.important'
  | 'user.login'
  | 'user.logout'
  | 'user.updated'
  | 'call.started'
  | 'call.ended'
  | 'settings.changed';

interface AuditEntry {
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...entry,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    });
  } catch {
    // Silent fail — audit should never block the main flow
  }
}

let auditQueue: AuditEntry[] = [];
let auditTimer: ReturnType<typeof setTimeout> | null = null;

export function enqueueAudit(entry: AuditEntry): void {
  auditQueue.push(entry);
  if (!auditTimer) {
    auditTimer = setTimeout(() => {
      const batch = [...auditQueue];
      auditQueue = [];
      auditTimer = null;
      Promise.all(batch.map(writeAuditLog)).catch(() => {});
    }, 2000);
  }
}

export function createAuditEntry(action: AuditAction, actorId: string, actorName: string, opts?: Partial<AuditEntry>): AuditEntry {
  return { action, actorId, actorName, ...opts };
}
