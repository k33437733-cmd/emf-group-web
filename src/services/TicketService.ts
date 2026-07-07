/**
 * TicketService
 * Orchestrates all ticket operations: creation, assignment, progression,
 * SLA checks, CSAT submissions, and keeping agent status counters in sync.
 */

import {
  doc,
  runTransaction,
  writeBatch,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../constants/collections';
import {
  SLA_FIRST_RESPONSE,
  SLA_RESOLUTION,
  buildTicketNumber,
} from '../constants/config';
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketTimelineEvent,
  SlaRecord,
} from '../types/support';
import type { UserProfile } from '../types/auth';
import {
  nowISO,
  addMinutes,
  generateId,
  RepositoryError,
} from '../firebase/db/base';
import { getTicketById } from '../firebase/db/tickets';
import { broadcastConversationToAdmins } from '../firebase/db/conversations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ticketRef = (id: string) => doc(db, COLLECTIONS.TICKETS, id);
const convRef = (id: string) => doc(db, COLLECTIONS.CONVERSATIONS, id);
const ctrRef = (year: number) => doc(db, COLLECTIONS.TICKET_COUNTERS, String(year));

function buildSla(priority: TicketPriority): SlaRecord {
  const firstMin = SLA_FIRST_RESPONSE[priority] ?? SLA_FIRST_RESPONSE['normal'];
  const resolMin = SLA_RESOLUTION[priority] ?? SLA_RESOLUTION['normal'];
  return {
    firstResponseDeadline: addMinutes(firstMin),
    resolutionDeadline: addMinutes(resolMin),
    breached: false,
  };
}

function buildTimelineEvent(
  type: TicketTimelineEvent['type'],
  actor: UserProfile,
  description: string,
  metadata?: Record<string, unknown>,
): TicketTimelineEvent {
  return {
    id: generateId(),
    type,
    actorId: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    description,
    metadata,
    createdAt: nowISO(),
  };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Creates a support ticket and its corresponding conversation atomically.
 */
export async function createSupportTicket(
  customer: UserProfile,
  subject: string,
  category: TicketCategory,
  priority: TicketPriority = 'normal',
): Promise<Ticket> {
  const generatedTicketId = generateId();
  const generatedConvId = generateId();
  const year = new Date().getFullYear();

  const conversationId = generatedConvId;

  try {
    const ticket = await runTransaction(db, async (tx) => {
      // 1. Generate sequential ticket number
      const ctrSnap = await tx.get(ctrRef(year));
      const seq = ctrSnap.exists() ? (ctrSnap.data().seq as number) + 1 : 1;
      tx.set(ctrRef(year), { seq, year });

      const ticketNumber = buildTicketNumber(year, seq);

      // 2. Build ticket document
      const newTicket: Ticket = {
        id: generatedTicketId,
        ticketNumber,
        customerId: customer.uid,
        customerName: customer.name,
        customerEmail: customer.email,
        assignedAgentId: null,
        assignedAgentName: null,
        status: 'new',
        priority,
        category,
        subject,
        conversationId,
        botHandled: false,
        sla: buildSla(priority),
        tags: [],
        timeline: [
          buildTimelineEvent('created', customer, `تم إنشاء التذكرة #${ticketNumber}`),
        ],
        isRead: {},
        messageCount: 0,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      // 3. Build support conversation document
      const conv = {
        id: conversationId,
        type: 'support',
        members: [customer.uid],
        memberNames: { [customer.uid]: customer.name },
        memberRoles: { [customer.uid]: customer.role },
        isGroup: false,
        ticketId: generatedTicketId,
        lastMessage: 'تم فتح تذكرة دعم جديدة',
        lastMessageTime: nowISO(),
        lastMessageSenderId: 'system',
        unreadCount: { [customer.uid]: 0 },
        status: 'active',
        createdAt: nowISO(),
        createdBy: customer.uid,
        updatedAt: nowISO(),
      };

      // 4. Write documents atomically in the transaction
      tx.set(ticketRef(generatedTicketId), newTicket);
      tx.set(convRef(conversationId), conv);

      return newTicket;
    });

    // 5. Broadcast conversation to all admins (fire-and-forget, outside transaction)
    broadcastConversationToAdmins(conversationId).catch(() => {});

    return ticket;
  } catch (err) {
    throw new RepositoryError(
      `[createSupportTicket] Transaction failed: ${String(err)}`,
      'aborted',
      err,
    );
  }
}

/**
 * Assigns a ticket to an agent, adds the agent to the chat, and increments their active ticket count.
 */
export async function assignTicketToAgent(
  ticketId: string,
  agent: UserProfile,
  assignedBy: UserProfile,
  note?: string,
): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const ticketSnap = await tx.get(ticketRef(ticketId));
      if (!ticketSnap.exists()) {
        throw new RepositoryError(`Ticket ${ticketId} not found`, 'not-found');
      }
      const ticket = ticketSnap.data() as Ticket;
      const oldAgentId = ticket.assignedAgentId;

      // Build timeline event
      const event = buildTimelineEvent(
        'assigned',
        assignedBy,
        `تم تعيين التذكرة للوكيل ${agent.name}`,
        { agentId: agent.uid, agentName: agent.name, note },
      );

      const timeline = [...(ticket.timeline || []), event];

      // Update ticket doc
      tx.update(ticketRef(ticketId), {
        assignedAgentId: agent.uid,
        assignedAgentName: agent.name,
        status: 'open',
        timeline,
        updatedAt: nowISO(),
      });

      // Update conversation membership in Firestore (separate function handled below)
      // Note: we'll call addAgentToConversation outside the transaction or write in transaction if preferred,
      // but since conversations document also needs unreadCount / members maps updated:
      const convSnap = await tx.get(convRef(ticket.conversationId));
      if (convSnap.exists()) {
        const conv = convSnap.data();
        const members = Array.from(new Set([...(conv.members || []), agent.uid]));
        const memberNames = { ...(conv.memberNames || {}), [agent.uid]: agent.name };
        const memberRoles = { ...(conv.memberRoles || {}), [agent.uid]: agent.role };
        const unreadCount = { ...(conv.unreadCount || {}), [agent.uid]: 0 };

        tx.update(convRef(ticket.conversationId), {
          members,
          memberNames,
          memberRoles,
          unreadCount,
          updatedAt: nowISO(),
        });
      }

      // If there was an old agent, decrement their ticket capacity count
      if (oldAgentId && oldAgentId !== agent.uid) {
        const oldAgentStatusRef = doc(db, COLLECTIONS.AGENT_STATUS, oldAgentId);
        const oldStatusSnap = await tx.get(oldAgentStatusRef);
        if (oldStatusSnap.exists()) {
          const currentCount = oldStatusSnap.data().activeTickets ?? 0;
          tx.update(oldAgentStatusRef, {
            activeTickets: Math.max(0, currentCount - 1),
          });
        }
      }

      // Increment new agent ticket capacity count
      const newAgentStatusRef = doc(db, COLLECTIONS.AGENT_STATUS, agent.uid);
      const newStatusSnap = await tx.get(newAgentStatusRef);
      if (newStatusSnap.exists()) {
        const currentCount = newStatusSnap.data().activeTickets ?? 0;
        tx.update(newAgentStatusRef, {
          activeTickets: currentCount + 1,
        });
      }
    });
  } catch (err) {
    throw new RepositoryError(
      `[assignTicketToAgent] Failed: ${String(err)}`,
      'aborted',
      err,
    );
  }
}

/**
 * Updates a ticket status and handles decrementing active ticket counters if resolved or closed.
 */
export async function updateSupportTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  actor: UserProfile,
  note?: string,
): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const ticketSnap = await tx.get(ticketRef(ticketId));
      if (!ticketSnap.exists()) {
        throw new RepositoryError(`Ticket ${ticketId} not found`, 'not-found');
      }
      const ticket = ticketSnap.data() as Ticket;
      const oldStatus = ticket.status;

      if (oldStatus === newStatus) return;

      const event = buildTimelineEvent(
        'status_changed',
        actor,
        `تم تغيير حالة التذكرة إلى: ${newStatus}`,
        { from: oldStatus, to: newStatus, note },
      );

      const updates: Partial<Ticket> & Record<string, any> = {
        status: newStatus,
        timeline: [...(ticket.timeline || []), event],
        updatedAt: nowISO(),
      };

      if (newStatus === 'resolved') updates.resolvedAt = nowISO();
      if (newStatus === 'closed') updates.closedAt = nowISO();
      if (!ticket.firstResponseAt && newStatus === 'open') {
        updates.firstResponseAt = nowISO();
        updates['sla.firstRespondedAt'] = nowISO();
      }

      tx.update(ticketRef(ticketId), updates);

      // Capacity reduction on ticket closure/resolution
      const wasOpen = ['new', 'open', 'pending_agent', 'pending_customer'].includes(oldStatus);
      const isNowClosed = ['resolved', 'closed'].includes(newStatus);

      if (wasOpen && isNowClosed && ticket.assignedAgentId) {
        const agentStatusRef = doc(db, COLLECTIONS.AGENT_STATUS, ticket.assignedAgentId);
        const statusSnap = await tx.get(agentStatusRef);
        if (statusSnap.exists()) {
          const currentCount = statusSnap.data().activeTickets ?? 0;
          tx.update(agentStatusRef, {
            activeTickets: Math.max(0, currentCount - 1),
          });
        }
      }

      // Capacity addition if ticket is re-opened
      const wasClosed = ['resolved', 'closed'].includes(oldStatus);
      const isNowOpen = ['open', 'pending_agent'].includes(newStatus);

      if (wasClosed && isNowOpen && ticket.assignedAgentId) {
        const agentStatusRef = doc(db, COLLECTIONS.AGENT_STATUS, ticket.assignedAgentId);
        const statusSnap = await tx.get(agentStatusRef);
        if (statusSnap.exists()) {
          const currentCount = statusSnap.data().activeTickets ?? 0;
          tx.update(agentStatusRef, {
            activeTickets: currentCount + 1,
          });
        }
      }
    });
  } catch (err) {
    throw new RepositoryError(
      `[updateSupportTicketStatus] Failed: ${String(err)}`,
      'aborted',
      err,
    );
  }
}

/**
 * Customer submits feedback for resolved/closed ticket.
 */
export async function submitTicketCsat(
  ticketId: string,
  customerId: string,
  score: 1 | 2 | 3 | 4 | 5,
  feedback?: string,
): Promise<void> {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new RepositoryError('Ticket not found', 'not-found');
    if (ticket.customerId !== customerId) {
      throw new RepositoryError('Unauthorized to submit feedback for this ticket', 'permission-denied');
    }

    await updateDoc(ticketRef(ticketId), {
      csatScore: score,
      csatFeedback: feedback ?? '',
      csatSubmittedAt: nowISO(),
      updatedAt: nowISO(),
    });
  } catch (err) {
    throw new RepositoryError(
      `[submitTicketCsat] Failed: ${String(err)}`,
      'unknown',
      err,
    );
  }
}

/**
 * Checks all active tickets and flags SLA breaches.
 * Intended for client background check or cloud function usage.
 */
export async function checkSupportSlaBreaches(): Promise<number> {
  const colRef = collection(db, COLLECTIONS.TICKETS);
  const q = query(
    colRef,
    where('status', 'in', ['new', 'open', 'pending_agent']),
    where('sla.breached', '==', false),
  );

  try {
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const now = nowISO();
    const batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach((docSnap) => {
      const ticket = docSnap.data() as Ticket;
      const sla = ticket.sla;

      let breached = false;
      let breachType: 'first_response' | 'resolution' | undefined;

      // Check first response deadline
      if (!ticket.firstResponseAt && now > sla.firstResponseDeadline) {
        breached = true;
        breachType = 'first_response';
      }
      // Check resolution deadline
      else if (!ticket.resolvedAt && now > sla.resolutionDeadline) {
        breached = true;
        breachType = 'resolution';
      }

      if (breached && breachType) {
        batch.update(docSnap.ref, {
          'sla.breached': true,
          'sla.breachType': breachType,
          updatedAt: now,
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (err) {
    throw new RepositoryError(
      `[checkSupportSlaBreaches] Failed: ${String(err)}`,
      'unknown',
      err,
    );
  }
}


