// ─── Application-wide configuration constants ─────────────────────────────────
// All tuneable values live here; never hard-code them in logic files.

// ─── Pagination ───────────────────────────────────────────────────────────────
export const MESSAGES_PAGE_SIZE       = 30;   // messages loaded per page
export const NOTIFICATIONS_PAGE_SIZE  = 50;
export const CONTENT_PAGE_SIZE        = 20;
export const USERS_PAGE_SIZE          = 50;
export const TICKETS_PAGE_SIZE        = 25;
export const AUDIT_LOGS_PAGE_SIZE     = 100;

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const TYPING_DEBOUNCE_MS       = 500;   // debounce before sending typing event
export const TYPING_TIMEOUT_MS        = 5_000; // clear typing indicator after inactivity
export const MAX_IMAGE_UPLOADS        = 5;     // per message
export const CHAT_IMAGE_MAX_SIZE_MB   = 5;

// ─── Tickets / SLA ────────────────────────────────────────────────────────────
// All values in minutes.
export const SLA_FIRST_RESPONSE: Record<string, number> = {
  urgent: 15,
  high:   60,
  normal: 240,  // 4 hours
  low:    1440, // 24 hours
};

export const SLA_RESOLUTION: Record<string, number> = {
  urgent: 120,   // 2 hours
  high:   480,   // 8 hours
  normal: 1440,  // 24 hours
  low:    4320,  // 3 days
};

export const MAX_TICKETS_PER_AGENT    = 10;   // default agent capacity

// ─── Agent presence ───────────────────────────────────────────────────────────
export const HEARTBEAT_INTERVAL_MS    = 30_000;  // 30 s
export const OFFLINE_THRESHOLD_MS     = 90_000;  // 90 s without heartbeat = offline

// ─── Data retention ───────────────────────────────────────────────────────────
export const MESSAGE_RETENTION_DAYS   = 90;  // Cloud Function scheduled cleanup
export const NOTIFICATION_EXPIRY_DAYS = 30;
export const AUDIT_LOG_RETENTION_DAYS = 365;

// ─── File storage ─────────────────────────────────────────────────────────────
// Large content files go to Supabase; chat attachments go to Firebase Storage.
export const SUPABASE_CONTENT_BUCKET  = 'contents';
export const FIREBASE_CHAT_BUCKET     = 'chat';   // path prefix inside Firebase Storage

// ─── Update system ────────────────────────────────────────────────────────────
export const UPDATE_CHECK_INTERVAL_MIN = 5;

// ─── Ticket number format ─────────────────────────────────────────────────────
export const TICKET_NUMBER_PREFIX = 'EMF';

export function buildTicketNumber(year: number, seq: number): string {
  return `${TICKET_NUMBER_PREFIX}-${year}-${String(seq).padStart(4, '0')}`;
}
