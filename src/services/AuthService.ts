/**
 * AuthService
 * Orchestrates Firebase Auth operations with profile management,
 * role derivation, blocked-user enforcement, and audit logging.
 *
 * Single entry point for all authentication actions.
 * Components must never import firebase/auth or user repositories directly.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserById, setUser, updateUser, updateLoginMetadata } from '../firebase/db/users';
import { writeAuditLog } from '../firebase/db/audit';
import { getRoleByEmail } from '../constants/roles';
import { defaultPreferences, defaultMetadata } from '../types/auth';
import type { UserProfile } from '../types/auth';
import { APP_EVENTS } from '../constants/events';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Build a fresh UserProfile for a newly registered Firebase user. */
function buildNewProfile(fbUser: FirebaseUser, name: string): UserProfile {
  const email = (fbUser.email ?? '').toLowerCase();
  const now   = new Date().toISOString();
  return {
    uid:          fbUser.uid,
    name:         name.trim(),
    email,
    role:         getRoleByEmail(email),
    status:       'active',
    onlineStatus: 'online',
    lastSeen:     now,
    fcmTokens:    [],
    createdAt:    now,
    lastLogin:    now,
    preferences:  defaultPreferences(),
    metadata:     defaultMetadata(),
  };
}

/**
 * Hydrate a Firestore profile for an authenticated Firebase user.
 * If the document is missing (legacy account / creation race), create it.
 */
async function hydrateProfile(fbUser: FirebaseUser): Promise<UserProfile | null> {
  let profile = await getUserById(fbUser.uid);

  if (!profile) {
    const name = fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'مستخدم';
    profile    = buildNewProfile(fbUser, name);
    await setUser(profile);
  }

  return profile;
}

// ─── Auth state listener ──────────────────────────────────────────────────────

/**
 * Subscribe to Firebase Auth state changes.
 * Hydrates the Firestore profile on each sign-in and enforces
 * the blocked-user policy by forcing sign-out when status === 'blocked'.
 */
export function subscribeToAuthState(
  onProfile: (profile: UserProfile | null) => void,
): () => void {
  return onAuthStateChanged(auth, async fbUser => {
    if (!fbUser) {
      onProfile(null);
      return;
    }

    try {
      const profile = await hydrateProfile(fbUser);

      if (!profile || profile.status === 'blocked') {
        await fbSignOut(auth);
        onProfile(null);
        window.dispatchEvent(
          new CustomEvent(APP_EVENTS.FORCE_LOGOUT, { detail: { reason: 'blocked' } }),
        );
        return;
      }

      onProfile(profile);
    } catch (err) {
      console.error('[AuthService] hydrateProfile error:', err);
      onProfile(null);
    }
  });
}

// ─── Sign in ──────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile    = await hydrateProfile(credential.user);

  if (!profile) {
    await fbSignOut(auth);
    throw Object.assign(new Error('Profile not found'), { code: 'auth/profile-missing' });
  }

  if (profile.status === 'blocked') {
    await fbSignOut(auth);
    throw Object.assign(new Error('Account is blocked'), { code: 'auth/user-blocked' });
  }

  // Non-blocking — failures must not break the sign-in flow
  updateLoginMetadata(profile.uid).catch(() => {});
  writeAuditLog(profile, 'user_login', 'users', profile.uid, `تسجيل الدخول: ${profile.email}`).catch(() => {});

  return { ...profile, lastLogin: new Date().toISOString() };
}

// ─── Sign up ──────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<UserProfile> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw Object.assign(new Error('Name is required'), { code: 'auth/name-required' });
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const profile    = buildNewProfile(credential.user, trimmedName);

  await setUser(profile);

  writeAuditLog(
    profile,
    'user_register',
    'users',
    profile.uid,
    `تسجيل حساب جديد: ${profile.email}`,
  ).catch(() => {});

  return profile;
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(user: UserProfile): Promise<void> {
  // Update presence before sign-out so listeners see the offline state
  await updateUser(user.uid, {
    onlineStatus: 'offline',
    lastSeen:     new Date().toISOString(),
  });
  writeAuditLog(user, 'user_logout', 'users', user.uid, 'تسجيل الخروج').catch(() => {});
  await fbSignOut(auth);
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}
