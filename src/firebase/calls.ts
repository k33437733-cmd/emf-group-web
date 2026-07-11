import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from './config';
import type { Meeting, Participant, SignalingMessage, MeetingChatMessage } from '../types/call';

const CALLS_COL = 'meetings';
const PARTICIPANTS_SUB = 'participants';
const SIGNALING_SUB = 'signaling';
const CHAT_SUB = 'chat';

// ── Meeting CRUD ────────────────────────────────────────────────

export async function createMeeting(data: Omit<Meeting, 'id' | 'createdAt'> & { id?: string }): Promise<string> {
  const ref = data.id ? doc(db, CALLS_COL, data.id) : doc(collection(db, CALLS_COL));
  await setDoc(ref, { ...data, createdAt: new Date().toISOString(), id: ref.id }, { merge: true });
  return ref.id;
}

export async function updateMeeting(meetingId: string, data: Partial<Meeting>) {
  await updateDoc(doc(db, CALLS_COL, meetingId), data);
}

export async function endMeeting(meetingId: string) {
  await updateMeeting(meetingId, { status: 'ended', endedAt: new Date().toISOString() });
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const snap = await getDoc(doc(db, CALLS_COL, meetingId));
  return snap.exists() ? (snap.data() as Meeting) : null;
}

export function subscribeMeeting(meetingId: string, cb: (m: Meeting | null) => void) {
  return onSnapshot(doc(db, CALLS_COL, meetingId), snap => {
    cb(snap.exists() ? (snap.data() as Meeting) : null);
  });
}

export function subscribeActiveMeetings(userUid: string, cb: (meetings: Meeting[]) => void) {
  const q = query(
    collection(db, CALLS_COL),
    where('status', 'in', ['waiting', 'active'])
  );
  return onSnapshot(q, snap => {
    const list: Meeting[] = [];
    snap.forEach(d => { const m = d.data() as Meeting; if (m.createdBy === userUid || true) list.push(m); });
    cb(list);
  });
}

// ── Participants ────────────────────────────────────────────────

export async function joinMeeting(meetingId: string, participant: Participant) {
  await setDoc(doc(db, CALLS_COL, meetingId, PARTICIPANTS_SUB, participant.uid), participant);
}

export async function updateParticipant(meetingId: string, uid: string, data: Partial<Participant>) {
  await updateDoc(doc(db, CALLS_COL, meetingId, PARTICIPANTS_SUB, uid), data);
}

export async function leaveMeeting(meetingId: string, uid: string) {
  await updateParticipant(meetingId, uid, { isOnline: false });
  setTimeout(async () => {
    try { await deleteDoc(doc(db, CALLS_COL, meetingId, PARTICIPANTS_SUB, uid)); } catch {}
  }, 3000);
}

export async function getParticipants(meetingId: string): Promise<Participant[]> {
  const snap = await getDocs(collection(db, CALLS_COL, meetingId, PARTICIPANTS_SUB));
  return snap.docs.map(d => d.data() as Participant);
}

export function subscribeParticipants(meetingId: string, cb: (list: Participant[]) => void) {
  return onSnapshot(collection(db, CALLS_COL, meetingId, PARTICIPANTS_SUB), snap => {
    cb(snap.docs.map(d => d.data() as Participant));
  });
}

// ── Signaling ───────────────────────────────────────────────────

export async function sendSignal(meetingId: string, msg: Omit<SignalingMessage, 'id' | 'createdAt'>) {
  await addDoc(collection(db, CALLS_COL, meetingId, SIGNALING_SUB), {
    ...msg, createdAt: new Date().toISOString(),
  });
}

export function subscribeSignals(meetingId: string, userUid: string, cb: (msg: SignalingMessage) => void) {
  const q = query(
    collection(db, CALLS_COL, meetingId, SIGNALING_SUB),
    where('to', '==', userUid),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') cb(change.doc.data() as SignalingMessage);
    });
  });
}

// ── In-Meeting Chat ─────────────────────────────────────────────

export async function sendMeetingChat(meetingId: string, msg: Omit<MeetingChatMessage, 'id' | 'createdAt'>) {
  await addDoc(collection(db, CALLS_COL, meetingId, CHAT_SUB), {
    ...msg, createdAt: new Date().toISOString(),
  });
}

export function subscribeMeetingChat(meetingId: string, cb: (msgs: MeetingChatMessage[]) => void) {
  const q = query(
    collection(db, CALLS_COL, meetingId, CHAT_SUB),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as MeetingChatMessage));
  });
}
