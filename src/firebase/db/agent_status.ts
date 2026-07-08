/**
 * AgentStatusRepository
 * Manages the `agent_status` collection — a high-frequency, low-latency
 * presence layer separate from the main `users` collection to avoid
 * triggering expensive subscription fan-out on every heartbeat.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { HEARTBEAT_INTERVAL_MS, OFFLINE_THRESHOLD_MS, MAX_TICKETS_PER_AGENT } from '../../constants/config';
import type { AgentStatus } from '../../types/auth';
import { nowISO, wrapFirestoreError } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ref = (agentId: string) => doc(db, COLLECTIONS.AGENT_STATUS, agentId);
const col = () => collection(db, COLLECTIONS.AGENT_STATUS);

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAgentStatus(agentId: string): Promise<AgentStatus | null> {
  try {
    const snap = await getDoc(ref(agentId));
    if (!snap.exists()) return null;
    return snap.data() as AgentStatus;
  } catch (err) {
    wrapFirestoreError(err, 'getAgentStatus');
  }
}

/** Return all agents who are currently online or away and below capacity. */
export async function getAvailableAgents(): Promise<AgentStatus[]> {
  try {
    const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS).toISOString();
    const q = query(
      col(),
      where('status', 'in', ['online', 'away']),
      where('lastHeartbeat', '>=', threshold),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data() as AgentStatus)
      .filter(a => a.activeTickets < a.maxTickets);
  } catch (err) {
    wrapFirestoreError(err, 'getAvailableAgents');
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToAgentStatus(
  agentId: string,
  callback: (status: AgentStatus | null) => void,
): Unsubscribe {
  return onSnapshot(
    ref(agentId),
    snap => callback(snap.exists() ? (snap.data() as AgentStatus) : null),
    err => wrapFirestoreError(err, 'subscribeToAgentStatus'),
  );
}

export function subscribeToAllAgentStatuses(
  callback: (statuses: AgentStatus[]) => void,
): Unsubscribe {
  return onSnapshot(
    col(),
    snap => callback(snap.docs.map(d => d.data() as AgentStatus)),
    err => wrapFirestoreError(err, 'subscribeToAllAgentStatuses'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Upsert — called once on login to seed the document if it doesn't exist. */
export async function initAgentStatus(agentId: string): Promise<void> {
  try {
    const existing = await getAgentStatus(agentId);
    if (existing) return;
    const record: AgentStatus = {
      agentId,
      status:        'online',
      activeTickets: 0,
      maxTickets:    MAX_TICKETS_PER_AGENT,
      lastHeartbeat: nowISO(),
    };
    await setDoc(ref(agentId), record);
  } catch (err) {
    wrapFirestoreError(err, 'initAgentStatus');
  }
}

export async function heartbeat(agentId: string): Promise<void> {
  try {
    await updateDoc(ref(agentId), {
      lastHeartbeat: nowISO(),
      status: 'online',
    });
  } catch (err) {
    wrapFirestoreError(err, 'heartbeat');
  }
}

export async function setAgentAvailability(
  agentId: string,
  status: AgentStatus['status'],
): Promise<void> {
  try {
    await updateDoc(ref(agentId), { status, lastHeartbeat: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'setAgentAvailability');
  }
}

export async function incrementActiveTickets(agentId: string, delta: 1 | -1): Promise<void> {
  try {
    const current = await getAgentStatus(agentId);
    if (!current) return;
    const next = Math.max(0, current.activeTickets + delta);
    await updateDoc(ref(agentId), { activeTickets: next });
  } catch (err) {
    wrapFirestoreError(err, 'incrementActiveTickets');
  }
}

// ─── Heartbeat loop (client-side) ─────────────────────────────────────────────

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(agentId: string): () => void {
  heartbeat(agentId).catch(() => {});
  heartbeatTimer = setInterval(() => {
    heartbeat(agentId).catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    // Mark offline immediately on cleanup
    setAgentAvailability(agentId, 'offline').catch(() => {});
  };
}
