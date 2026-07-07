/**
 * AuditRepository
 * All reads and writes to the `audit_logs` collection.
 * Logs are append-only — update/delete are forbidden in Firestore rules.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { AUDIT_LOGS_PAGE_SIZE } from '../../constants/config';
import type { AuditLog, AuditAction, AuditSeverity } from '../../types/audit';
import type { UserProfile } from '../../types/auth';
import { nowISO, wrapFirestoreError } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = () => collection(db, COLLECTIONS.AUDIT_LOGS);

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listAuditLogs(
  afterCursor?: string,
  pageSize = AUDIT_LOGS_PAGE_SIZE,
): Promise<AuditLog[]> {
  try {
    let q = query(col(), orderBy('createdAt', 'desc'), limit(pageSize));
    if (afterCursor) {
      q = query(col(), orderBy('createdAt', 'desc'), startAfter(afterCursor), limit(pageSize));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AuditLog);
  } catch (err) {
    wrapFirestoreError(err, 'listAuditLogs');
  }
}

export async function listAuditLogsByUser(
  userId: string,
  pageSize = AUDIT_LOGS_PAGE_SIZE,
): Promise<AuditLog[]> {
  try {
    const q = query(
      col(),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AuditLog);
  } catch (err) {
    wrapFirestoreError(err, 'listAuditLogsByUser');
  }
}

export function subscribeToAuditLogs(
  callback: (logs: AuditLog[]) => void,
  pageSize = AUDIT_LOGS_PAGE_SIZE,
): Unsubscribe {
  const q = query(col(), orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data() as AuditLog)),
    err => wrapFirestoreError(err, 'subscribeToAuditLogs'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function writeAuditLog(
  actor: UserProfile,
  action: AuditAction,
  resource: string,
  resourceId: string,
  description: string,
  severity: AuditSeverity = 'info',
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const logRef = doc(col());
    const log: AuditLog = {
      id:          logRef.id,
      userId:      actor.uid,
      userName:    actor.name,
      userRole:    actor.role,
      action,
      resource,
      resourceId,
      description,
      severity,
      metadata,
      createdAt:   nowISO(),
    };
    await setDoc(logRef, log);
  } catch (err) {
    // Audit log failure must never crash the calling operation.
    // Log to console but do not rethrow.
    console.error('[AuditRepository] Failed to write audit log:', err);
  }
}
