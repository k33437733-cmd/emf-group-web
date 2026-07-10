/**
 * ConversationRepository
 * All reads and writes to the `conversations` collection.
 *
 * Key design decisions:
 * - Support conversations include ALL active admins as members so that every
 *   admin sees customer messages in real time and can reply. This is required
 *   for cross-admin synchronization. Unread counters use Firestore increment()
 *   to prevent race conditions under concurrent writes.
 * - Group chats use a fixed well-known ID.
 * - DM IDs are deterministic: sorted(uid1, uid2) joined by '_'.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import type { Conversation, ConversationType } from '../../types/chat';
import type { UserProfile } from '../../types/auth';
import { fromSnapshot, nowISO, wrapFirestoreError } from './base';
import { listAgents } from './users';
import { createSystemEvent } from './messages';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = () => collection(db, COLLECTIONS.CONVERSATIONS);
const ref = (id: string) => doc(db, COLLECTIONS.CONVERSATIONS, id);

function dmId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

const ADMIN_GROUP_ID = 'admin_group_chat';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    const snap = await getDoc(ref(id));
    return fromSnapshot<Conversation>(snap);
  } catch (err) {
    wrapFirestoreError(err, 'getConversationById');
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

/**
 * Subscribe to all conversations where the user is a member,
 * filtered by type and sorted by most recent message.
 */
export function subscribeToConversations(
  uid: string,
  type: ConversationType,
  callback: (convs: Conversation[]) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('members', 'array-contains', uid),
    where('type', '==', type),
    where('status', '==', 'active')
  );

  return onSnapshot(
    q,
    snap => {
      let convs = snap.docs.map(d => ({ ...d.data() }) as Conversation);
      convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      callback(convs);
    },
    err => wrapFirestoreError(err, 'subscribeToConversations'),
  );
}

/**
 * Support conversations visible to agents — all 'support' type convs
 * where the agent is a member (assigned agent only, not all admins).
 */
export function subscribeToSupportConversations(
  agentId: string,
  callback: (convs: Conversation[]) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('members', 'array-contains', agentId),
    where('type', '==', 'support' as ConversationType),
    where('status', '==', 'active')
  );

  return onSnapshot(
    q,
    snap => {
      let convs = snap.docs.map(d => ({ ...d.data() }) as Conversation);
      convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      callback(convs);
    },
    err => wrapFirestoreError(err, 'subscribeToSupportConversations'),
  );
}

/**
 * Real-time subscription to a single conversation document.
 * Used by admin chat views to react instantly to status/read changes.
 */
export function subscribeToConversation(
  conversationId: string,
  callback: (conv: Conversation | null) => void,
): Unsubscribe {
  return onSnapshot(
    ref(conversationId),
    snap => callback(fromSnapshot<Conversation>(snap)),
    err => wrapFirestoreError(err, 'subscribeToConversation'),
  );
}

/** Customer's own support conversation (maximum 1). */
export function subscribeToCustomerSupportConversation(
  customerId: string,
  callback: (conv: Conversation | null) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('members', 'array-contains', customerId),
    where('type', '==', 'support' as ConversationType),
    limit(1),
  );
  return onSnapshot(
    q,
    snap => {
      const doc = snap.docs[0];
      callback(doc ? ({ ...doc.data() }) as Conversation : null);
    },
    err => wrapFirestoreError(err, 'subscribeToCustomerSupportConversation'),
  );
}

// ─── Create helpers ───────────────────────────────────────────────────────────

export async function getOrCreateDMConversation(
  user1: UserProfile,
  user2: UserProfile,
): Promise<string> {
  const id = dmId(user1.uid, user2.uid);
  try {
    const snap = await getDoc(ref(id));
    if (snap.exists()) return id;

    const type: ConversationType = (user1.role === 'user' || user2.role === 'user') ? 'agent_member' : 'admin_dm';

    const conv: Conversation = {
      id,
      type,
      members:             [user1.uid, user2.uid],
      memberNames:         { [user1.uid]: user1.name, [user2.uid]: user2.name },
      memberRoles:         { [user1.uid]: user1.role, [user2.uid]: user2.role },
      isGroup:             false,
      lastMessage:         '',
      lastMessageTime:     nowISO(),
      lastMessageSenderId: '',
      unreadCount:         { [user1.uid]: 0, [user2.uid]: 0 },
      status:              'active',
      createdAt:           nowISO(),
      createdBy:           user1.uid,
      updatedAt:           nowISO(),
    };
    await setDoc(ref(id), conv);
    return id;
  } catch (err) {
    wrapFirestoreError(err, 'getOrCreateDMConversation');
  }
}

export async function getOrCreateAdminGroup(members: UserProfile[]): Promise<string> {
  try {
    const snap = await getDoc(ref(ADMIN_GROUP_ID));
    if (snap.exists()) {
      await updateDoc(ref(ADMIN_GROUP_ID), {
        members: members.map(m => m.uid),
        type: 'admin_group',
        status: 'active',
        isGroup: true,
        updatedAt: new Date().toISOString()
      });
      return ADMIN_GROUP_ID;
    }

    const memberNames: Record<string, string> = {};
    const memberRoles: Record<string, string> = {};
    const unreadCount: Record<string, number> = {};
    members.forEach(m => {
      memberNames[m.uid] = m.name;
      memberRoles[m.uid] = m.role;
      unreadCount[m.uid] = 0;
    });

    const conv: Conversation = {
      id:                  ADMIN_GROUP_ID,
      type:                'admin_group',
      members:             members.map(m => m.uid),
      memberNames,
      memberRoles,
      isGroup:             true,
      groupName:           'مجموعة الإدارة العامة 📢',
      lastMessage:         'تم إنشاء المجموعة',
      lastMessageTime:     nowISO(),
      lastMessageSenderId: 'system',
      unreadCount,
      status:              'active',
      createdAt:           nowISO(),
      createdBy:           'system',
      updatedAt:           nowISO(),
    };
    await setDoc(ref(ADMIN_GROUP_ID), conv);
    return ADMIN_GROUP_ID;
  } catch (err) {
    wrapFirestoreError(err, 'getOrCreateAdminGroup');
  }
}

/**
 * Create a support conversation for a customer.
 * All active admins are added as members so every admin sees messages in
 * real time. Idempotent — safe to call after ticket creation.
 */
export async function createSupportConversation(
  customer: UserProfile,
  ticketId: string,
): Promise<string> {
  try {
    const agents     = await listAgents();
    const agentIds   = agents.map(a => a.uid);
    const memberUids = [customer.uid, ...agentIds];

    const memberNames: Record<string, string>  = { [customer.uid]: customer.name };
    const memberRoles: Record<string, string>  = { [customer.uid]: customer.role };
    const unreadCount: Record<string, number>  = { [customer.uid]: 0 };

    agents.forEach(a => {
      memberNames[a.uid]  = a.name;
      memberRoles[a.uid]  = a.role;
      unreadCount[a.uid]  = 0;
    });

    const convRef = doc(col());
    const conv: Conversation = {
      id:                  convRef.id,
      type:                'support',
      members:             memberUids,
      memberNames,
      memberRoles,
      isGroup:             false,
      ticketId,
      lastMessage:         '',
      lastMessageTime:     nowISO(),
      lastMessageSenderId: '',
      unreadCount,
      status:              'active',
      createdAt:           nowISO(),
      createdBy:           customer.uid,
      updatedAt:           nowISO(),
    };
    await setDoc(convRef, conv);
    return convRef.id;
  } catch (err) {
    wrapFirestoreError(err, 'createSupportConversation');
  }
}

/**
 * Add agent to a support conversation's members list.
 * Called when a ticket is assigned.
 */
export async function addAgentToConversation(
  conversationId: string,
  agent: UserProfile,
): Promise<void> {
  try {
    const snap = await getDoc(ref(conversationId));
    if (!snap.exists()) return;
    const conv = snap.data() as Conversation;

    if (conv.members.includes(agent.uid)) return; // already a member

    const updatedMembers    = [...conv.members, agent.uid];
    const updatedNames      = { ...conv.memberNames,  [agent.uid]: agent.name };
    const updatedRoles      = { ...conv.memberRoles,  [agent.uid]: agent.role };
    const updatedUnread     = { ...conv.unreadCount,  [agent.uid]: 0 };

    await updateDoc(ref(conversationId), {
      members:     updatedMembers,
      memberNames: updatedNames,
      memberRoles: updatedRoles,
      unreadCount: updatedUnread,
      updatedAt:   nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'addAgentToConversation');
  }
}

/**
 * Broadcast an existing conversation to all active admins.
 * Adds each admin to members[] / memberNames / memberRoles / unreadCount
 * if they are not already present. Idempotent — safe for repeated calls.
 */
export async function broadcastConversationToAdmins(
  conversationId: string,
): Promise<void> {
  try {
    const [agents, snap] = await Promise.all([
      listAgents(),
      getDoc(ref(conversationId)),
    ]);
    if (!snap.exists() || agents.length === 0) return;

    const conv  = snap.data() as Conversation;
    const existing = new Set(conv.members ?? []);
    const missing  = agents.filter(a => !existing.has(a.uid));
    if (missing.length === 0) return;

    const updates: Record<string, unknown> = { updatedAt: nowISO() };

    const mergedMembers = [...(conv.members ?? []), ...missing.map(a => a.uid)];
    updates['members'] = mergedMembers;

    missing.forEach(a => {
      updates[`memberNames.${a.uid}`]  = a.name;
      updates[`memberRoles.${a.uid}`]  = a.role;
      updates[`unreadCount.${a.uid}`]  = 0;
    });

    await updateDoc(ref(conversationId), updates);
  } catch (err) {
    wrapFirestoreError(err, 'broadcastConversationToAdmins');
  }
}

// ─── Unread count management ──────────────────────────────────────────────────

export async function markConversationRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  try {
    await updateDoc(ref(conversationId), {
      [`unreadCount.${uid}`]: 0,
      updatedAt:              nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'markConversationRead');
  }
}

/**
 * Increment unread counters atomically for all members EXCEPT the sender.
 * Uses Firestore increment() to prevent race conditions when two admins
 * send messages concurrently (read-then-write bug eliminated).
 */
export async function incrementUnreadForOthers(
  conversationId: string,
  senderId: string,
  members: string[],
): Promise<void> {
  try {
    const updates: Record<string, unknown> = { updatedAt: nowISO() };
    members.forEach(uid => {
      if (uid !== senderId) {
        updates[`unreadCount.${uid}`] = increment(1);
      }
    });
    await updateDoc(ref(conversationId), updates);
  } catch (err) {
    wrapFirestoreError(err, 'incrementUnreadForOthers');
  }
}

/** Update lastMessage preview after a message is sent. */
export async function updateLastMessage(
  conversationId: string,
  preview: string,
  senderId: string,
): Promise<void> {
  try {
    await updateDoc(ref(conversationId), {
      lastMessage:         preview,
      lastMessageTime:     nowISO(),
      lastMessageSenderId: senderId,
      updatedAt:           nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'updateLastMessage');
  }
}

export async function archiveConversation(conversationId: string): Promise<void> {
  try {
    await updateDoc(ref(conversationId), { status: 'archived', updatedAt: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'archiveConversation');
  }
}

// ─── Group management ──────────────────────────────────────────────────────────

/**
 * Create a new admin group with a generated ID.
 * Returns the new conversation ID.
 */
export async function createGroupConversation(
  name: string,
  members: UserProfile[],
  creator: UserProfile,
  avatar?: string,
): Promise<string> {
  try {
    const convRef = doc(col());
    const now = nowISO();
    const memberNames: Record<string, string> = {};
    const memberRoles: Record<string, string> = {};
    const unreadCount: Record<string, number> = {};

    members.forEach(m => {
      memberNames[m.uid] = m.name;
      memberRoles[m.uid] = m.role;
      unreadCount[m.uid] = 0;
    });

    const conv: Conversation = {
      id:                  convRef.id,
      type:                'admin_group',
      members:             members.map(m => m.uid),
      memberNames,
      memberRoles,
      isGroup:             true,
      groupName:           name,
      avatar,
      lastMessage:         'تم إنشاء المجموعة 🎉',
      lastMessageTime:     now,
      lastMessageSenderId: 'system',
      unreadCount,
      status:              'active',
      createdAt:           now,
      createdBy:           creator.uid,
      updatedAt:           now,
    };

    await setDoc(convRef, conv);
    return convRef.id;
  } catch (err) {
    wrapFirestoreError(err, 'createGroupConversation');
  }
}

/** Update group info: name, avatar, or both */
export async function updateGroupInfo(
  groupId: string,
  updates: { name?: string; avatar?: string },
  actor?: UserProfile,
): Promise<void> {
  try {
    const data: Record<string, unknown> = { updatedAt: nowISO() };
    if (updates.name !== undefined) data['groupName'] = updates.name;
    if (updates.avatar !== undefined) data['avatar'] = updates.avatar;
    await updateDoc(ref(groupId), data);

    // System event
    if (actor) {
      if (updates.name !== undefined) {
        createSystemEvent(groupId, `${actor.name} غير اسم المجموعة إلى "${updates.name}"`).catch(() => {});
      }
      if (updates.avatar !== undefined) {
        createSystemEvent(groupId, `${actor.name} غير صورة المجموعة`).catch(() => {});
      }
    }
  } catch (err) {
    wrapFirestoreError(err, 'updateGroupInfo');
  }
}

/** Add members to an existing group */
export async function addGroupMembers(
  groupId: string,
  newMembers: UserProfile[],
  actor?: UserProfile,
): Promise<void> {
  try {
    const snap = await getDoc(ref(groupId));
    if (!snap.exists()) return;
    const conv = snap.data() as Conversation;
    const existing = new Set(conv.members ?? []);
    const toAdd = newMembers.filter(m => !existing.has(m.uid));
    if (toAdd.length === 0) return;

    const updates: Record<string, unknown> = { updatedAt: nowISO() };
    updates['members'] = [...(conv.members ?? []), ...toAdd.map(m => m.uid)];
    toAdd.forEach(m => {
      updates[`memberNames.${m.uid}`] = m.name;
      updates[`memberRoles.${m.uid}`] = m.role;
      updates[`unreadCount.${m.uid}`] = 0;
    });

    await updateDoc(ref(groupId), updates);

    // System events
    if (actor) {
      toAdd.forEach(m => {
        createSystemEvent(groupId, `${actor.name} أضاف ${m.name} إلى المجموعة`).catch(() => {});
      });
    }
  } catch (err) {
    wrapFirestoreError(err, 'addGroupMembers');
  }
}

/** Remove a member from a group */
export async function removeGroupMember(
  groupId: string,
  uid: string,
  actor?: UserProfile,
  memberName?: string,
): Promise<void> {
  try {
    const snap = await getDoc(ref(groupId));
    if (!snap.exists()) return;
    const conv = snap.data() as Conversation;
    const updatedMembers = (conv.members ?? []).filter((m: string) => m !== uid);
    if (updatedMembers.length === conv.members?.length) return; // not found

    const updates: Record<string, unknown> = {
      members: updatedMembers,
      updatedAt: nowISO(),
    };

    await updateDoc(ref(groupId), updates);

    // System event
    if (actor) {
      const removedName = memberName || uid;
      createSystemEvent(groupId, `${actor.name} أزال ${removedName} من المجموعة`).catch(() => {});
    }
  } catch (err) {
    wrapFirestoreError(err, 'removeGroupMember');
  }
}
