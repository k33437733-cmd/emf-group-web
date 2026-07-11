// ─── Enumerations ───────────────────────────────────────────────────────────

export type ConversationType =
  | 'admin_dm'      // admin ↔ admin direct message
  | 'admin_group'   // all admins group chat
  | 'agent_member'  // agent ↔ specific regular user
  | 'support'       // customer support thread (linked to a ticket)
  | 'department'    // department-wide chat
  | 'project_room'  // per-project chat room
  | 'broadcast';    // one-way broadcast channel

export type ConversationStatus = 'active' | 'archived';

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'voice'
  | 'bot_card'      // chatbot card with quick-reply buttons
  | 'system_event'; // status changes, assignments, etc.

export type SenderType = 'user' | 'agent' | 'bot' | 'system';

export type DeliveryStatus = 'sent' | 'delivered' | 'read';

// ─── Conversation ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  type: ConversationType;
  members: string[];                       // UIDs — keep as small as possible
  memberNames: Record<string, string>;     // uid → display name
  memberRoles: Record<string, string>;     // uid → role
  ticketId?: string;                       // set for type === 'support'
  departmentId?: string;                   // set for type === 'department'
  projectId?: string;                      // set for type === 'project_room'
  customerAvatar?: string;                 // customer photo URL for support conversations
  isGroup: boolean;
  isBroadcast: boolean;                    // true for broadcast channels (read-only for non-owners)
  name?: string;
  groupName?: string;
  avatar?: string;            // group avatar URL
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderId: string;
  unreadCount: Record<string, number>;     // uid → count
  pinnedMessages?: string[];               // IDs of pinned messages
  muted?: boolean;                         // muted by an admin
  isImportant?: boolean;                   // flagged as important
  tags?: string[];                         // custom tags/labels
  status: ConversationStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export interface BotQuickReply {
  label: string;
  value: string;
  action?: 'resolve' | 'escalate' | 'canned_response';
}

export interface BotCardData {
  intent: string;
  message: string;
  quickReplies: BotQuickReply[];
  resolved: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderType: SenderType;
  content: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  imageUrls?: string[];
  botData?: BotCardData;
  isInternal: boolean;  // agent-only note — never sent to customer
  replyTo?: string;     // message ID being replied to
  parentId?: string;    // thread parent (if this is a thread reply)
  mentionedUsers?: string[]; // UIDs of mentioned users (@mentions)
  isPinned?: boolean;   // pinned message flag
  editedAt?: string;
  deletedAt?: string;
  forwardedFrom?: string;
  forwardedBy?: string;
  forwardedAt?: string;
  reactions?: Record<string, { emoji: string; users: string[] }>;
  deliveryStatus: DeliveryStatus;
  readBy: Record<string, string>;
  createdAt: string;
}

// ─── Typing Indicator (ephemeral — not persisted) ────────────────────────────

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  updatedAt: string;
}

// ─── Message Pagination ──────────────────────────────────────────────────────

export interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
  oldestCursor: string | null; // ISO timestamp of oldest message loaded
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isSupportConversation(conv: Conversation): boolean {
  return conv.type === 'support';
}

export function isGroupConversation(conv: Conversation): boolean {
  return conv.isGroup;
}
