import type { UserProfile } from '../types';

export type Action =
  | 'conversation:read'
  | 'conversation:write'
  | 'conversation:delete'
  | 'conversation:transfer'
  | 'conversation:archive'
  | 'conversation:mute'
  | 'message:send'
  | 'message:edit'
  | 'message:delete'
  | 'message:forward'
  | 'message:react'
  | 'message:pin'
  | 'user:manage'
  | 'user:ban'
  | 'settings:read'
  | 'settings:write'
  | 'analytics:view'
  | 'admin:panel';

export type Role = 'user' | 'agent' | 'admin' | 'super_admin';

const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  agent: 1,
  admin: 2,
  super_admin: 3,
};

const PERMISSION_MATRIX: Record<Action, Role[]> = {
  'conversation:read': ['user', 'agent', 'admin', 'super_admin'],
  'conversation:write': ['user', 'agent', 'admin', 'super_admin'],
  'conversation:delete': ['admin', 'super_admin'],
  'conversation:transfer': ['admin', 'super_admin'],
  'conversation:archive': ['admin', 'super_admin'],
  'conversation:mute': ['admin', 'super_admin'],
  'message:send': ['user', 'agent', 'admin', 'super_admin'],
  'message:edit': ['user', 'agent', 'admin', 'super_admin'],
  'message:delete': ['user', 'agent', 'admin', 'super_admin'],
  'message:forward': ['admin', 'super_admin'],
  'message:react': ['user', 'agent', 'admin', 'super_admin'],
  'message:pin': ['admin', 'super_admin'],
  'user:manage': ['admin', 'super_admin'],
  'user:ban': ['super_admin'],
  'settings:read': ['user', 'agent', 'admin', 'super_admin'],
  'settings:write': ['user', 'agent', 'admin', 'super_admin'],
  'analytics:view': ['admin', 'super_admin'],
  'admin:panel': ['admin', 'super_admin'],
};

export function hasPermission(user: UserProfile | null, action: Action): boolean {
  if (!user) return false;
  const role = user.role as Role || 'user';
  const allowed = PERMISSION_MATRIX[action];
  return allowed.includes(role);
}

export function isRoleAtLeast(user: UserProfile | null, minimum: Role): boolean {
  if (!user) return false;
  const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
  const minLevel = ROLE_HIERARCHY[minimum];
  return userLevel >= minLevel;
}

export function canActOnMessage(user: UserProfile | null, messageSenderId: string): boolean {
  if (!user) return false;
  if (user.uid === messageSenderId) return true;
  return isRoleAtLeast(user, 'admin');
}

export function canAccessConversation(user: UserProfile | null, memberUids: string[]): boolean {
  if (!user) return false;
  if (memberUids.includes(user.uid)) return true;
  return isRoleAtLeast(user, 'admin');
}

export function isAdmin(user: UserProfile | null): boolean {
  return isRoleAtLeast(user, 'admin');
}
