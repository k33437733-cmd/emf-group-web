/**
 * ContentRepository
 * All reads and writes to the `contents` collection.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import { CONTENT_PAGE_SIZE } from '../../constants/config';
import type { ContentItem, ContentType, CreateContentPayload, UpdateContentPayload } from '../../types/content';
import { fromSnapshot, nowISO, wrapFirestoreError } from './base';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = () => collection(db, COLLECTIONS.CONTENTS);
const ref = (id: string) => doc(db, COLLECTIONS.CONTENTS, id);

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getContentById(id: string): Promise<ContentItem | null> {
  try {
    const snap = await getDoc(ref(id));
    return fromSnapshot<ContentItem>(snap);
  } catch (err) {
    wrapFirestoreError(err, 'getContentById');
  }
}

export async function listContent(
  type?: ContentType,
  afterCursor?: string,
  pageSize = CONTENT_PAGE_SIZE,
): Promise<ContentItem[]> {
  try {
    let q = type
      ? query(
          col(),
          where('type', '==', type),
          where('isPublished', '==', true),
          orderBy('createdAt', 'desc'),
          limit(pageSize),
        )
      : query(
          col(),
          where('isPublished', '==', true),
          orderBy('createdAt', 'desc'),
          limit(pageSize),
        );

    if (afterCursor) {
      q = type
        ? query(
            col(),
            where('type', '==', type),
            where('isPublished', '==', true),
            orderBy('createdAt', 'desc'),
            startAfter(afterCursor),
            limit(pageSize),
          )
        : query(
            col(),
            where('isPublished', '==', true),
            orderBy('createdAt', 'desc'),
            startAfter(afterCursor),
            limit(pageSize),
          );
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }) as ContentItem);
  } catch (err) {
    wrapFirestoreError(err, 'listContent');
  }
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToContent(
  callback: (items: ContentItem[]) => void,
  type?: ContentType,
  pageSize = CONTENT_PAGE_SIZE,
): Unsubscribe {
  const q = type
    ? query(
        col(),
        where('type', '==', type),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      )
    : query(
        col(),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      );

  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ ...d.data() }) as ContentItem)),
    err => wrapFirestoreError(err, 'subscribeToContent'),
  );
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContent(payload: CreateContentPayload): Promise<ContentItem> {
  try {
    const docRef  = doc(col());
    const item: ContentItem = {
      id:            docRef.id,
      title:         payload.title,
      description:   payload.description,
      type:          payload.type,
      url:           payload.url,
      thumbnailUrl:  payload.thumbnailUrl,
      fileName:      payload.fileName,
      fileSize:      payload.fileSize,
      fileType:      payload.fileType,
      duration:      payload.duration,
      uploadedBy:    payload.uploadedBy,
      uploadedByName: payload.uploadedByName,
      tags:          payload.tags ?? [],
      accessLevel:   payload.accessLevel ?? 'all',
      isPublished:   true,
      views:         0,
      downloads:     0,
      createdAt:     nowISO(),
      updatedAt:     nowISO(),
    };
    await setDoc(docRef, item);
    return item;
  } catch (err) {
    wrapFirestoreError(err, 'createContent');
  }
}

export async function updateContent(
  id: string,
  updates: UpdateContentPayload,
): Promise<void> {
  try {
    await updateDoc(ref(id), { ...updates, updatedAt: nowISO() });
  } catch (err) {
    wrapFirestoreError(err, 'updateContent');
  }
}

export async function deleteContent(id: string): Promise<void> {
  try {
    await deleteDoc(ref(id));
  } catch (err) {
    wrapFirestoreError(err, 'deleteContent');
  }
}

// ─── Counters (atomic increments) ────────────────────────────────────────────

export async function incrementViews(id: string): Promise<void> {
  try {
    await updateDoc(ref(id), { views: increment(1) });
  } catch (err) {
    wrapFirestoreError(err, 'incrementViews');
  }
}

export async function incrementDownloads(id: string): Promise<void> {
  try {
    await updateDoc(ref(id), { downloads: increment(1) });
  } catch (err) {
    wrapFirestoreError(err, 'incrementDownloads');
  }
}
