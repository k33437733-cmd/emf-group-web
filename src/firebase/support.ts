import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, limit, onSnapshot, writeBatch, increment,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore';
import { ref as storageRef, getStorage, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, app } from './config';
import { listAgents } from './db/users';
import { createNotificationsForMany } from './db/notifications';
import type { Conversation, ChatMessage, UserProfile } from '../types';

const CONVERSATIONS = 'support_conversations';
const MESSAGES = 'support_messages';

function nowISO() { return new Date().toISOString(); }

function sortConvs(list: Conversation[]): Conversation[] {
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortMsgs(list: ChatMessage[]): ChatMessage[] {
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ── Admin management ─────────────────────────────────────────────

let cachedAdmins: UserProfile[] | null = null;
let adminsPromise: Promise<UserProfile[]> | null = null;

async function getAllAdmins(): Promise<UserProfile[]> {
  if (cachedAdmins) return cachedAdmins;
  if (adminsPromise) return adminsPromise;
  adminsPromise = listAgents();
  try {
    cachedAdmins = await adminsPromise;
    return cachedAdmins;
  } finally {
    adminsPromise = null;
  }
}

export function clearAdminCache() { cachedAdmins = null; }

function isAdminUser(u: UserProfile | null | undefined): boolean {
  return !!(u && (u.role === 'admin' || u.role === 'super_admin'));
}

// ── Conversation management ──────────────────────────────────────

export async function ensureSupportConversation(customer: UserProfile): Promise<string> {
  const q = query(
    collection(db, CONVERSATIONS),
    where('members', 'array-contains', customer.uid),
    limit(20)
  );
  const snap = await getDocs(q);
  const existing = snap.docs
    .map(d => d.data() as Conversation)
    .find(c => c.type === 'support');
  if (existing) return existing.id;

  const admins = await getAllAdmins();
  const allMemberUids = [customer.uid, ...admins.map(a => a.uid)];

  const memberNames: Record<string, string> = { [customer.uid]: customer.name || customer.email || 'Unknown' };
  const memberRoles: Record<string, string> = { [customer.uid]: customer.role || 'user' };
  const unreadCount: Record<string, number> = { [customer.uid]: 0 };

  admins.forEach(a => {
    memberNames[a.uid] = a.name;
    memberRoles[a.uid] = a.role;
    unreadCount[a.uid] = 0;
  });

  const convRef = doc(collection(db, CONVERSATIONS));
  const now = nowISO();
  await setDoc(convRef, {
    id: convRef.id, type: 'support', members: allMemberUids,
    memberNames, memberRoles,
    isGroup: false, name: customer.name,
    customerAvatar: customer.avatar || '',
    lastMessage: '', lastMessageTime: now,
    lastMessageSenderId: customer.uid,
    unreadCount,
    status: 'active', createdAt: now, createdBy: customer.uid, updatedAt: now,
  } satisfies Conversation);
  return convRef.id;
}

export async function broadcastConversationToAdmins(conversationId: string): Promise<void> {
  const [admins, convSnap] = await Promise.all([
    getAllAdmins(),
    getDoc(doc(db, CONVERSATIONS, conversationId)),
  ]);
  if (!convSnap.exists() || admins.length === 0) return;
  const conv = convSnap.data() as Conversation;
  const existing = new Set(conv.members ?? []);
  const missing = admins.filter(a => !existing.has(a.uid));
  if (missing.length === 0) return;

  const updates: Record<string, unknown> = { updatedAt: nowISO() };
  updates['members'] = [...(conv.members ?? []), ...missing.map(a => a.uid)];
  missing.forEach(a => {
    updates[`memberNames.${a.uid}`] = a.name;
    updates[`memberRoles.${a.uid}`] = a.role;
    updates[`unreadCount.${a.uid}`] = 0;
  });
  await updateDoc(doc(db, CONVERSATIONS, conversationId), updates);
}

export async function broadcastAllConversationsToAdmins(): Promise<void> {
  const admins = await getAllAdmins();
  const snap = await getDocs(query(collection(db, CONVERSATIONS), where('type', '==', 'support')));
  const batch = writeBatch(db);
  let batchCount = 0;

  snap.docs.forEach(d => {
    const conv = d.data();
    const existing = new Set(conv.members ?? []);
    const missing = admins.filter(a => !existing.has(a.uid));
    if (missing.length === 0) return;

    batch.update(d.ref, {
      members: [...(conv.members ?? []), ...missing.map(a => a.uid)],
      updatedAt: nowISO(),
      ...Object.fromEntries(missing.flatMap(a => [
        [`memberNames.${a.uid}`, a.name],
        [`memberRoles.${a.uid}`, a.role],
        [`unreadCount.${a.uid}`, 0],
      ])),
    });
    batchCount++;
    if (batchCount % 400 === 0) { batch.commit(); }
  });

  if (batchCount > 0) await batch.commit();
}

// ── Real-time subscriptions (single-field queries only) ────────

export function subscribeToSupportConversations(
  userUid: string,
  isAdmin: boolean,
  callback: (list: Conversation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const base = collection(db, CONVERSATIONS);
    if (isAdmin) {
      const q = query(base, where('type', '==', 'support'));
      return onSnapshot(q,
        snap => callback(sortConvs(snap.docs.map(d => d.data() as Conversation))),
        err => { console.error('❌ Admin conv onSnapshot failed', err); onError?.(err); }
      );
    }
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

export function subscribeToMessages(
  conversationId: string,
  callback: (msgs: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
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

// ── Write operations ────────────────────────────────────────────

export async function sendSupportMessage(
  conversationId: string, sender: UserProfile, content: string,
  type: ChatMessage['type'] = 'text',
  opts?: { fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string; replyTo?: string }
): Promise<string> {
  const msgRef = doc(collection(db, MESSAGES));
  const senderIsAdmin = isAdminUser(sender);
  const msg: ChatMessage = {
    id: msgRef.id, conversationId,
    senderId: sender.uid, senderName: sender.name || sender.email || 'Unknown',
    senderRole: sender.role || 'user', senderType: senderIsAdmin ? 'agent' : 'user',
    content, type, createdAt: nowISO(),
    deliveryStatus: 'sent', readBy: {}, isInternal: false,
    ...(opts?.fileUrl && { fileUrl: opts.fileUrl, fileName: opts.fileName, fileSize: opts.fileSize }),
    ...(opts?.replyTo && { replyTo: opts.replyTo }),
  };
  await setDoc(msgRef, msg);

  const convRef = doc(db, CONVERSATIONS, conversationId);
  const preview = type === 'image' ? '📷 صورة' : type === 'file' ? `📎 ${opts?.fileName || 'ملف'}` : content;

  const convSnap = await getDoc(convRef);
  const convData = convSnap.data() as Conversation | undefined;
  const members = convData?.members ?? [sender.uid];

  const unreadUpdates: Record<string, unknown> = {
    lastMessage: preview, lastMessageTime: nowISO(),
    lastMessageSenderId: sender.uid, updatedAt: nowISO(),
  };

  members.forEach(uid => {
    if (uid !== sender.uid) {
      unreadUpdates[`unreadCount.${uid}`] = increment(1);
    }
  });

  await updateDoc(convRef, unreadUpdates);

  // Create notification for all other admin members
  const otherAdmins = members.filter(
    uid => uid !== sender.uid && convData?.memberRoles?.[uid] && isAdminUser({ role: convData.memberRoles[uid] } as UserProfile)
  );
  if (otherAdmins.length > 0) {
    const customerName = convData?.memberNames?.[sender.uid] || sender.name || 'مستخدم';
    const previewText = preview.length > 80 ? preview.substring(0, 80) + '…' : preview;
    createNotificationsForMany(otherAdmins, {
      type: 'chat',
      category: 'support',
      priority: 'normal',
      channel: 'in_app',
      title: `رسالة جديدة من ${customerName}`,
      body: previewText,
      link: `/support?conv=${conversationId}`,
      senderId: sender.uid,
      senderName: customerName,
      actionData: { conversationId },
    }).catch(() => {});
  }

  return msgRef.id;
}

export async function markConversationRead(conversationId: string, userUid: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    [`unreadCount.${userUid}`]: 0,
    updatedAt: nowISO(),
  });
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

// ── Typing indicators ───────────────────────────────────────────

export function subscribeTypingStatus(
  conversationId: string,
  callback: (data: { userId: string; userName: string; isTyping: boolean } | null) => void
): Unsubscribe {
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

// ── Message edit / delete ───────────────────────────────────────

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

// ── File upload ─────────────────────────────────────────────────

export interface UploadTaskHandle {
  cancel: () => void;
  promise: Promise<string>;
}

export function uploadAttachment(
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): UploadTaskHandle {
  const storage = getStorage(app);
  const ext = file.name.split('.').pop() || 'bin';
  const path = `support_attachments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageReference = storageRef(storage, path);
  const task = uploadBytesResumable(storageReference, file);

  if (signal) {
    signal.addEventListener('abort', () => { task.cancel(); }, { once: true });
  }

  const promise = new Promise<string>((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => reject(err),
      () => getDownloadURL(storageReference).then(resolve).catch(reject));
  });

  return { cancel: () => task.cancel(), promise };
}

export interface FileUploadItem {
  id: string;
  file: File;
  url?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export async function uploadAttachments(
  items: FileUploadItem[],
  onProgress: (id: string, pct: number) => void,
  concurrency = 3
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const queue = [...items];
  const inProgress = new Set<Promise<void>>();

  const next = async (): Promise<void> => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        const handle = uploadAttachment(item.file, (pct) => { onProgress(item.id, pct); });
        const url = await handle.promise;
        results.set(item.id, url);
      } catch (err) {
        throw err;
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

// ── Pagination (cursor-based, single-field queries) ────────────

export async function getSupportMessagePage(
  conversationId: string,
  beforeCursor?: string,
  pageSize = 40
): Promise<{ messages: ChatMessage[]; hasMore: boolean; oldestCursor: string | null }> {
  try {
    const base = collection(db, MESSAGES);
    const constraints = [where('conversationId', '==', conversationId)];
    if (beforeCursor) {
      constraints.push(where('createdAt', '<', beforeCursor));
    }
    const q = query(base, ...constraints, limit(pageSize + 1));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage));
    const hasMore = docs.length > pageSize;
    const msgs = hasMore ? docs.slice(0, pageSize) : docs;
    const oldestCursor = msgs.length > 0 ? msgs[msgs.length - 1].createdAt : null;
    return { messages: sortMsgs(msgs), hasMore, oldestCursor };
  } catch (err) {
    console.error('❌ getSupportMessagePage error', err);
    return { messages: [], hasMore: false, oldestCursor: null };
  }
}

// ── Mark-as-read (single-field query, no orderBy) ───────────────

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

// ── Unread count per user (single-field query) ──────────────────

export function subscribeUnreadSupportCount(userUid: string, callback: (count: number) => void): Unsubscribe {
  const q = query(
    collection(db, CONVERSATIONS),
    where('type', '==', 'support')
  );
  return onSnapshot(q,
    snap => {
      let count = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        const unread = data.unreadCount?.[userUid];
        if (typeof unread === 'number' && unread > 0) count += unread;
      });
      callback(count);
    },
    () => callback(0)
  );
}

// ── Legacy total unread (kept for backward compat) ──────────────

export function subscribeLegacyUnreadCount(callback: (count: number) => void): Unsubscribe {
  const q = query(
    collection(db, CONVERSATIONS),
    where('unreadCount.total', '>', 0)
  );
  return onSnapshot(q,
    snap => callback(snap.docs.length),
    () => callback(0)
  );
}

// ── Admin: Mute ──────────────────────────────────────────────────

export async function muteConversation(conversationId: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { muted: true, updatedAt: nowISO() });
}

export async function unmuteConversation(conversationId: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { muted: false, updatedAt: nowISO() });
}

// ── Admin: Important ─────────────────────────────────────────────

export async function toggleImportant(conversationId: string, important: boolean) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { isImportant: important, updatedAt: nowISO() });
}

// ── Admin: Tags ──────────────────────────────────────────────────

export async function setConversationTags(conversationId: string, tags: string[]) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { tags, updatedAt: nowISO() });
}

// ── Admin: Archive / Unarchive ───────────────────────────────────

export async function archiveConversation(conversationId: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { status: 'archived', updatedAt: nowISO() });
}

export async function unarchiveConversation(conversationId: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { status: 'active', updatedAt: nowISO() });
}

// ── Admin: Transfer ──────────────────────────────────────────────

export async function transferConversation(conversationId: string, newAssigneeUid: string, newAssigneeName: string, transferredBy: string) {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    assignedTo: newAssigneeUid,
    assignedToName: newAssigneeName,
    transferredBy,
    transferredAt: nowISO(),
    updatedAt: nowISO(),
  });
}

// ── Reactions ──────────────────────────────────────────────────

export async function addReaction(messageId: string, conversationId: string, userId: string, emoji: string) {
  const ref = doc(db, MESSAGES, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const msg = snap.data() as ChatMessage;
  const key = emoji.codePointAt(0)?.toString(16) || emoji;
  const existing = msg.reactions?.[key];
  if (existing) {
    if (existing.users.includes(userId)) {
      existing.users = existing.users.filter(u => u !== userId);
      if (existing.users.length === 0) {
        const { [key]: _, ...rest } = msg.reactions || {};
        await updateDoc(ref, { reactions: rest });
      } else {
        await updateDoc(ref, { [`reactions.${key}.users`]: existing.users });
      }
    } else {
      await updateDoc(ref, { [`reactions.${key}.users`]: [...existing.users, userId] });
    }
  } else {
    await updateDoc(ref, { [`reactions.${key}`]: { emoji, users: [userId] } });
  }
}

// ── Reply (send message with replyTo) ──────────────────────────

export async function sendReplyMessage(
  conversationId: string, sender: UserProfile, content: string, replyToId: string
): Promise<string> {
  return sendSupportMessage(conversationId, sender, content, 'text', { replyTo: replyToId });
}

// ── Get message by ID for reply preview ────────────────────────

export async function getMessage(conversationId: string, messageId: string): Promise<ChatMessage | null> {
  const ref = doc(db, MESSAGES, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as ChatMessage;
}

// ── Forward message ──────────────────────────────────────────────

export async function forwardMessage(fromConversationId: string, toConversationId: string, message: ChatMessage, forwardedBy: string) {
  const msgRef = doc(collection(db, MESSAGES));
  const forwardedData = {
    ...message,
    id: msgRef.id,
    conversationId: toConversationId,
    content: `[تم التوجيه من محادثة أخرى]\n\n${message.content}`,
    forwardedFrom: fromConversationId,
    forwardedBy,
    forwardedAt: nowISO(),
    createdAt: nowISO(),
  };
  await setDoc(msgRef, forwardedData);
  return msgRef.id;
}
