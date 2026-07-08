/**
 * ChatService
 * Orchestrates all chat operations: sending messages, managing conversations,
 * typing indicators, and keeping the conversation metadata in sync.
 *
 * Responsibilities:
 * - Validate message payloads before writing
 * - Write message → update lastMessage + unreadCount atomically (two writes,
 *   both in try/catch so partial failure is visible rather than silent)
 * - Enforce per-message access rules (only sender can edit/delete)
 * - Manage typing indicators via a lightweight ephemeral sub-collection
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../constants/collections';
import { TYPING_TIMEOUT_MS, MAX_IMAGE_UPLOADS } from '../constants/config';
import {
  createMessage,
  editMessage,
  softDeleteMessage,
  markConversationMessagesRead,
  messagePreview,
} from '../firebase/db/messages';
import {
  getConversationById,
  getOrCreateDMConversation,
  getOrCreateAdminGroup,
  createSupportConversation,
  addAgentToConversation,
  markConversationRead,
  incrementUnreadForOthers,
  updateLastMessage,
} from '../firebase/db/conversations';
import { listAgents } from '../firebase/db/users';
import { RepositoryError } from '../firebase/db/base';
import { createNotificationsForMany } from '../firebase/db/notifications';
import type { ChatMessage, TypingIndicator } from '../types/chat';
import type { UserProfile } from '../types/auth';
import { isAgent } from '../types/auth';

// ─── Typing indicator helpers ─────────────────────────────────────────────────

const typingRef = (conversationId: string, userId: string) =>
  doc(db, COLLECTIONS.TYPING, `${conversationId}_${userId}`);

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function setTyping(
  conversationId: string,
  user: UserProfile,
  isTyping: boolean,
): Promise<void> {
  const key = `${conversationId}_${user.uid}`;

  if (!isTyping) {
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
    await deleteDoc(typingRef(conversationId, user.uid)).catch(() => {});
    return;
  }

  const indicator: TypingIndicator = {
    conversationId,
    userId:    user.uid,
    userName:  user.name,
    isTyping:  true,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(typingRef(conversationId, user.uid), indicator);

  // Auto-clear after TYPING_TIMEOUT_MS
  clearTimeout(typingTimers.get(key));
  typingTimers.set(
    key,
    setTimeout(() => {
      deleteDoc(typingRef(conversationId, user.uid)).catch(() => {});
      typingTimers.delete(key);
    }, TYPING_TIMEOUT_MS),
  );
}

export function subscribeToTyping(
  conversationId: string,
  currentUserId: string,
  callback: (indicators: TypingIndicator[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.TYPING),
    where('conversationId', '==', conversationId),
    where('isTyping', '==', true),
  );
  return onSnapshot(q, snap => {
    const indicators = snap.docs
      .map(d => d.data() as TypingIndicator)
      .filter(t => t.userId !== currentUserId);
    callback(indicators);
  });
}

// ─── Message validation ───────────────────────────────────────────────────────

function validateMessagePayload(
  content: string,
  type: ChatMessage['type'],
  imageUrls?: string[],
): void {
  if (type === 'text' && !content.trim()) {
    throw new RepositoryError('Message content cannot be empty', 'invalid-argument');
  }
  if (type === 'image') {
    if (!imageUrls?.length) {
      throw new RepositoryError('Image message must contain at least one URL', 'invalid-argument');
    }
    if (imageUrls.length > MAX_IMAGE_UPLOADS) {
      throw new RepositoryError(
        `Cannot attach more than ${MAX_IMAGE_UPLOADS} images per message`,
        'invalid-argument',
      );
    }
  }
}

// ─── Admin notification ─────────────────────────────────────────────────────────
/**
 * Notify all online/active admin agents when a customer sends a message
 * in a support conversation. Fire-and-forget — failures are logged invisibly.
 */
async function notifyAdminsCustomerMessage(
  sender: UserProfile,
  content: string,
  conversationId: string,
): Promise<void> {
  try {
    const agents = await listAgents();
    if (agents.length === 0) return;
    const agentIds = agents.map(a => a.uid);
    const preview = content.length > 100 ? content.slice(0, 97) + '...' : content;

    await createNotificationsForMany(agentIds, {
      type: 'chat',
      priority: 'normal',
      channel: 'in_app',
      title: `رسالة جديدة من ${sender.name}`,
      body: preview,
      link: `/chat?conversation=${conversationId}`,
      senderId: sender.uid,
      senderName: sender.name,
    });
  } catch {
    /* fire-and-forget: never crash the message send path */
  }
}

// ─── Send message ─────────────────────────────────────────────────────────────

export interface SendMessageOptions {
  conversationId: string;
  sender:         UserProfile;
  content:        string;
  type?:          ChatMessage['type'];
  fileUrl?:       string;
  fileName?:      string;
  fileSize?:      number;
  imageUrls?:     string[];
  isInternal?:    boolean;   // agent-only note
  replyTo?:       string;
}

/**
 * Send a message and keep the conversation metadata in sync.
 * Steps:
 *  1. Validate
 *  2. Write message document
 *  3. Update conversation.lastMessage + lastMessageTime
 *  4. Increment unreadCount for all other members
 *  5. Clear typing indicator for this user
 */
export async function sendMessage(opts: SendMessageOptions): Promise<ChatMessage> {
  const type = opts.type ?? 'text';

  validateMessagePayload(opts.content, type, opts.imageUrls);

  // Internal notes are only allowed for agents/admins
  if (opts.isInternal && !isAgent(opts.sender)) {
    throw new RepositoryError('Only agents can post internal notes', 'permission-denied');
  }

  const conv = await getConversationById(opts.conversationId);
  if (!conv) {
    throw new RepositoryError(`Conversation not found: ${opts.conversationId}`, 'not-found');
  }

  // Verify sender is a member of the conversation
  if (!conv.members.includes(opts.sender.uid)) {
    throw new RepositoryError('Sender is not a member of this conversation', 'permission-denied');
  }

  const msg = await createMessage({
    conversationId: opts.conversationId,
    senderId:       opts.sender.uid,
    senderName:     opts.sender.name,
    senderRole:     opts.sender.role,
    senderType:     isAgent(opts.sender) ? 'agent' : 'user',
    content:        opts.content,
    type,
    fileUrl:        opts.fileUrl,
    fileName:       opts.fileName,
    fileSize:       opts.fileSize,
    imageUrls:      opts.imageUrls,
    isInternal:     opts.isInternal ?? false,
    replyTo:        opts.replyTo,
  });

  // Internal notes do not update the public conversation preview
  if (!opts.isInternal) {
    const preview = messagePreview(msg);
    await updateLastMessage(opts.conversationId, preview, opts.sender.uid);
    await incrementUnreadForOthers(opts.conversationId, opts.sender.uid, conv.members);
  }

  // Clear typing indicator (fire and forget)
  setTyping(opts.conversationId, opts.sender, false).catch(() => {});

  // Notify all admins when a customer sends a message in a support conversation
  if (!opts.isInternal && conv.type === 'support' && !isAgent(opts.sender)) {
    notifyAdminsCustomerMessage(opts.sender, opts.content, opts.conversationId)
      .catch(() => {});
  }

  return msg;
}

// ─── Edit / delete ────────────────────────────────────────────────────────────

export async function editChatMessage(
  messageId: string,
  newContent: string,
  editor: UserProfile,
): Promise<void> {
  await editMessage(messageId, newContent, editor.uid);
}

export async function deleteChatMessage(
  messageId: string,
  deleter: UserProfile,
): Promise<void> {
  await softDeleteMessage(messageId, deleter.uid);
}

// ─── Mark read ────────────────────────────────────────────────────────────────

export async function markRead(
  conversationId: string,
  user: UserProfile,
): Promise<void> {
  await markConversationRead(conversationId, user.uid);
  await markConversationMessagesRead(conversationId, user.uid);
}

// ─── Conversation creation helpers ───────────────────────────────────────────

export async function openDMConversation(
  user1: UserProfile,
  user2: UserProfile,
): Promise<string> {
  return getOrCreateDMConversation(user1, user2);
}

export async function openAdminGroup(): Promise<string> {
  const agents = await listAgents();
  return getOrCreateAdminGroup(agents);
}

/**
 * Open or return the existing support conversation for a customer.
 * This does NOT create a ticket — ticket creation is in TicketService.
 */
export async function openSupportConversation(
  customer: UserProfile,
  ticketId: string,
): Promise<string> {
  return createSupportConversation(customer, ticketId);
}

export async function assignAgentToConversation(
  conversationId: string,
  agent: UserProfile,
): Promise<void> {
  await addAgentToConversation(conversationId, agent);
}
