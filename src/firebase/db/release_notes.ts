import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '../../constants/collections';
import type { ReleaseNote } from '../../types';

const col = () => collection(db, COLLECTIONS.RELEASE_NOTES);
const ref = (id: string) => doc(db, COLLECTIONS.RELEASE_NOTES, id);

export function subscribeToReleases(callback: (releases: ReleaseNote[]) => void) {
  const q = query(col(), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: ReleaseNote[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as ReleaseNote));
    callback(list);
  });
}

export async function getReleases(): Promise<ReleaseNote[]> {
  const q = query(col(), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseNote));
}

export async function createRelease(data: Omit<ReleaseNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(col());
  const now = new Date().toISOString();
  const release: ReleaseNote = {
    ...data,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, release);
  return docRef.id;
}

export async function updateRelease(id: string, data: Partial<Omit<ReleaseNote, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(ref(id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteRelease(id: string): Promise<void> {
  await deleteDoc(ref(id));
}
