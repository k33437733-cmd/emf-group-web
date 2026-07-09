/**
 * Base repository utilities shared by all repositories.
 * Provides typed helpers for common Firestore operations.
 */

import { FirestoreError } from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';

// ─── Data helpers ──────────────────────────────────────────────────────────────

/**
 * Strip all `undefined` values from an object (deeply).
 * Firestore v9+ SDK throws "Unsupported field value: undefined" on setDoc/updateDoc.
 */
export function cleanUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      const nested = cleanUndefined(v as Record<string, unknown>);
      out[k] = nested;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// ─── Error handling ───────────────────────────────────────────────────────────

export class RepositoryError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(
    message: string,
    code: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.cause = cause;
  }
}

export function wrapFirestoreError(err: unknown, context: string): never {
  if (err instanceof FirestoreError) {
    throw new RepositoryError(
      `[${context}] Firestore error: ${err.message}`,
      err.code,
      err,
    );
  }
  throw new RepositoryError(
    `[${context}] Unexpected error: ${String(err)}`,
    'unknown',
    err,
  );
}

// ─── Snapshot helpers ─────────────────────────────────────────────────────────

/**
 * Safely extract typed data from a DocumentSnapshot.
 * Returns null when the document does not exist.
 */
export function fromSnapshot<T>(snap: DocumentSnapshot): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/**
 * Assert a document exists, throw RepositoryError otherwise.
 */
export function requireSnapshot<T>(snap: DocumentSnapshot, label: string): T {
  if (!snap.exists()) {
    throw new RepositoryError(
      `Document not found: ${label} (${snap.ref.path})`,
      'not-found',
    );
  }
  return { id: snap.id, ...snap.data() } as T;
}

// ─── ISO timestamp ────────────────────────────────────────────────────────────

export function nowISO(): string {
  return new Date().toISOString();
}

/** Add N minutes to now, return ISO string. */
export function addMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Add N days to now, return ISO string. */
export function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

// ─── ID generation ────────────────────────────────────────────────────────────

/** Generate a random 20-char Firestore-compatible ID client-side. */
export function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
