// ─── Firestore collection name constants ─────────────────────────────────────
// Every repository imports from here — no magic strings in query code.

export const COLLECTIONS = {
  USERS:            'users',
  AGENT_STATUS:     'agent_status',
  CONVERSATIONS:    'conversations',
  MESSAGES:         'messages',
  TICKETS:          'tickets',
  TICKET_COUNTERS:  'ticket_counters',   // single doc to track auto-increment seq
  CANNED_RESPONSES: 'canned_responses',
  NOTIFICATIONS:    'notifications',
  CONTENTS:         'contents',
  AUDIT_LOGS:       'audit_logs',
  BOT_SESSIONS:     'bot_sessions',
  TYPING:           'typing',            // ephemeral collection for typing indicators
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
