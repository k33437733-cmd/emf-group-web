// ─── Custom DOM / window event names ─────────────────────────────────────────
// Used with window.dispatchEvent / window.addEventListener.

export const APP_EVENTS = {
  UPDATE_AVAILABLE:   'app:update-available',
  UPDATE_APPLIED:     'app:update-applied',
  AGENT_HEARTBEAT:    'app:agent-heartbeat',
  TICKET_ASSIGNED:    'app:ticket-assigned',
  FORCE_LOGOUT:       'app:force-logout',      // emitted when server blocks user
} as const;

export type AppEvent = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];
