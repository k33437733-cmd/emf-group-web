export type MeetingType = 'voice' | 'video';
export type MeetingStatus = 'waiting' | 'active' | 'ended';

export interface Meeting {
  id: string;
  type: MeetingType;
  status: MeetingStatus;
  title?: string;
  createdBy: string;
  createdByName: string;
  conversationId?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface Participant {
  uid: string;
  name: string;
  photoURL?: string;
  joinedAt: string;
  muted: boolean;
  cameraOff: boolean;
  sharingScreen: boolean;
  handRaised: boolean;
  isOnline: boolean;
}

export type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'hang-up';

export interface SignalingMessage {
  id: string;
  from: string;
  to: string;
  type: SignalType;
  data: any;
  createdAt: string;
}

export interface MeetingChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}
