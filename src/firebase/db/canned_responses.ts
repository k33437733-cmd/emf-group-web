/**
 * CannedResponseRepository
 * All reads and writes to the `canned_responses` collection.
 * Used by agents to quickly insert pre-written replies.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import type { CannedResponse, TicketCategory } from '../../types/support';
import { nowISO, wrapFirestoreError } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = () => collection(db, COLLECTIONS.CANNED_RESPONSES);
const ref = (id: string) => doc(db, COLLECTIONS.CANNED_RESPONSES, id);

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listCannedResponses(
  category?: TicketCategory | 'all',
): Promise<CannedResponse[]> {
  try {
    const q = category && category !== 'all'
      ? query(
          col(),
          where('isActive', '==', true),
          where('category', 'in', [category, 'all']),
          orderBy('usageCount', 'desc'),
          limit(50),
        )
      : query(
          col(),
          where('isActive', '==', true),
          orderBy('usageCount', 'desc'),
          limit(50),
        );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }) as CannedResponse);
  } catch (err) {
    wrapFirestoreError(err, 'listCannedResponses');
  }
}

export function subscribeToCannedResponses(
  callback: (responses: CannedResponse[]) => void,
): Unsubscribe {
  const q = query(
    col(),
    where('isActive', '==', true),
    orderBy('usageCount', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ ...d.data() }) as CannedResponse)),
    err => wrapFirestoreError(err, 'subscribeToCannedResponses'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createCannedResponse(
  payload: Pick<CannedResponse, 'title' | 'content' | 'category' | 'createdBy' | 'createdByName'>,
): Promise<CannedResponse> {
  try {
    const docRef = doc(col());
    const cr: CannedResponse = {
      id:            docRef.id,
      title:         payload.title,
      content:       payload.content,
      category:      payload.category,
      usageCount:    0,
      createdBy:     payload.createdBy,
      createdByName: payload.createdByName,
      createdAt:     nowISO(),
      updatedAt:     nowISO(),
      isActive:      true,
    };
    await setDoc(docRef, cr);
    return cr;
  } catch (err) {
    wrapFirestoreError(err, 'createCannedResponse');
  }
}

export async function updateCannedResponse(
  id: string,
  updates: Partial<Pick<CannedResponse, 'title' | 'content' | 'category' | 'isActive'>>,
): Promise<void> {
  try {
    await updateDoc(ref(id), { ...updates, updatedAt: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'updateCannedResponse');
  }
}

export async function deleteCannedResponse(id: string): Promise<void> {
  try {
    await deleteDoc(ref(id));
  } catch (err) {
    wrapFirestoreError(err, 'deleteCannedResponse');
  }
}

/** Increment usageCount when a canned response is used in a reply. */
export async function recordCannedResponseUsage(id: string): Promise<void> {
  try {
    await updateDoc(ref(id), { usageCount: increment(1) });
  } catch (err) {
    // Non-critical — don't rethrow
    console.warn('[CannedResponseRepository] Failed to increment usageCount:', err);
  }
}
