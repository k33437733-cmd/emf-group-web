// ─── Enumerations ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'chat'
  | 'ticket_new'
  | 'ticket_assigned'
  | 'ticket_replied'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'sla_breach'
  | 'system'
  | 'upload';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'all';

// ─── Core Interface ───────────────────────────────────────────────────────────

export interface SystemNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
  link?: string;
  actionData?: Record<string, unknown>;
  channel: NotificationChannel;
  sentVia: {
    push: boolean;
    email: boolean;
  };
  // Sender info (optional — system notifications may have no sender)
  senderId?: string;
  senderName?: string;
}

// ─── Push Subscription ────────────────────────────────────────────────────────

export interface PushSubscription {
  userId: string;
  fcmToken: string;
  deviceType: 'web' | 'android' | 'ios';
  createdAt: string;
  lastUsed: string;
}

// ─── Batch Notification Request ───────────────────────────────────────────────

export interface NotificationRequest {
  recipientIds: string[];   // explicit list OR...
  broadcastToRole?: string; // ...everyone with this role
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  link?: string;
  actionData?: Record<string, unknown>;
  channel: NotificationChannel;
  senderId?: string;
  senderName?: string;
}
