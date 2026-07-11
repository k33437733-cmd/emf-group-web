import { useState, useEffect, useRef, useCallback } from 'react';
import { createMeeting, joinMeeting, updateParticipant, updateMeeting, leaveMeeting, endMeeting, subscribeMeeting, subscribeParticipants, sendSignal, subscribeSignals, sendMeetingChat, subscribeMeetingChat, getParticipants } from '../firebase/calls';
import type { Meeting, Participant, MeetingChatMessage } from '../types/call';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface PeerConnection {
  pc: RTCPeerConnection;
  stream: MediaStream;
  connected: boolean;
}

interface UseMeetingOptions {
  user: { uid: string; name: string; photoURL?: string } | null;
  meetingId?: string | null;
  type: 'voice' | 'video';
  conversationId?: string;
}

export function useMeeting({ user, meetingId: externalId, type, conversationId }: UseMeetingOptions) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(type === 'voice');
  const [sharingScreen, setSharingScreen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chatMessages, setChatMessages] = useState<MeetingChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed'>('idle');
  const [activeSpeaker] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const meetingIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const processedSignalsRef = useRef<Set<string>>(new Set());

  // Initialize media
  const initMedia = useCallback(async (video: boolean) => {
    try {
      const constraints: MediaStreamConstraints = { audio: true };
      if (video) constraints.video = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Media init failed', err);
      return null;
    }
  }, []);

  // Create a peer connection for a remote peer
  const createPeerConnection = useCallback(async (remoteUid: string, stream: MediaStream, isInitiator: boolean): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && meetingIdRef.current && user) {
        sendSignal(meetingIdRef.current, { from: user.uid, to: remoteUid, type: 'ice-candidate', data: JSON.stringify(event.candidate) });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Auto-reconnect: trigger ICE restart
        setTimeout(() => {
          pc.restartIce();
          if (isInitiator && meetingIdRef.current && user) {
            pc.createOffer().then(offer => {
              pc.setLocalDescription(offer);
              sendSignal(meetingIdRef.current!, { from: user.uid, to: remoteUid, type: 'offer', data: JSON.stringify(offer) });
            }).catch(() => {});
          }
        }, 1000);
      }
      if (pc.connectionState === 'connected') {
        setConnectionState('connected');
      }
    };

    peersRef.current.set(remoteUid, { pc, stream: remoteStream, connected: false });

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (meetingIdRef.current && user) {
        await sendSignal(meetingIdRef.current, { from: user.uid, to: remoteUid, type: 'offer', data: JSON.stringify(offer) });
      }
    }

    return pc;
  }, [user]);

  // Handle incoming signals
  const handleSignal = useCallback(async (msg: { from: string; to: string; type: string; data: string; createdAt: string }) => {
    if (!meetingIdRef.current || !user || !localStreamRef.current) return;

    const signalKey = `${msg.from}_${msg.type}_${msg.createdAt}`;
    if (processedSignalsRef.current.has(signalKey)) return;
    processedSignalsRef.current.add(signalKey);

    const meId = user.uid;

    if (msg.type === 'offer') {
      const offer = JSON.parse(msg.data);
      const pc = await createPeerConnection(msg.from, localStreamRef.current, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(meetingIdRef.current, { from: meId, to: msg.from, type: 'answer', data: JSON.stringify(answer) });
    } else if (msg.type === 'answer') {
      const peer = peersRef.current.get(msg.from);
      if (peer) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(msg.data)));
      }
    } else if (msg.type === 'ice-candidate') {
      const peer = peersRef.current.get(msg.from);
      if (peer) {
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(msg.data)));
        } catch {}
      }
    } else if (msg.type === 'hang-up') {
      const peer = peersRef.current.get(msg.from);
      if (peer) { peer.pc.close(); peersRef.current.delete(msg.from); }
    }
  }, [user, createPeerConnection]);

  // Start/Join meeting
  const startMeeting = useCallback(async () => {
    if (!user) return null;
    const stream = await initMedia(type === 'video');
    if (!stream) return null;

    let mId = externalId;
    if (!mId) {
      mId = await createMeeting({
        type, status: 'waiting', createdBy: user.uid, createdByName: user.name,
        conversationId,
      });
    }
    meetingIdRef.current = mId;

    await joinMeeting(mId, {
      uid: user.uid, name: user.name, photoURL: user.photoURL,
      joinedAt: new Date().toISOString(), muted: false, cameraOff: type === 'voice',
      sharingScreen: false, handRaised: false, isOnline: true,
    });

    await updateMeeting(mId, { status: 'active', startedAt: new Date().toISOString() });
    setConnectionState('connecting');
    return mId;
  }, [user, type, conversationId, externalId, initMedia]);

  // Connect to existing peers
  const connectToPeers = useCallback(async () => {
    if (!meetingIdRef.current || !user || !localStreamRef.current) return;
    const existing = await getParticipants(meetingIdRef.current);
    for (const p of existing) {
      if (p.uid !== user.uid && !peersRef.current.has(p.uid)) {
        await createPeerConnection(p.uid, localStreamRef.current, true);
      }
    }
  }, [user, createPeerConnection]);

  // Leave meeting
  const leaveMeetingCall = useCallback(async () => {
    if (!meetingIdRef.current || !user) return;
    // Send hang-up to all peers
    peersRef.current.forEach((_, remoteUid) => {
      sendSignal(meetingIdRef.current!, { from: user.uid, to: remoteUid, type: 'hang-up', data: '' });
    });
    // Close all peer connections
    peersRef.current.forEach(p => p.pc.close());
    peersRef.current.clear();
    // Stop local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    screenStream?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    // Stop recording
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    // Update Firestore
    await leaveMeeting(meetingIdRef.current, user.uid);
    // Check if last participant, end meeting
    const remaining = await getParticipants(meetingIdRef.current);
    if (remaining.filter(p => p.isOnline).length === 0) {
      await endMeeting(meetingIdRef.current);
    }
    setMeeting(null);
    setParticipants([]);
    setConnectionState('idle');
    setMuted(false);
    setCameraOff(type === 'voice');
    setSharingScreen(false);
    setHandRaised(false);
    setRecording(false);
    meetingIdRef.current = null;
  }, [user, screenStream, type]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = muted; });
    }
    setMuted(m => !m);
    if (meetingIdRef.current && user) {
      updateParticipant(meetingIdRef.current, user.uid, { muted: !muted });
    }
  }, [muted, user]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (cameraOff) {
      const stream = await initMedia(true);
      if (stream && localStreamRef.current) {
        const videoTrack = stream.getVideoTracks()[0];
        localStreamRef.current.addTrack(videoTrack);
        // Replace track in all peers
        peersRef.current.forEach(p => {
          const sender = p.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current?.removeTrack(videoTrack);
        peersRef.current.forEach(p => {
          const sender = p.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(null);
        });
      }
    }
    setCameraOff(c => !c);
    if (meetingIdRef.current && user) {
      updateParticipant(meetingIdRef.current, user.uid, { cameraOff: !cameraOff });
    }
  }, [cameraOff, user, initMedia]);

  // Share screen
  const toggleScreenShare = useCallback(async () => {
    if (sharingScreen) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setSharingScreen(false);
      // Restore camera
      if (!cameraOff && localStreamRef.current) {
        const stream = await initMedia(true);
        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          localStreamRef.current.addTrack(videoTrack);
          peersRef.current.forEach(p => {
            const sender = p.pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          });
        }
      }
    } else {
      try {
        const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(sStream);
        setSharingScreen(true);
        const videoTrack = sStream.getVideoTracks()[0];
        peersRef.current.forEach(p => {
          const sender = p.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
        videoTrack.onended = () => toggleScreenShare();
      } catch {}
    }
    if (meetingIdRef.current && user) {
      updateParticipant(meetingIdRef.current, user.uid, { sharingScreen: !sharingScreen });
    }
  }, [sharingScreen, screenStream, cameraOff, user, initMedia]);

  // Raise hand
  const toggleRaiseHand = useCallback(() => {
    setHandRaised(h => !h);
    if (meetingIdRef.current && user) {
      updateParticipant(meetingIdRef.current, user.uid, { handRaised: !handRaised });
    }
  }, [user]);

  // Start/stop recording
  const toggleRecording = useCallback(() => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
    } else {
      if (!localStreamRef.current) return;
      const chunks: Blob[] = [];
      recorderChunksRef.current = chunks;
      const recorder = new MediaRecorder(localStreamRef.current, { mimeType: 'video/webm;codecs=vp9' });
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start();
      setRecording(true);
    }
  }, [recording]);

  // Send chat message
  const sendChat = useCallback((text: string) => {
    if (!meetingIdRef.current || !user || !text.trim()) return;
    sendMeetingChat(meetingIdRef.current, {
      senderId: user.uid, senderName: user.name, text: text.trim(),
    });
  }, [user]);

  // Subscriptions
  useEffect(() => {
    if (!externalId && !meetingIdRef.current) return;
    const mId = externalId || meetingIdRef.current;
    if (!mId) return;

    const unsubMeeting = subscribeMeeting(mId, setMeeting);
    const unsubParticipants = subscribeParticipants(mId, setParticipants);

    return () => { unsubMeeting(); unsubParticipants(); };
  }, [externalId]);

  useEffect(() => {
    if (!meetingIdRef.current || !user) return;
    const unsubSignals = subscribeSignals(meetingIdRef.current, user.uid, handleSignal);
    const unsubChat = subscribeMeetingChat(meetingIdRef.current, setChatMessages);
    return () => { unsubSignals(); unsubChat(); };
  }, [user, handleSignal]);

  // Monitor connection state for auto-reconnect
  useEffect(() => {
    if (!meetingIdRef.current || !user) return;
    const interval = setInterval(() => {
      let allConnected = true;
      let hasFailed = false;
      peersRef.current.forEach(p => {
        if (p.pc.connectionState === 'failed') hasFailed = true;
        if (p.pc.connectionState !== 'connected') allConnected = false;
      });
      if (hasFailed) {
        setConnectionState('reconnecting');
      } else if (allConnected && peersRef.current.size > 0) {
        setConnectionState('connected');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach(p => p.pc.close());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Get remote stream for a participant
  const getRemoteStream = useCallback((uid: string): MediaStream | null => {
    return peersRef.current.get(uid)?.stream || null;
  }, []);

  return {
    meeting, participants, localStream, muted, cameraOff, sharingScreen, handRaised,
    recording, chatMessages, connectionState, activeSpeaker,
    meetingId: meetingIdRef.current,
    startMeeting, leaveMeeting: leaveMeetingCall,
    toggleMute, toggleCamera, toggleScreenShare, toggleRaiseHand,
    toggleRecording, sendChat, connectToPeers, getRemoteStream,
  };
}


