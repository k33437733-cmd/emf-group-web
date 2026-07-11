import type { Meeting, Participant, SignalingMessage } from '../types/call';
import * as callsFirebase from '../firebase/calls';

export const callRepository = {
  async createMeeting(meeting: Meeting): Promise<void> {
    await callsFirebase.createMeeting(meeting);
  },

  async updateMeeting(meetingId: string, data: Partial<Meeting>): Promise<void> {
    await callsFirebase.updateMeeting(meetingId, data);
  },

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    return callsFirebase.getMeeting(meetingId);
  },

  subscribeMeeting(meetingId: string, callback: (m: Meeting | null) => void) {
    return callsFirebase.subscribeMeeting(meetingId, callback);
  },

  async addParticipant(meetingId: string, participant: Participant): Promise<void> {
    await callsFirebase.addParticipant(meetingId, participant);
  },

  async removeParticipant(meetingId: string, participantId: string): Promise<void> {
    await callsFirebase.removeParticipant(meetingId, participantId);
  },

  async updateParticipant(meetingId: string, participantId: string, data: Partial<Participant>): Promise<void> {
    await callsFirebase.updateParticipant(meetingId, participantId, data);
  },

  subscribeParticipants(meetingId: string, callback: (participants: Participant[]) => void) {
    return callsFirebase.subscribeParticipants(meetingId, callback);
  },

  async sendSignal(meetingId: string, signal: SignalingMessage): Promise<void> {
    await callsFirebase.sendSignal(meetingId, signal);
  },

  subscribeSignals(meetingId: string, userUid: string, callback: (msg: SignalingMessage) => void) {
    return callsFirebase.subscribeSignals(meetingId, userUid, callback);
  },
};
