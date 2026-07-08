// ─── Enumerations ───────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'agent' | 'user';
export type UserStatus = 'active' | 'blocked' | 'pending';
export type OnlineStatus = 'online' | 'away' | 'offline';

// ─── Core Interfaces ────────────────────────────────────────────────────────

export interface UserPreferences {
  language: 'ar' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
}

export interface UserMetadata {
  loginCount: number;
  totalMessages: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  onlineStatus: OnlineStatus;
  lastSeen: string; // ISO string (Timestamp on server)
  fcmTokens: string[];
  createdAt: string;
  lastLogin: string;
  preferences: UserPreferences;
  metadata: UserMetadata;
}

// Lean version used for embedding in other documents
export interface UserSummary {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// ─── Agent Presence (separate high-frequency collection) ────────────────────

export interface AgentStatus {
  agentId: string;
  status: OnlineStatus | 'in_call';
  activeTickets: number;
  maxTickets: number;
  lastHeartbeat: string;
}

// ─── Auth Actions ────────────────────────────────────────────────────────────

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  name: string;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isUserProfile(val: unknown): val is UserProfile {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  return (
    typeof v['uid'] === 'string' &&
    typeof v['email'] === 'string' &&
    typeof v['role'] === 'string'
  );
}

export function isAdmin(user: UserProfile | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export function isSuperAdmin(user: UserProfile | null | undefined): boolean {
  return user?.role === 'super_admin';
}

export function isAgent(user: UserProfile | null | undefined): boolean {
  return (
    user?.role === 'agent' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin'
  );
}

// ─── Default Factory ─────────────────────────────────────────────────────────

export function defaultPreferences(): UserPreferences {
  return {
    language: 'ar',
    notifications: { email: true, push: true, sound: true },
  };
}

export function defaultMetadata(): UserMetadata {
  return { loginCount: 0, totalMessages: 0 };
}
