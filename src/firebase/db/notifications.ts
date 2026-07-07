/**
 * NotificationRepository
 * All reads and writes to the `notifications` collection.
 *
 * Key design decisions:
 * - NO global fan-out writes (the old sendGlobalNotification wrote N docs
 *   for N users — extremely expensive). Instead, admin-scoped notifications
 *   are handled by a Cloud Function that batches by role.
 * - Each notification document is owned by one recipient (recipientId).
 * - Expired notifications are pruned by a scheduled Cloud Function.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { NOTIFICATIONS_PAGE_SIZE, NOTIFICATION_EXPIRY_DAYS } from '../../constants/config';
import type { SystemNotification } from '../../types/notification';
import { nowISO, addDays, wrapFirestoreError } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = () => collection(db, COLLECTIONS.NOTIFICATIONS);
const ref = (id: string) => doc(db, COLLECTIONS.NOTIFICATIONS, id);

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getNotificationById(id: string): Promise<SystemNotification | null> {
  try {
    const snap = await getDoc(ref(id));
    if (!snap.exists()) return null;
    return snap.data() as SystemNotification;
  } catch (err) {
    wrapFirestoreError(err, 'getNotificationById');
  }
}

export async function listNotifications(
  recipientId: string,
  afterCursor?: string,
  pageSize = NOTIFICATIONS_PAGE_SIZE,
): Promise<SystemNotification[]> {
  try {
    let q = query(
      col(),
      where('recipientId', '==', recipientId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    if (afterCursor) {
      q = query(
        col(),
        where('recipientId', '==', recipientId),
        orderBy('createdAt', 'desc'),
        startAfter(afterCursor),
        limit(pageSize),
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SystemNotification);
  } catch (err) {
    wrapFirestoreError(err, 'listNotifications');
  }
}

export function subscribeToNotifications(
  recipientId: string,
  callback: (notifications: SystemNotification[]) => void,
  pageSize = NOTIFICATIONS_PAGE_SIZE,
): Unsubscribe {
  const q = query(
    col(),
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data() as SystemNotification)),
    err => wrapFirestoreError(err, 'subscribeToNotifications'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Create a single notification for one recipient.
 */
export async function createNotification(
  n: Omit<SystemNotification, 'id' | 'read' | 'createdAt' | 'sentVia'>,
): Promise<SystemNotification> {
  try {
    const notifRef = doc(col());
    const notif: SystemNotification = {
      ...n,
      id:        notifRef.id,
      read:      false,
      createdAt: nowISO(),
      expiresAt: addDays(NOTIFICATION_EXPIRY_DAYS),
      sentVia:   { push: false, email: false },
    };
    await setDoc(notifRef, notif);
    return notif;
  } catch (err) {
    wrapFirestoreError(err, 'createNotification');
  }
}

/**
 * Batch-create notifications for a list of recipients.
 * Capped at 400 per batch (Firestore limit is 500).
 */
export async function createNotificationsForMany(
  recipientIds: string[],
  base: Omit<SystemNotification, 'id' | 'read' | 'createdAt' | 'sentVia' | 'recipientId' | 'expiresAt'>,
): Promise<void> {
  if (recipientIds.length === 0) return;

  try {
    const chunkSize = 400;
    for (let i = 0; i < recipientIds.length; i += chunkSize) {
      const chunk = recipientIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      const ts = nowISO();
      const exp = addDays(NOTIFICATION_EXPIRY_DAYS);

      chunk.forEach(recipientId => {
        const notifRef = doc(col());
        const notif: SystemNotification = {
          ...base,
          id:          notifRef.id,
          recipientId,
          read:        false,
          createdAt:   ts,
          expiresAt:   exp,
          sentVia:     { push: false, email: false },
        };
        batch.set(notifRef, notif);
      });

      await batch.commit();
    }
  } catch (err) {
    wrapFirestoreError(err, 'createNotificationsForMany');
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(ref(notificationId), { read: true });
  } catch (err) {
    wrapFirestoreError(err, 'markAsRead');
  }
}

export async function markAllAsRead(recipientId: string): Promise<void> {
  try {
    const q = query(
      col(),
      where('recipientId', '==', recipientId),
      where('read', '==', false),
      limit(400),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (err) {
    wrapFirestoreError(err, 'markAllAsRead');
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(ref(id));
  } catch (err) {
    wrapFirestoreError(err, 'deleteNotification');
  }
}

// ─── Scheduled cleanup helper ─────────────────────────────────────────────────

export async function purgeExpiredNotifications(): Promise<number> {
  try {
    const q = query(col(), where('expiresAt', '<', nowISO()), limit(400));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return snap.docs.length;
  } catch (err) {
    wrapFirestoreError(err, 'purgeExpiredNotifications');
  }
}
