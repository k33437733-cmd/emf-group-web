// ─── Enumerations ───────────────────────────────────────────────────────────

export type ConversationType =
  | 'admin_dm'      // admin ↔ admin direct message
  | 'admin_group'   // all admins group chat
  | 'agent_member'  // agent ↔ specific regular user
  | 'support';      // customer support thread (linked to a ticket)

export type ConversationStatus = 'active' | 'archived';

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
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
  isGroup: boolean;
  name?: string;
  groupName?: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderId: string;
  unreadCount: Record<string, number>;     // uid → count
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
  replyTo?: string;     // message ID
  editedAt?: string;
  deletedAt?: string;   // soft delete: keep doc, hide content
  deliveryStatus: DeliveryStatus;
  readBy: Record<string, string>; // uid → ISO timestamp
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
