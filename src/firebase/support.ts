import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch, increment,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, getStorage, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, app } from './config';
import type { Conversation, ChatMessage, UserProfile } from '../types';

const CONVERSATIONS = 'support_conversations';
const MESSAGES = 'support_messages';
const NOTIFICATIONS = 'notifications';

function nowISO() { return new Date().toISOString(); }

export async function getOrCreateSupportConversation(customer: UserProfile): Promise<string> {
  const q = query(
    collection(db, CONVERSATIONS),
    where('members', 'array-contains', customer.uid),
    where('type', '==', 'support'),
    orderBy('updatedAt', 'desc'), limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const convRef = doc(collection(db, CONVERSATIONS));
  const now = nowISO();
  await setDoc(convRef, {
    id: convRef.id, type: 'support', members: [customer.uid],
    memberNames: { [customer.uid]: customer.name || customer.email || 'Unknown' },
    memberRoles: { [customer.uid]: customer.role || 'user' },
    isGroup: false, name: customer.name,
    lastMessage: 'بدء المحادثة', lastMessageTime: now,
    lastMessageSenderId: customer.uid,
    unreadCount: { [customer.uid]: 0 },
    status: 'active', createdAt: now, createdBy: customer.uid, updatedAt: now,
  } satisfies Conversation);
  return convRef.id;
}

export function subscribeToSupportConversations(userUid: string, isAdmin: boolean, callback: (list: Conversation[]) => void) {
  const constraints: any[] = [where('type', '==', 'support')];
  if (!isAdmin) constraints.push(where('members', 'array-contains', userUid));
  constraints.push(orderBy('updatedAt', 'desc'));
  return onSnapshot(query(collection(db, CONVERSATIONS), ...constraints), snap =>
    callback(snap.docs.map(d => d.data() as Conversation))
  );
}

export function subscribeToMessages(conversationId: string, callback: (msgs: ChatMessage[]) => void) {
  return onSnapshot(
    query(collection(db, MESSAGES), where('conversationId', '==', conversationId), orderBy('createdAt', 'asc')),
    snap => callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)))
  );
}

export async function sendSupportMessage(
  conversationId: string, sender: UserProfile, content: string,
  type: ChatMessage['type'] = 'text',
  opts?: { fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string }
): Promise<string> {
  const msgRef = doc(collection(db, MESSAGES));
  const isAdmin = sender.role === 'admin' || sender.role === 'super_admin';
  const msg: ChatMessage = {
    id: msgRef.id, conversationId,
    senderId: sender.uid, senderName: sender.name || sender.email || 'Unknown',
    senderRole: sender.role || 'user', senderType: isAdmin ? 'agent' : 'user',
    content, type, createdAt: nowISO(),
    deliveryStatus: 'sent', readBy: {}, isInternal: false,
    ...(opts?.fileUrl && { fileUrl: opts.fileUrl, fileName: opts.fileName, fileSize: opts.fileSize }),
  };
  await setDoc(msgRef, msg);

  const convRef = doc(db, CONVERSATIONS, conversationId);
  const preview = type === 'image' ? '📷 صورة' : type === 'file' ? `📎 ${opts?.fileName || 'ملف'}` : content;
  const batch = writeBatch(db);
  batch.update(convRef, {
    lastMessage: preview, lastMessageTime: nowISO(), lastMessageSenderId: sender.uid, updatedAt: nowISO(),
  });

  const convSnap = await getDoc(convRef);
  if (convSnap.exists()) {
    const conv = convSnap.data() as Conversation;
    conv.members.forEach(m => {
      if (m !== sender.uid) {
        batch.update(convRef, `unreadCount.${m}`, increment(1));
        const nRef = doc(collection(db, NOTIFICATIONS));
        batch.set(nRef, {
          id: nRef.id, recipientId: m,
          type: isAdmin ? 'ticket_replied' as const : 'ticket_new' as const,
          category: 'support' as const, priority: 'normal' as const,
          title: isAdmin ? `رد من الدعم: ${sender.name}` : `رسالة جديدة من ${sender.name}`,
          body: preview, read: false, archived: false, createdAt: nowISO(),
          link: '/support', channel: 'in_app' as const, sentVia: { push: false, email: false },
          senderId: sender.uid, senderName: sender.name,
          actionData: { conversationId, messageId: msgRef.id },
        });
      }
    });
  }
  await batch.commit();
  return msgRef.id;
}

export async function markConversationRead(conversationId: string, userUid: string) {
  const ref = doc(db, CONVERSATIONS, conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Conversation;
  const counts = { ...(data.unreadCount || {}), [userUid]: 0 };
  await updateDoc(ref, { unreadCount: counts });
}

export async function updateMessageStatus(conversationId: string, messageId: string, status: ChatMessage['deliveryStatus'], userUid: string) {
  const ref = doc(db, MESSAGES, messageId);
  const update: any = { deliveryStatus: status };
  if (status === 'read') update[`readBy.${userUid}`] = nowISO();
  await updateDoc(ref, update);
}

export function subscribeTypingStatus(conversationId: string, callback: (data: { userId: string; userName: string; isTyping: boolean } | null) => void) {
  return onSnapshot(doc(db, 'typing_status', conversationId), snap => {
    if (!snap.exists()) { callback(null); return; }
    const d = snap.data();
    callback({ userId: d.userId, userName: d.userName || '', isTyping: d.isTyping });
  });
}

export async function setTypingStatus(conversationId: string, userId: string, userName: string, isTyping: boolean) {
  await setDoc(doc(db, 'typing_status', conversationId), { userId, userName, isTyping, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteSupportMessage(messageId: string, senderId: string) {
  const ref = doc(db, MESSAGES, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const msg = snap.data() as ChatMessage;
  if (msg.senderId !== senderId) return;
  await updateDoc(ref, { deletedAt: nowISO(), content: '' });
}

export async function editSupportMessage(messageId: string, senderId: string, newContent: string) {
  const ref = doc(db, MESSAGES, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const msg = snap.data() as ChatMessage;
  if (msg.senderId !== senderId) return;
  await updateDoc(ref, { content: newContent, editedAt: nowISO() });
}

export function uploadAttachment(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const storage = getStorage(app);
    const ext = file.name.split('.').pop() || 'bin';
    const path = `support_attachments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageReference = storageRef(storage, path);
    const task = uploadBytesResumable(storageReference, file);
    task.on('state_changed', snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)));
    task.then(() => getDownloadURL(storageReference)).then(resolve).catch(reject);
  });
}

export async function markAllMessagesRead(conversationId: string, userUid: string) {
  const q = query(
    collection(db, MESSAGES),
    where('conversationId', '==', conversationId),
    where('senderId', '!=', userUid),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const msg = d.data() as ChatMessage;
    if (msg.deliveryStatus === 'sent' || msg.deliveryStatus === 'delivered') {
      batch.update(d.ref, { deliveryStatus: 'read', [`readBy.${userUid}`]: nowISO() });
    }
  });
  await batch.commit();
}

export function subscribeUnreadSupportCount(userUid: string, callback: (count: number) => void) {
  return onSnapshot(
    query(collection(db, NOTIFICATIONS), where('recipientId', '==', userUid), where('read', '==', false), where('category', '==', 'support')),
    snap => callback(snap.docs.length)
  );
}
