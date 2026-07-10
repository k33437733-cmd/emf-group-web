// ─── Client-side route paths ──────────────────────────────────────────────────
// Defined as a const object so no magic strings leak into components.

export const ROUTES = {
  HOME:             '/',
  LOGIN:            '/login',
  DASHBOARD:        '/dashboard',
  CONTENT:          '/content',

  // Internal chat (admin / agent only)
  CHAT:             '/chat',

  // Customer support
  SUPPORT:          '/support',

  // Admin sub-pages
  ADMIN_USERS:      '/admin/users',
  ADMIN_CONTENT:    '/admin/content',
  ADMIN_CANNED:     '/admin/canned-responses',
  ADMIN_AUDIT:      '/admin/audit',
  ADMIN_REPORTS:    '/admin/reports',
  ADMIN_RELEASE_NOTES: '/admin/release-notes',

  // Agent sub-pages
  AGENT_QUEUE:      '/agent/queue',
  AGENT_TICKET:     '/agent/ticket/:id',

  // Settings
  SETTINGS:         '/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Build a concrete ticket URL. */
export function ticketRoute(ticketId: string): string {
  return `/agent/ticket/${ticketId}`;
}
