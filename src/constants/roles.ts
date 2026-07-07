import type { UserRole } from '../types/auth';

// ─── Super-admin seed list ────────────────────────────────────────────────────
// Single source of truth. Referenced by both client auth helpers AND
// Firestore security rules (keep in sync manually when emails change).
export const SUPER_ADMIN_EMAILS: ReadonlyArray<string> = [
  'amir@emf.com',
  'khaled@emf.com',
  'youssef@emf.com',
  'shereen@emf.com',
];

// ─── Role hierarchy (higher index = more privilege) ───────────────────────────
export const ROLE_HIERARCHY: ReadonlyArray<UserRole> = [
  'user',
  'agent',
  'admin',
  'super_admin',
];

export const ROLE_RANK: Readonly<Record<UserRole, number>> = {
  user:        0,
  agent:       1,
  admin:       2,
  super_admin: 3,
};

/** Returns true when `actor` outranks or equals `target`. */
export function hasRolePrivilege(actor: UserRole, target: UserRole): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK[target];
}

// ─── Display labels ───────────────────────────────────────────────────────────
export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  super_admin: 'مدير عام',
  admin:       'مدير',
  agent:       'وكيل دعم',
  user:        'عضو',
};

// ─── Permissions map ──────────────────────────────────────────────────────────
// Defines what each role is allowed to do. Used for client-side UI guards
// (server-side enforcement lives in Firestore rules + Cloud Functions).
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlyArray<string>>> = {
  super_admin: [
    'manage_users',
    'manage_roles',
    'manage_content',
    'view_all_tickets',
    'assign_tickets',
    'close_tickets',
    'view_audit_logs',
    'manage_canned_responses',
    'access_internal_chat',
    'access_support_inbox',
    'view_reports',
    'manage_system_config',
  ],
  admin: [
    'manage_content',
    'view_all_tickets',
    'assign_tickets',
    'close_tickets',
    'manage_canned_responses',
    'access_internal_chat',
    'access_support_inbox',
    'view_reports',
  ],
  agent: [
    'view_assigned_tickets',
    'reply_tickets',
    'close_tickets',
    'access_support_inbox',
  ],
  user: [
    'view_own_ticket',
    'send_support_message',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return (ROLE_PERMISSIONS[role] as string[]).includes(permission);
}

/** Derive initial role from email. All others default to 'user'. */
export function getRoleByEmail(email: string): UserRole {
  const normalised = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalised)
    ? 'super_admin'
    : 'user';
}
