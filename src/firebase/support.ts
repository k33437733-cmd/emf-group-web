import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, limit, onSnapshot, writeBatch, increment,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, getStorage, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, app } from './config';
import type { Conversation, ChatMessage, UserProfile } from '../types';

const CONVERSATIONS = 'support_conversations';
const MESSAGES = 'support_messages';

function nowISO() { return new Date().toISOString(); }

// ── Single-field helpers (avoid composite index requirements) ────────────

/**
 * Sort conversations by updatedAt descending.
 */
function sortConvs(list: Conversation[]): Conversation[] {
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Sort messages by createdAt ascending.
 */
function sortMsgs(list: ChatMessage[]): ChatMessage[] {
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ── Conversation management ─────────────────────────────────────────────

/**
 * Find existing support conversation for a customer, or create one.
 * Uses a SINGLE-FIELD query (array-contains on members) — no composite index needed.
 */
export async function ensureSupportConversation(customer: UserProfile): Promise<string> {
  const q = query(
    collection(db, CONVERSATIONS),
    where('members', 'array-contains', customer.uid),
    limit(20)
  );
  const snap = await getDocs(q);
  // Filter type === 'support' in JS
  const existing = snap.docs
    .map(d => d.data() as Conversation)
    .find(c => c.type === 'support');
  if (existing) return existing.id;

  const convRef = doc(collection(db, CONVERSATIONS));
  const now = nowISO();
  await setDoc(convRef, {
    id: convRef.id, type: 'support', members: [customer.uid],
    memberNames: { [customer.uid]: customer.name || customer.email || 'Unknown' },
    memberRoles: { [customer.uid]: customer.role || 'user' },
    isGroup: false, name: customer.name,
    lastMessage: '', lastMessageTime: now,
    lastMessageSenderId: customer.uid,
    unreadCount: { total: 0 },
    status: 'active', createdAt: now, createdBy: customer.uid, updatedAt: now,
  } satisfies Conversation);
  return convRef.id;
}

// ── Real-time subscriptions (single-field queries only) ─────────────────

/**
 * Subscribe to support conversations in real time.
 *
 * Admin:  `where('type', '==', 'support')`  ← single-field on `type`
 * Client: `where('members', 'array-contains', uid)`  ← single-field on `members`
 *
 * Both filter and sort in JavaScript to avoid ANY composite index.
 */
export function subscribeToSupportConversations(
  userUid: string,
  isAdmin: boolean,
  callback: (list: Conversation[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const base = collection(db, CONVERSATIONS);
    if (isAdmin) {
      // Single-field: only needs index on `type`
      const q = query(base, where('type', '==', 'support'));
      return onSnapshot(q,
        snap => callback(sortConvs(snap.docs.map(d => d.data() as Conversation))),
        err => { console.error('❌ Admin conv onSnapshot failed', err); onError?.(err); }
      );
    }
    // Single-field: only needs index on `members` array-contains
    // Filter type === 'support' in JS since we can't combine fields without composite index
    const q = query(base, where('members', 'array-contains', userUid));
    return onSnapshot(q,
      snap => {
        const all = snap.docs.map(d => d.data() as Conversation);
        callback(sortConvs(all.filter(c => c.type === 'support')));
      },
      err => { console.error('❌ User conv onSnapshot failed', err); onError?.(err); }
    );
  } catch (err) {
    console.error('❌ Conv query error', err);
    onError?.(err as Error);
    return () => {};
  }
}

/**
 * Subscribe to messages for a conversation.
 * Single-field `where('conversationId', '==', id)` — no orderBy, sorts in JS.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (msgs: ChatMessage[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(
      collection(db, MESSAGES),
      where('conversationId', '==', conversationId)
    );
    return onSnapshot(q,
      snap => callback(sortMsgs(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)))),
      err => { console.error('❌ Messages onSnapshot failed', err); onError?.(err); }
    );
  } catch (err) {
    console.error('❌ Messages query error', err);
    onError?.(err as Error);
    return () => {};
  }
}

// ── Write operations ────────────────────────────────────────────────────

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
  const now = nowISO();

  const updates: Record<string, any> = {
    lastMessage: preview, lastMessageTime: now, lastMessageSenderId: sender.uid, updatedAt: now,
  };
  if (!isAdmin) {
    updates['unreadCount.total'] = increment(1);
  }
  await updateDoc(convRef, updates);

  return msgRef.id;
}

export async function markConversationRead(conversationId: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { 'unreadCount.total': 0 });
}

export async function updateMessageStatus(
  _conversationId: string, messageId: string,
  status: ChatMessage['deliveryStatus'], userUid: string
) {
  const ref = doc(db, MESSAGES, messageId);
  const update: Record<string, any> = { deliveryStatus: status };
  if (status === 'read') update[`readBy.${userUid}`] = nowISO();
  await updateDoc(ref, update);
}

// ── Typing indicators ───────────────────────────────────────────────────

export function subscribeTypingStatus(
  conversationId: string,
  callback: (data: { userId: string; userName: string; isTyping: boolean } | null) => void
) {
  return onSnapshot(doc(db, 'typing_status', conversationId),
    snap => {
      if (!snap.exists()) { callback(null); return; }
      const d = snap.data();
      callback({ userId: d.userId, userName: d.userName || '', isTyping: d.isTyping });
    },
    () => callback(null)
  );
}

export async function setTypingStatus(conversationId: string, userId: string, userName: string, isTyping: boolean) {
  await setDoc(
    doc(db, 'typing_status', conversationId),
    { userId, userName, isTyping, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ── Message edit / delete ───────────────────────────────────────────────

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

// ── File upload ─────────────────────────────────────────────────────────

export function uploadAttachment(file: File, onProgress: (pct: number) => void): Promise<string> {
  const storage = getStorage(app);
  const ext = file.name.split('.').pop() || 'bin';
  const path = `support_attachments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageReference = storageRef(storage, path);
  const task = uploadBytesResumable(storageReference, file);
  return new Promise<string>((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => reject(err),
      () => getDownloadURL(storageReference).then(resolve).catch(reject));
  });
}

// ── Mark-as-read (single-field query, no orderBy) ───────────────────────

export async function markAllMessagesRead(conversationId: string, userUid: string) {
  const q = query(
    collection(db, MESSAGES),
    where('conversationId', '==', conversationId)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;
  snap.docs.forEach(d => {
    const msg = d.data() as ChatMessage;
    if (msg.senderId !== userUid && (msg.deliveryStatus === 'sent' || msg.deliveryStatus === 'delivered')) {
      batch.update(d.ref, { deliveryStatus: 'read', [`readBy.${userUid}`]: nowISO() });
      count++;
    }
  });
  if (count > 0) await batch.commit();
}

// ── Unread count (single-field query on unreadCount.total) ──────────────

export function subscribeUnreadSupportCount(callback: (count: number) => void) {
  const q = query(
    collection(db, CONVERSATIONS),
    where('unreadCount.total', '>', 0)
  );
  return onSnapshot(q,
    snap => callback(snap.docs.length),
    () => callback(0)
  );
}
