import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import type { ContentItem, UserProfile, SystemNotification, AuditLog, AuditAction, UserRole, UserStatus } from '../types';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

// ==========================================
// 1. Content CRUD (Videos, Apps, Files)
// ==========================================

export async function addContentItem(item: Omit<ContentItem, 'id' | 'views' | 'downloads' | 'createdAt'>) {
  const colRef = collection(db, 'contents');
  const docRef = doc(colRef);
  const newItem: ContentItem = {
    ...item,
    id: docRef.id,
    views: 0,
    downloads: 0,
    downloadProtected: item.downloadProtected || false,
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, newItem);
  
  // Log activity
  await logAudit(item.uploadedBy, item.uploadedByName, 'رفع محتوى', `تم رفع ${item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'}: ${item.title}`);
  
  // Send notification to all users
  await sendGlobalNotification(
    item.uploadedByName,
    'upload',
    `محتوى جديد: ${item.title}`,
    `تم رفع ${item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'} جديد بواسطة ${item.uploadedByName}.`,
    `/content#${docRef.id}`
  );

  return newItem;
}

export async function updateContentItem(id: string, updates: Partial<ContentItem>, userId: string, userName: string) {
  const docRef = doc(db, 'contents', id);
  await updateDoc(docRef, updates);
  await logAudit(userId, userName, 'تعديل محتوى', `تم تعديل محتوى برقم معرف ${id}`);
}

export async function deleteContentItem(id: string, title: string, userId: string, userName: string) {
  const docRef = doc(db, 'contents', id);
  await deleteDoc(docRef);
  await logAudit(userId, userName, 'حذف محتوى', `تم حذف المحتوى: ${title}`);
}

export async function incrementContentViews(id: string) {
  const docRef = doc(db, 'contents', id);
  await updateDoc(docRef, {
    views: increment(1)
  });
}

export async function incrementContentDownloads(id: string) {
  const docRef = doc(db, 'contents', id);
  await updateDoc(docRef, {
    downloads: increment(1)
  });
}

export function subscribeToContents(callback: (items: ContentItem[]) => void) {
  const q = query(collection(db, 'contents'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => d.data() as ContentItem);
    callback(items);
  });
}

// ==========================================
// 2. User Management (Super Admin only)
// ==========================================

export async function getAllUsers(): Promise<UserProfile[]> {
  const colRef = collection(db, 'users');
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(d => d.data() as UserProfile);
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(d => d.data() as UserProfile);
    callback(users);
  });
}

export async function updateUserRole(targetUid: string, role: UserRole, adminId: string, adminName: string) {
  const docRef = doc(db, 'users', targetUid);
  const targetSnap = await getDoc(docRef);
  const targetName = targetSnap.exists() ? targetSnap.data().name : 'مستخدم';
  
  await updateDoc(docRef, { role });
  await logAudit(adminId, adminName, 'تغيير رتبة', `تم تغيير رتبة المستخدم ${targetName} إلى ${role}`);
}

export async function updateUserStatus(targetUid: string, status: UserStatus, adminId: string, adminName: string) {
  const docRef = doc(db, 'users', targetUid);
  const targetSnap = await getDoc(docRef);
  const targetName = targetSnap.exists() ? targetSnap.data().name : 'مستخدم';
  
  await updateDoc(docRef, { status });
  await logAudit(adminId, adminName, status === 'blocked' ? 'حظر مستخدم' : 'إلغاء حظر', `تم ${status === 'blocked' ? 'حظر' : 'إلغاء حظر'} المستخدم ${targetName}`);
}

// ==========================================
// 3. Notifications
// ==========================================

export async function sendNotification(notification: Omit<SystemNotification, 'id' | 'read' | 'createdAt'>) {
  const colRef = collection(db, 'notifications');
  const docRef = doc(colRef);
  const newNotif: SystemNotification = {
    ...notification,
    id: docRef.id,
    read: false,
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, newNotif);
}

export async function sendGlobalNotification(senderName: string, type: 'upload' | 'system', title: string, body: string, link?: string) {
  // Get all users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  
  usersSnapshot.docs.forEach(userDoc => {
    const colRef = collection(db, 'notifications');
    const docRef = doc(colRef);
    const newNotif: SystemNotification = {
      id: docRef.id,
      recipientId: userDoc.id,
      senderName,
      type,
      category: 'system',
      priority: 'normal',
      channel: 'in_app',
      title,
      body,
      read: false,
      archived: false,
      createdAt: new Date().toISOString(),
      sentVia: { push: false, email: false },
      link
    };
    batch.set(docRef, newNotif);
  });

  await batch.commit();
}

export function subscribeToNotifications(recipientId: string, callback: (notifications: SystemNotification[]) => void) {
  const q = query(
    collection(db, 'notifications'), 
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => d.data() as SystemNotification);
    callback(list);
  });
}

export async function markNotificationAsRead(id: string) {
  const docRef = doc(db, 'notifications', id);
  await updateDoc(docRef, { read: true });
}

export { subscribeUnreadCount, createNotification, createNotificationsForMany, subscribeNotificationsFiltered, listNotifications, markAsRead, markAllAsRead, deleteNotification, archiveNotification } from './db/notifications';
export { subscribeToReleases, createRelease, deleteRelease } from './db/release_notes';

export async function markAllNotificationsAsRead(recipientId: string) {
  const q = query(
    collection(db, 'notifications'), 
    where('recipientId', '==', recipientId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, { read: true });
  });
  await batch.commit();
}

// ==========================================
// 4. Audit Logging
// ==========================================

export async function logAudit(userId: string, userName: string, action: string, details: string, role = 'user') {
  const colRef = collection(db, 'audit_logs');
  const docRef = doc(colRef);
  const log: AuditLog = {
    id: docRef.id,
    userId,
    userName,
    userRole: role,
    action: action as AuditAction,
    resource: 'unknown',
    resourceId: '',
    severity: 'info',
    description: details,
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, log);
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(d => d.data() as AuditLog);
    callback(logs);
  });
}

// ==========================================
// 5. Aggregate Stats
// ==========================================

interface DashboardStats {
  usersCount: number;
  adminsCount: number;
  videosCount: number;
  appsCount: number;
  filesCount: number;
  totalViews: number;
  totalDownloads: number;
}

export function subscribeToStats(callback: (stats: DashboardStats) => void) {
  const contentsQuery = collection(db, 'contents');
  const usersQuery = collection(db, 'users');

  let usersUnsub: (() => void) | null = null;

  const contentsUnsub = onSnapshot(contentsQuery, (contentSnap: QuerySnapshot<DocumentData>) => {
    const items = contentSnap.docs.map(d => d.data() as ContentItem);
    const videos = items.filter(i => i.type === 'video');
    const apps = items.filter(i => i.type === 'app');
    const files = items.filter(i => i.type === 'other');
    const views = items.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const downloads = items.reduce((acc, curr) => acc + (curr.downloads || 0), 0);

    const processUsers = (userSnap: QuerySnapshot<DocumentData>) => {
      const users = userSnap.docs.map(d => d.data() as UserProfile);
      callback({
        usersCount: users.length,
        adminsCount: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
        videosCount: videos.length,
        appsCount: apps.length,
        filesCount: files.length,
        totalViews: views,
        totalDownloads: downloads
      });
    };

    if (!usersUnsub) {
      usersUnsub = onSnapshot(usersQuery, processUsers);
    }
  });

  return () => {
    contentsUnsub();
    if (usersUnsub) usersUnsub();
  };
}
