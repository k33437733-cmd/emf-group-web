// ─── Enumerations ───────────────────────────────────────────────────────────

export type AuditAction =
  // Auth
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'password_reset'
  // User management
  | 'user_role_changed'
  | 'user_status_changed'
  | 'user_deleted'
  // Content
  | 'content_uploaded'
  | 'content_updated'
  | 'content_deleted'
  // Chat
  | 'message_deleted'
  | 'conversation_archived'
  // Tickets
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_priority_changed'
  | 'ticket_closed'
  // Admin
  | 'canned_response_created'
  | 'canned_response_updated'
  | 'canned_response_deleted'
  // System
  | 'data_cleanup'
  | 'system_config_changed';

export type AuditSeverity = 'info' | 'warning' | 'critical';

// ─── Core Interface ───────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;       // collection name (e.g. 'users', 'tickets')
  resourceId: string;     // doc ID of the affected resource
  description: string;
  severity: AuditSeverity;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function buildAuditLog(
  partial: Omit<AuditLog, 'id' | 'createdAt'>,
): Omit<AuditLog, 'id'> {
  return {
    ...partial,
    createdAt: new Date().toISOString(),
  };
}
