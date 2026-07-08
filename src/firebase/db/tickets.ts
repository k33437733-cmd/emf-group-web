/**
 * TicketRepository
 * All reads and writes to the `tickets` collection.
 *
 * Ticket numbers are auto-incremented via an atomic counter document in
 * the `ticket_counters` collection — safe for concurrent creation.
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
  startAfter,
  onSnapshot,
  getDocs,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { TICKETS_PAGE_SIZE, SLA_FIRST_RESPONSE, SLA_RESOLUTION, buildTicketNumber } from '../../constants/config';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory, TicketTimelineEvent, SlaRecord } from '../../types/support';
import type { UserProfile } from '../../types/auth';
import { fromSnapshot, nowISO, addMinutes, wrapFirestoreError, generateId } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col    = () => collection(db, COLLECTIONS.TICKETS);
const ref    = (id: string) => doc(db, COLLECTIONS.TICKETS, id);
const ctrRef = (year: number) => doc(db, COLLECTIONS.TICKET_COUNTERS, String(year));

// ─── Ticket number generation ─────────────────────────────────────────────────

async function nextTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  return runTransaction(db, async tx => {
    const ctr = await tx.get(ctrRef(year));
    const seq = ctr.exists() ? (ctr.data().seq as number) + 1 : 1;
    tx.set(ctrRef(year), { seq, year });
    return buildTicketNumber(year, seq);
  });
}

// ─── SLA helpers ─────────────────────────────────────────────────────────────

function buildSla(priority: TicketPriority): SlaRecord {
  const firstMin  = SLA_FIRST_RESPONSE[priority] ?? SLA_FIRST_RESPONSE['normal'];
  const resolMin  = SLA_RESOLUTION[priority]     ?? SLA_RESOLUTION['normal'];
  return {
    firstResponseDeadline: addMinutes(firstMin),
    resolutionDeadline:    addMinutes(resolMin),
    breached:              false,
  };
}

function buildTimelineEvent(
  type: TicketTimelineEvent['type'],
  actor: UserProfile,
  description: string,
  metadata?: Record<string, unknown>,
): TicketTimelineEvent {
  return {
    id:          generateId(),
    type,
    actorId:     actor.uid,
    actorName:   actor.name,
    actorRole:   actor.role,
    description,
    metadata,
    createdAt:   nowISO(),
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTicketById(id: string): Promise<Ticket | null> {
  try {
    const snap = await getDoc(ref(id));
    return fromSnapshot<Ticket>(snap);
  } catch (err) {
    wrapFirestoreError(err, 'getTicketById');
  }
}

/** All open tickets — agent queue view. */
export async function listOpenTickets(
  afterCursor?: string,
  pageSize = TICKETS_PAGE_SIZE,
): Promise<Ticket[]> {
  try {
    let q = query(
      col(),
      where('status', 'in', ['new', 'open', 'pending_agent', 'pending_customer']),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    if (afterCursor) {
      q = query(
        col(),
        where('status', 'in', ['new', 'open', 'pending_agent', 'pending_customer']),
        orderBy('createdAt', 'desc'),
        startAfter(afterCursor),
        limit(pageSize),
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }) as Ticket);
  } catch (err) {
    wrapFirestoreError(err, 'listOpenTickets');
  }
}

/** Tickets assigned to a specific agent. */
export async function listTicketsByAgent(
  agentId: string,
  afterCursor?: string,
  pageSize = TICKETS_PAGE_SIZE,
): Promise<Ticket[]> {
  try {
    let q = query(
      col(),
      where('assignedAgentId', '==', agentId),
      where('status', 'in', ['open', 'pending_agent', 'pending_customer']),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    if (afterCursor) {
      q = query(
        col(),
        where('assignedAgentId', '==', agentId),
        where('status', 'in', ['open', 'pending_agent', 'pending_customer']),
        orderBy('createdAt', 'desc'),
        startAfter(afterCursor),
        limit(pageSize),
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }) as Ticket);
  } catch (err) {
    wrapFirestoreError(err, 'listTicketsByAgent');
  }
}

/** Customer's own tickets. */
export async function listTicketsByCustomer(customerId: string): Promise<Ticket[]> {
  try {
    const q = query(
      col(),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }) as Ticket);
  } catch (err) {
    wrapFirestoreError(err, 'listTicketsByCustomer');
  }
}

/** SLA-breached open tickets — for escalation dashboard. */
export async function listBreachedTickets(): Promise<Ticket[]> {
  try {
    const q = query(
      col(),
      where('sla.breached', '==', true),
      where('status', 'in', ['new', 'open', 'pending_agent']),
      orderBy('createdAt', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }) as Ticket);
  } catch (err) {
    wrapFirestoreError(err, 'listBreachedTickets');
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToTicket(
  id: string,
  callback: (ticket: Ticket | null) => void,
): Unsubscribe {
  return onSnapshot(
    ref(id),
    snap => callback(fromSnapshot<Ticket>(snap)),
    err => wrapFirestoreError(err, 'subscribeToTicket'),
  );
}

export function subscribeToAgentTickets(
  agentId: string,
  callback: (tickets: Ticket[]) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('assignedAgentId', '==', agentId),
    where('status', 'in', ['open', 'pending_agent', 'pending_customer']),
    orderBy('updatedAt', 'desc'),
    limit(TICKETS_PAGE_SIZE),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ ...d.data() }) as Ticket)),
    err => wrapFirestoreError(err, 'subscribeToAgentTickets'),
  );
}

export function subscribeToCustomerTicket(
  customerId: string,
  callback: (ticket: Ticket | null) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  return onSnapshot(
    q,
    snap => {
      const d = snap.docs[0];
      callback(d ? ({ ...d.data() }) as Ticket : null);
    },
    err => wrapFirestoreError(err, 'subscribeToCustomerTicket'),
  );
}

export function subscribeToOpenTickets(
  callback: (tickets: Ticket[]) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('status', 'in', ['new', 'open', 'pending_agent', 'pending_customer']),
    orderBy('createdAt', 'asc'),
    limit(TICKETS_PAGE_SIZE),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ ...d.data() }) as Ticket)),
    err => wrapFirestoreError(err, 'subscribeToOpenTickets'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createTicket(
  customer: UserProfile,
  subject: string,
  category: TicketCategory,
  conversationId: string,
  priority: TicketPriority = 'normal',
): Promise<Ticket> {
  try {
    const ticketRef    = doc(col());
    const ticketNumber = await nextTicketNumber();

    const ticket: Ticket = {
      id:                ticketRef.id,
      ticketNumber,
      customerId:        customer.uid,
      customerName:      customer.name,
      customerEmail:     customer.email,
      assignedAgentId:   null,
      assignedAgentName: null,
      status:            'new',
      priority,
      category,
      subject,
      conversationId,
      botHandled:        false,
      sla:               buildSla(priority),
      tags:              [],
      timeline: [
        buildTimelineEvent('created', customer, `تم إنشاء التذكرة #${ticketNumber}`),
      ],
      isRead:        {},
      messageCount:  0,
      createdAt:     nowISO(),
      updatedAt:     nowISO(),
    };

    await setDoc(ticketRef, ticket);
    return ticket;
  } catch (err) {
    wrapFirestoreError(err, 'createTicket');
  }
}

export async function assignTicket(
  ticketId: string,
  agent: UserProfile,
  assignedBy: UserProfile,
  note?: string,
): Promise<void> {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    const event = buildTimelineEvent(
      'assigned',
      assignedBy,
      `تم تعيين التذكرة للوكيل ${agent.name}`,
      { agentId: agent.uid, agentName: agent.name, note },
    );

    await updateDoc(ref(ticketId), {
      assignedAgentId:   agent.uid,
      assignedAgentName: agent.name,
      status:            'open',
      timeline:          [...ticket.timeline, event],
      updatedAt:         nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'assignTicket');
  }
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  actor: UserProfile,
  note?: string,
): Promise<void> {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    const event = buildTimelineEvent(
      'status_changed',
      actor,
      `تم تغيير حالة التذكرة إلى: ${newStatus}`,
      { from: ticket.status, to: newStatus, note },
    );

    const updates: Partial<Ticket> & Record<string, unknown> = {
      status:    newStatus,
      timeline:  [...ticket.timeline, event],
      updatedAt: nowISO(),
    };

    if (newStatus === 'resolved')                      updates['resolvedAt'] = nowISO();
    if (newStatus === 'closed')                        updates['closedAt']   = nowISO();
    if (!ticket.firstResponseAt && newStatus === 'open') {
      updates['firstResponseAt']         = nowISO();
      updates['sla.firstRespondedAt']    = nowISO();
    }

    await updateDoc(ref(ticketId), updates);
  } catch (err) {
    wrapFirestoreError(err, 'updateTicketStatus');
  }
}

export async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority,
  actor: UserProfile,
): Promise<void> {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    const event = buildTimelineEvent(
      'priority_changed',
      actor,
      `تم تغيير الأولوية إلى: ${priority}`,
      { from: ticket.priority, to: priority },
    );

    await updateDoc(ref(ticketId), {
      priority,
      sla:       buildSla(priority),
      timeline:  [...ticket.timeline, event],
      updatedAt: nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'updateTicketPriority');
  }
}

export async function submitCsat(
  ticketId: string,
  customerId: string,
  score: 1 | 2 | 3 | 4 | 5,
  feedback?: string,
): Promise<void> {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
    if (ticket.customerId !== customerId) throw new Error('Unauthorized');

    await updateDoc(ref(ticketId), {
      csatScore:         score,
      csatFeedback:      feedback ?? '',
      csatSubmittedAt:   nowISO(),
      updatedAt:         nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'submitCsat');
  }
}

export async function markSlaBreached(
  ticketId: string,
  breachType: 'first_response' | 'resolution',
): Promise<void> {
  try {
    await updateDoc(ref(ticketId), {
      'sla.breached':   true,
      'sla.breachType': breachType,
      updatedAt:        nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'markSlaBreached');
  }
}

export async function incrementMessageCount(ticketId: string): Promise<void> {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) return;
    await updateDoc(ref(ticketId), {
      messageCount: (ticket.messageCount ?? 0) + 1,
      updatedAt:    nowISO(),
    });
  } catch (err) {
    wrapFirestoreError(err, 'incrementMessageCount');
  }
}
