import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, orderBy, onSnapshot, writeBatch, increment
} from 'firebase/firestore';
import { db } from './config';
import type { Conversation, ChatMessage, UserProfile, UserRole } from '../types';

// ─── Helpers ────────────────────────────────────────────────

function nowISO() { return new Date().toISOString(); }

// ─── Contacts ───────────────────────────────────────────────

export async function getAdminContacts(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'super_admin']));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
}

export async function getAllMemberUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'user'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
}

// ─── DM Conversations (admin–admin) ─────────────────────────

export async function getOrCreateDMConversation(user1: UserProfile, user2: UserProfile): Promise<string> {
  const convId = user1.uid < user2.uid ? `${user1.uid}_${user2.uid}` : `${user2.uid}_${user1.uid}`;
  const ref = doc(db, 'conversations', convId);
  if ((await getDoc(ref)).exists()) return convId;

  const now = nowISO();
  const conv: Conversation = {
    id: convId, name: user2.name, isGroup: false, type: 'admin_dm',
    members: [user1.uid, user2.uid],
    memberNames: { [user1.uid]: user1.name, [user2.uid]: user2.name },
    memberRoles: { [user1.uid]: user1.role, [user2.uid]: user2.role },
    lastMessage: 'بدء المحادثة', lastMessageTime: now, lastMessageSenderId: user1.uid,
    unreadCount: { [user1.uid]: 0, [user2.uid]: 0 },
    status: 'active', createdAt: now, createdBy: user1.uid, updatedAt: now
  };
  await setDoc(ref, conv);
  return convId;
}

// ─── Admin Group Chat ──────────────────────────────────────

export async function getOrCreateGroupConversation(admins: UserProfile[]): Promise<string> {
  const q = query(collection(db, 'conversations'), where('isGroup', '==', true));
  const snap = await getDocs(q);
  if (snap.docs.length > 0) return snap.docs[0].id;

  const id = 'admin_group_chat';
  const now = nowISO();
  const memberNames: Record<string, string> = {};
  const memberRoles: Record<string, string> = {};
  const members: string[] = [];
  const unreadCount: Record<string, number> = {};
  admins.forEach(a => { members.push(a.uid); memberNames[a.uid] = a.name; memberRoles[a.uid] = a.role; unreadCount[a.uid] = 0; });

  const firstAdmin = admins[0]?.uid || 'system';
  await setDoc(doc(db, 'conversations', id), {
    id, name: 'مجموعة الإدارة العامة 📢', isGroup: true, type: 'admin_group',
    members, memberNames, memberRoles, unreadCount,
    lastMessage: 'تم إنشاء مجموعة الإدارة', lastMessageTime: now,
    lastMessageSenderId: firstAdmin, status: 'active', createdAt: now,
    createdBy: firstAdmin, updatedAt: now
  } satisfies Conversation);
  return id;
}

// ─── Member Conversations (admin–user) ─────────────────────

export async function getOrCreateMemberConversation(adminId: string, member: UserProfile): Promise<string> {
  const convId = `member_${adminId}_${member.uid}`;
  const ref = doc(db, 'conversations', convId);
  if ((await getDoc(ref)).exists()) return convId;

  const now = nowISO();
  const conv: Conversation = {
    id: convId, name: member.name, isGroup: false, type: 'agent_member',
    members: [adminId, member.uid],
    memberNames: { [adminId]: '', [member.uid]: member.name },
    memberRoles: { [adminId]: 'admin', [member.uid]: member.role },
    lastMessage: 'بدء المحادثة', lastMessageTime: now, lastMessageSenderId: adminId,
    unreadCount: { [adminId]: 0, [member.uid]: 0 },
    status: 'active', createdAt: now, createdBy: adminId, updatedAt: now
  };
  await setDoc(ref, conv);
  return convId;
}

// ─── Subscriptions ─────────────────────────────────────────

export function subscribeToConversationsByType(userUid: string, type: Conversation['type'], callback: (list: Conversation[]) => void) {
  const q = query(
    collection(db, 'conversations'),
    where('members', 'array-contains', userUid),
    where('type', '==', type),
    orderBy('lastMessageTime', 'desc')
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => d.data() as Conversation)));
}

export function subscribeToMessages(conversationId: string, callback: (msgs: ChatMessage[]) => void) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    where('createdAt', '>=', cutoff),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => d.data() as ChatMessage)));
}

// ─── Send Message ──────────────────────────────────────────

export async function sendChatMessage(
  conversationId: string, senderId: string, senderName: string, senderRole: UserRole,
  content: string, type: 'text' | 'image' | 'file' = 'text',
  fileUrl?: string, imageUrls?: string[]
): Promise<void> {
  const msgRef = doc(collection(db, 'messages'));
  const msg: ChatMessage = {
    id: msgRef.id, conversationId, senderId, senderName, senderRole,
    senderType: 'agent', content, type, createdAt: nowISO(),
    fileUrl, imageUrls, isInternal: false,
    deliveryStatus: 'sent', readBy: {}
  };
  await setDoc(msgRef, msg);

  const convRef = doc(db, 'conversations', conversationId);
  const preview = type === 'image' ? '📷 صورة' : type === 'file' ? '📎 ملف' : content;
  const unreadUpdates: Record<string, unknown> = { lastMessage: preview, lastMessageTime: nowISO() };
  const convSnap = await getDoc(convRef);
  if (!convSnap.exists()) return;

  const conv = convSnap.data() as Conversation;
  conv.members.forEach(m => {
    if (m !== senderId) unreadUpdates[`unreadCount.${m}`] = increment(1);
  });

  await updateDoc(convRef, unreadUpdates);

  // Notifications for other members
  const batch = writeBatch(db);
  conv.members.forEach(m => {
    if (m !== senderId) {
      const nRef = doc(collection(db, 'notifications'));
      batch.set(nRef, {
        id: nRef.id, recipientId: m, senderName,
        type: 'chat', title: `رسالة جديدة من ${senderName}`, body: preview,
        read: false, createdAt: nowISO(), link: '/chat'
      });
    }
  });
  await batch.commit();
}

// ─── Mark Read ─────────────────────────────────────────────

export async function markConversationRead(conversationId: string, userUid: string) {
  const ref = doc(db, 'conversations', conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Conversation;
  const counts = { ...(data.unreadCount || {}), [userUid]: 0 };
  await updateDoc(ref, { unreadCount: counts });
}

// ─── 30-Day Cleanup ────────────────────────────────────────

export async function cleanupOldMessages() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const q = query(collection(db, 'messages'), where('createdAt', '<', cutoff));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
