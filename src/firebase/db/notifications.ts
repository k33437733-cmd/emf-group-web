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
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { NOTIFICATIONS_PAGE_SIZE, NOTIFICATION_EXPIRY_DAYS } from '../../constants/config';
import type { SystemNotification, NotificationCategory } from '../../types/notification';
import { nowISO, addDays, wrapFirestoreError } from './base';

const col = () => collection(db, COLLECTIONS.NOTIFICATIONS);
const ref = (id: string) => doc(db, COLLECTIONS.NOTIFICATIONS, id);

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
  opts?: {
    lastDoc?: Record<string, unknown> | null;
    pageSize?: number;
    category?: NotificationCategory;
    archived?: boolean;
  },
): Promise<SystemNotification[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('recipientId', '==', recipientId),
      where('archived', '==', opts?.archived ?? false),
      orderBy('createdAt', 'desc'),
      limit(opts?.pageSize ?? NOTIFICATIONS_PAGE_SIZE),
    ];
    if (opts?.category) {
      constraints.unshift(where('category', '==', opts.category));
    }
    if (opts?.lastDoc) {
      constraints.push(startAfter(opts.lastDoc.createdAt));
    }
    const snap = await getDocs(query(col(), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification));
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
    where('archived', '==', false),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification))),
    err => wrapFirestoreError(err, 'subscribeToNotifications'),
  );
}

export function subscribeNotificationsFiltered(
  recipientId: string,
  callback: (notifications: SystemNotification[]) => void,
  opts?: {
    category?: NotificationCategory | null;
    pageSize?: number;
  },
): Unsubscribe {
  try {
    const constraints: QueryConstraint[] = [
      where('recipientId', '==', recipientId),
      where('archived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(opts?.pageSize ?? NOTIFICATIONS_PAGE_SIZE),
    ];
    if (opts?.category) {
      constraints.unshift(where('category', '==', opts.category));
    }
    const q = query(col(), ...constraints);
    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification))),
      err => wrapFirestoreError(err, 'subscribeNotificationsFiltered'),
    );
  } catch (err) {
    wrapFirestoreError(err, 'subscribeNotificationsFiltered');
  }
}

export function subscribeNotificationsPaginated(
  recipientId: string,
  callback: (notifications: SystemNotification[]) => void,
  opts?: {
    category?: NotificationCategory | null;
    archived?: boolean;
    pageSize?: number;
    afterCursor?: string;
  },
): Unsubscribe {
  try {
    const constraints: QueryConstraint[] = [
      where('recipientId', '==', recipientId),
      where('archived', '==', opts?.archived ?? false),
      orderBy('createdAt', 'desc'),
      limit(opts?.pageSize ?? NOTIFICATIONS_PAGE_SIZE),
    ];
    if (opts?.category) {
      constraints.unshift(where('category', '==', opts.category));
    }
    if (opts?.afterCursor) {
      constraints.push(startAfter(opts.afterCursor));
    }
    const q = query(col(), ...constraints);
    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification))),
      err => wrapFirestoreError(err, 'subscribeNotificationsPaginated'),
    );
  } catch (err) {
    wrapFirestoreError(err, 'subscribeNotificationsPaginated');
  }
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  try {
    const q = query(
      col(),
      where('recipientId', '==', recipientId),
      where('read', '==', false),
      where('archived', '==', false),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    wrapFirestoreError(err, 'getUnreadCount');
  }
}

export function subscribeUnreadCount(
  recipientId: string,
  callback: (count: number) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('recipientId', '==', recipientId),
    where('read', '==', false),
    where('archived', '==', false),
  );
  return onSnapshot(
    q,
    snap => callback(snap.size),
    err => wrapFirestoreError(err, 'subscribeUnreadCount'),
  );
}

export async function createNotification(
  n: Omit<SystemNotification, 'id' | 'read' | 'archived' | 'createdAt' | 'sentVia'>,
): Promise<SystemNotification> {
  try {
    const notifRef = doc(col());
    const notif: SystemNotification = {
      ...n,
      id:        notifRef.id,
      read:      false,
      archived:  false,
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

export async function createNotificationsForMany(
  recipientIds: string[],
  base: Omit<SystemNotification, 'id' | 'read' | 'archived' | 'createdAt' | 'sentVia' | 'recipientId' | 'expiresAt'>,
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
          archived:    false,
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
      where('archived', '==', false),
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

export async function archiveNotification(id: string): Promise<void> {
  try {
    await updateDoc(ref(id), { archived: true });
  } catch (err) {
    wrapFirestoreError(err, 'archiveNotification');
  }
}

export async function unarchiveNotification(id: string): Promise<void> {
  try {
    await updateDoc(ref(id), { archived: false });
  } catch (err) {
    wrapFirestoreError(err, 'unarchiveNotification');
  }
}

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

export async function clearArchivedNotifications(recipientId: string): Promise<void> {
  try {
    const q = query(
      col(),
      where('recipientId', '==', recipientId),
      where('archived', '==', true),
      limit(400),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    wrapFirestoreError(err, 'clearArchivedNotifications');
  }
}
