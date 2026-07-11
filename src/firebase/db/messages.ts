/**
 * MessageRepository
 * All reads and writes to the `messages` collection.
 *
 * Key design decisions:
 * - Messages are paginated by createdAt cursor (not offset).
 * - Internal notes (isInternal: true) are filtered client-side; the server
 *   rule also denies reads to non-agents.
 * - Soft delete: deletedAt is set; content replaced with a tombstone string.
 * - Messages older than MESSAGE_RETENTION_DAYS are purged by a Cloud Function.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { MESSAGES_PAGE_SIZE, MESSAGE_RETENTION_DAYS } from '../../constants/config';
import type { ChatMessage, MessagePage } from '../../types/chat';
import { fromSnapshot, nowISO, wrapFirestoreError, cleanUndefined } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col   = () => collection(db, COLLECTIONS.MESSAGES);
const ref   = (id: string) => doc(db, COLLECTIONS.MESSAGES, id);

function messagePreview(msg: ChatMessage): string {
  if (msg.type === 'image') return '📷 صورة';
  if (msg.type === 'file')  return `📎 ${msg.fileName ?? 'ملف'}`;
  if (msg.type === 'bot_card') return '🤖 رسالة بوت';
  if (msg.type === 'system_event') return msg.content;
  return msg.content.length > 60 ? msg.content.slice(0, 57) + '...' : msg.content;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMessageById(id: string): Promise<ChatMessage | null> {
  try {
    const snap = await getDoc(ref(id));
    return fromSnapshot<ChatMessage>(snap);
  } catch (err) {
    wrapFirestoreError(err, 'getMessageById');
  }
}

/**
 * Load one page of messages for a conversation.
 * @param beforeCursor - createdAt ISO string; load messages older than this.
 *                       Omit to load the latest page.
 */
export async function getMessagePage(
  conversationId: string,
  beforeCursor?: string,
  pageSize = MESSAGES_PAGE_SIZE,
): Promise<MessagePage> {
  try {
    let q = query(
      col(),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1), // fetch one extra to detect hasMore
    );

    if (beforeCursor) {
      q = query(
        col(),
        where('conversationId', '==', conversationId),
        where('createdAt', '<', beforeCursor),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1),
      );
    }

    const snap = await getDocs(q);
    const allDocs = snap.docs
      .map(d => ({ ...d.data() }) as ChatMessage)
      // Filter out soft-deleted messages client-side to handle
      // missing/null deletedAt field
      .filter(m => !m.deletedAt);

    const hasMore = allDocs.length > pageSize;
    const messages = (hasMore ? allDocs.slice(0, pageSize) : allDocs).reverse();

    return {
      messages,
      hasMore,
      oldestCursor: messages.length > 0 ? messages[0].createdAt : null,
    };
  } catch (err) {
    wrapFirestoreError(err, 'getMessagePage');
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

/**
 * Live subscription to the LATEST page of messages.
 * The query listens to new messages coming in real-time.
 * Older pages are loaded on demand via getMessagePage().
 */
export function subscribeToLatestMessages(
  conversationId: string,
  callback: (msgs: ChatMessage[]) => void,
  pageSize = MESSAGES_PAGE_SIZE,
): Unsubscribe {
  const q = query(
    col(),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc'),
    // Anchor to last N messages by reading from the tail
    // A compound query with `limitToLast` is not supported by onSnapshot,
    // so we use a time-based anchor instead.
    where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString()),
    limit(pageSize),
  );

  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ ...d.data() }) as ChatMessage).filter(m => !m.deletedAt)),
    err => wrapFirestoreError(err, 'subscribeToLatestMessages'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist a new message.
 * Returns the saved message (with generated id and timestamps).
 */
export async function createMessage(
  payload: Omit<ChatMessage, 'id' | 'createdAt' | 'deliveryStatus' | 'readBy' | 'deletedAt' | 'editedAt'>,
): Promise<ChatMessage> {
  try {
    const msgRef = doc(col());
    const msg: ChatMessage = {
      ...payload,
      id:             msgRef.id,
      deliveryStatus: 'sent',
      readBy:         {},
      createdAt:      nowISO(),
    };
    await setDoc(msgRef, cleanUndefined(msg as unknown as Record<string, unknown>));
    return msg;
  } catch (err) {
    wrapFirestoreError(err, 'createMessage');
  }
}

/**
 * Write a system event message (group name change, member added/removed, etc).
 * System events have senderType='system' so the UI can style them differently.
 */
export async function createSystemEvent(
  conversationId: string,
  content: string,
): Promise<void> {
  try {
    const msgRef = doc(col());
    const msg: ChatMessage = {
      id:             msgRef.id,
      conversationId,
      senderId:       'system',
      senderName:     'النظام',
      senderRole:     'system',
      senderType:     'system',
      content,
      type:           'system_event',
      isInternal:     false,
      deliveryStatus: 'sent',
      readBy:         {},
      createdAt:      nowISO(),
    };
    await setDoc(msgRef, cleanUndefined(msg as unknown as Record<string, unknown>));
  } catch (err) {
    wrapFirestoreError(err, 'createSystemEvent');
  }
}

export async function editMessage(
  messageId: string,
  newContent: string,
  editorId: string,
): Promise<void> {
  try {
    const msg = await getMessageById(messageId);
    if (!msg) throw new Error('Message not found');
    if (msg.senderId !== editorId) throw new Error('Not authorized to edit this message');
    if (msg.type !== 'text') throw new Error('Only text messages can be edited');

    await updateDoc(ref(messageId), {
      content:  newContent,
      editedAt: nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'editMessage');
  }
}

/** Soft delete — preserves the document for audit; hides content from clients. */
export async function softDeleteMessage(
  messageId: string,
  _deleterId: string,
): Promise<void> {
  try {
    await updateDoc(ref(messageId), {
      content:   'تم حذف هذه الرسالة',
      deletedAt: nowISO(),
      imageUrls: [],
      fileUrl:   null,
    });
  } catch (err) {
    wrapFirestoreError(err, 'softDeleteMessage');
  }
}

/** Mark message as delivered for a specific user. */
export async function markDelivered(messageId: string, uid: string): Promise<void> {
  try {
    await updateDoc(ref(messageId), {
      deliveryStatus:   'delivered',
      [`readBy.${uid}`]: nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'markDelivered');
  }
}

/** Mark all unread messages in a conversation as read by a user. */
export async function markConversationMessagesRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  try {
    const q = query(
      col(),
      where('conversationId', '==', conversationId),
      where('senderId', '!=', uid),
      orderBy('senderId'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snap = await getDocs(q);
    const nonDeleted = snap.docs.filter(d => !d.data().deletedAt);
    if (nonDeleted.length === 0) return;

    const batch = writeBatch(db);
    const ts = nowISO();
    nonDeleted.forEach(d => {
      batch.update(d.ref, {
        deliveryStatus:   'read',
        [`readBy.${uid}`]: ts,
      });
    });
    await batch.commit();
  } catch (err) {
    wrapFirestoreError(err, 'markConversationMessagesRead');
  }
}

// ─── Scheduled cleanup helper (called by Cloud Function) ─────────────────────

/**
 * Delete messages older than MESSAGE_RETENTION_DAYS.
 * Batched in groups of 400 to stay within the 500-write limit per batch.
 */
export async function purgeOldMessages(): Promise<number> {
  const cutoff = new Date(
    Date.now() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60_000,
  ).toISOString();

  try {
    const q = query(col(), where('createdAt', '<', cutoff), limit(400));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return snap.docs.length;
  } catch (err) {
    wrapFirestoreError(err, 'purgeOldMessages');
  }
}

// ─── Message search ──────────────────────────────────────────────────────────

/**
 * Search messages in a conversation by content keyword.
 * Loads a page of matching messages ordered by newest first.
 */
export async function searchMessages(
  conversationId: string,
  keyword: string,
  pageSize = 50,
): Promise<ChatMessage[]> {
  try {
    const q = query(
      col(),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    const snap = await getDocs(q);
    const lowerKeyword = keyword.toLowerCase();
    return snap.docs
      .map(d => ({ ...d.data() }) as ChatMessage)
      .filter(m => !m.deletedAt && m.content?.toLowerCase().includes(lowerKeyword));
  } catch (err) {
    wrapFirestoreError(err, 'searchMessages');
  }
}

// ─── Export preview utility ───────────────────────────────────────────────────

export { messagePreview };
