// ─── Enumerations ───────────────────────────────────────────────────────────

export type TicketStatus =
  | 'new'               // just created, not yet picked up
  | 'open'              // assigned to agent, in progress
  | 'pending_customer'  // waiting for customer reply
  | 'pending_agent'     // customer replied, waiting for agent
  | 'resolved'          // agent marked resolved
  | 'closed';           // auto-closed or manually closed after resolution

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketCategory =
  | 'technical'
  | 'billing'
  | 'account'
  | 'content'
  | 'general'
  | 'other';

// ─── SLA Configuration ───────────────────────────────────────────────────────

export interface SlaRecord {
  firstResponseDeadline: string;  // ISO
  resolutionDeadline: string;     // ISO
  firstRespondedAt?: string;
  resolvedAt?: string;
  breached: boolean;
  breachType?: 'first_response' | 'resolution';
}

// ─── Timeline Event ───────────────────────────────────────────────────────────

export interface TicketTimelineEvent {
  id: string;
  type:
    | 'created'
    | 'assigned'
    | 'status_changed'
    | 'priority_changed'
    | 'message_sent'
    | 'note_added'
    | 'resolved'
    | 'closed'
    | 'reopened'
    | 'csat_submitted';
  actorId: string;
  actorName: string;
  actorRole: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Canned Response ─────────────────────────────────────────────────────────

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: TicketCategory | 'all';
  usageCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ─── Ticket ──────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  ticketNumber: string;           // human-readable: "EMF-2026-0042"
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  subject: string;
  conversationId: string;         // links to conversations collection
  botHandled: boolean;
  botSessionId?: string;
  csatScore?: 1 | 2 | 3 | 4 | 5;
  csatFeedback?: string;
  csatSubmittedAt?: string;
  sla: SlaRecord;
  tags: string[];
  timeline: TicketTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  firstResponseAt?: string;
  messageCount: number;
  isRead: Record<string, boolean>; // agentId → boolean
}

// ─── CSAT Payload ─────────────────────────────────────────────────────────────

export interface CsatPayload {
  ticketId: string;
  score: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
}

// ─── Assignment Payload ───────────────────────────────────────────────────────

export interface AssignTicketPayload {
  ticketId: string;
  agentId: string;
  agentName: string;
  note?: string;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isOpenTicket(ticket: Ticket): boolean {
  return ticket.status === 'open' || ticket.status === 'pending_agent';
}

export function isClosedTicket(ticket: Ticket): boolean {
  return ticket.status === 'resolved' || ticket.status === 'closed';
}

export function isBreached(ticket: Ticket): boolean {
  return ticket.sla.breached;
}
