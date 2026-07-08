/**
 * UserRepository
 * All reads and writes to the `users` collection.
 * Never mutates role/status directly — those changes go through the service
 * layer which also writes audit logs.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { USERS_PAGE_SIZE } from '../../constants/config';
import type { UserProfile, UserRole, UserStatus } from '../../types/auth';
import { fromSnapshot, requireSnapshot, nowISO, wrapFirestoreError } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = () => collection(db, COLLECTIONS.USERS);
const ref = (uid: string) => doc(db, COLLECTIONS.USERS, uid);

// ─── Read operations ──────────────────────────────────────────────────────────

export async function getUserById(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(ref(uid));
    return fromSnapshot<UserProfile>(snap);
  } catch (err) {
    wrapFirestoreError(err, 'getUserById');
  }
}

export async function requireUserById(uid: string): Promise<UserProfile> {
  try {
    const snap = await getDoc(ref(uid));
    return requireSnapshot<UserProfile>(snap, `user:${uid}`);
  } catch (err) {
    wrapFirestoreError(err, 'requireUserById');
  }
}

/**
 * Paginated user list for the admin panel.
 * @param afterCursor - createdAt ISO string of the last item on the previous page
 */
export async function listUsers(
  afterCursor?: string,
  pageSize = USERS_PAGE_SIZE,
): Promise<UserProfile[]> {
  try {
    let q = query(col(), orderBy('createdAt', 'desc'), limit(pageSize));
    if (afterCursor) {
      q = query(col(), orderBy('createdAt', 'desc'), startAfter(afterCursor), limit(pageSize));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProfile));
  } catch (err) {
    wrapFirestoreError(err, 'listUsers');
  }
}

/** All agents/admins — used when assigning tickets. */
export async function listAgents(): Promise<UserProfile[]> {
  try {
    const q = query(
      col(),
      where('role', 'in', ['agent', 'admin', 'super_admin']),
      where('status', '==', 'active'),
    );
    const snap = await getDocs(q);
    let users = snap.docs.map(d => ({ ...d.data() }) as UserProfile);
    return users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (err) {
    wrapFirestoreError(err, 'listAgents');
    return [];
  }
}

/** Regular (non-staff) users — used to populate member chat list. */
export async function listRegularUsers(): Promise<UserProfile[]> {
  try {
    const q = query(col(), where('role', '==', 'user'));
    const snap = await getDocs(q);
    let users = snap.docs.map(d => ({ ...d.data() }) as UserProfile);
    return users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (err) {
    wrapFirestoreError(err, 'listRegularUsers');
    return [];
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToUsers(
  callback: (users: UserProfile[]) => void,
): Unsubscribe {
  const q = query(col(), orderBy('createdAt', 'desc'), limit(USERS_PAGE_SIZE));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ ...d.data() }) as UserProfile)),
    err => wrapFirestoreError(err, 'subscribeToUsers'),
  );
}

export function subscribeToUser(
  uid: string,
  callback: (user: UserProfile | null) => void,
): Unsubscribe {
  return onSnapshot(
    ref(uid),
    snap => callback(fromSnapshot<UserProfile>(snap)),
    err => wrapFirestoreError(err, 'subscribeToUser'),
  );
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Create or fully overwrite a user document.
 * Used during registration and profile seeding.
 */
export async function setUser(profile: UserProfile): Promise<void> {
  try {
    await setDoc(ref(profile.uid), profile);
  } catch (err) {
    wrapFirestoreError(err, 'setUser');
  }
}

/**
 * Partial update — only provided fields are changed.
 * Role and status updates are intentionally restricted here;
 * use updateUserRole / updateUserStatus which go through the service layer.
 */
export async function updateUser(
  uid: string,
  updates: Partial<
    Pick<UserProfile, 'name' | 'avatar' | 'phone' | 'preferences' | 'lastLogin' | 'onlineStatus' | 'lastSeen'>
  >,
): Promise<void> {
  try {
    await updateDoc(ref(uid), { ...updates, updatedAt: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'updateUser');
  }
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  try {
    await updateDoc(ref(uid), { role, updatedAt: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'updateUserRole');
  }
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  try {
    await updateDoc(ref(uid), { status, updatedAt: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'updateUserStatus');
  }
}

export async function addFcmToken(uid: string, token: string): Promise<void> {
  try {
    const profile = await requireUserById(uid);
    const tokens = Array.from(new Set([...profile.fcmTokens, token]));
    await updateDoc(ref(uid), { fcmTokens: tokens });
  } catch (err) {
    wrapFirestoreError(err, 'addFcmToken');
  }
}

export async function removeFcmToken(uid: string, token: string): Promise<void> {
  try {
    const profile = await requireUserById(uid);
    const tokens = profile.fcmTokens.filter(t => t !== token);
    await updateDoc(ref(uid), { fcmTokens: tokens });
  } catch (err) {
    wrapFirestoreError(err, 'removeFcmToken');
  }
}

export async function updateLoginMetadata(uid: string): Promise<void> {
  try {
    const snap = await getDoc(ref(uid));
    if (!snap.exists()) return;
    const current = snap.data().metadata?.loginCount ?? 0;
    await updateDoc(ref(uid), {
      lastLogin: nowISO(),
      'metadata.loginCount': current + 1,
    });
  } catch (err) {
    wrapFirestoreError(err, 'updateLoginMetadata');
  }
}
