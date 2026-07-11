import { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Hand, HandMetal, MessageSquare, Users, PhoneOff, Radio, Download, Loader2, Wifi, WifiOff } from 'lucide-react';
import type { Participant, MeetingChatMessage } from '../../types/call';

interface Props {
  localStream: MediaStream | null;
  participants: Participant[];
  localUser: { uid: string; name: string; photoURL?: string } | null;
  muted: boolean;
  cameraOff: boolean;
  sharingScreen: boolean;
  handRaised: boolean;
  recording: boolean;
  chatMessages: MeetingChatMessage[];
  connectionState: string;
  meetingType: 'voice' | 'video';
  getRemoteStream: (uid: string) => MediaStream | null;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onToggleRecording: () => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
}

function VideoTile({ stream, participant, isLocal, muted: isMuted, cameraOff: noCam, handRaised: raised, isSpeaking }: {
  stream: MediaStream | null;
  participant: { uid: string; name: string; photoURL?: string };
  isLocal: boolean;
  muted?: boolean;
  cameraOff?: boolean;
  handRaised?: boolean;
  isSpeaking?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShare = !!(stream?.getVideoTracks().length && stream?.getVideoTracks()[0].label?.includes('screen') || false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{
      position: 'relative', borderRadius: '12px', overflow: 'hidden',
      background: 'var(--bg-card)', aspectRatio: '16/10',
      border: isSpeaking ? '2px solid var(--color-primary)' : '2px solid transparent',
      transition: 'border 0.2s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {stream && !noCam ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isLocal && !screenShare ? 'scaleX(-1)' : 'none' }} />
      ) : (
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 700,
        }}>
          {participant.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fff', flex: 1 }}>
          {participant.name} {isLocal && '(أنت)'}
        </span>
        {isMuted && <MicOff size={12} color="#EF4444" />}
        {noCam && !isMuted && <VideoOff size={12} color="#F59E0B" />}
        {raised && <Hand size={12} color="#3B82F6" />}
        {isSpeaking && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />}
      </div>
    </div>
  );
}

export default function MeetingRoom({
  localStream, participants, localUser, muted, cameraOff, sharingScreen,
  handRaised, recording, chatMessages, connectionState, meetingType,
  getRemoteStream, onToggleMute, onToggleCamera, onToggleScreenShare,
  onToggleRaiseHand, onToggleRecording, onSendChat, onLeave,
}: Props) {
  const [showPanel, setShowPanel] = useState<'participants' | 'chat' | null>(null);
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const otherParticipants = participants.filter(p => p.uid !== localUser?.uid);
  const allParticipants = participants;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', flexDirection: 'column',
      background: '#0a0a0f', color: '#fff',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>اجتماع EMF</span>
          {connectionState === 'connected' ? (
            <span style={{ fontSize: '0.65rem', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Wifi size={10} /> متصل
            </span>
          ) : connectionState === 'reconnecting' ? (
            <span style={{ fontSize: '0.65rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> إعادة الاتصال...
            </span>
          ) : connectionState === 'connecting' ? (
            <span style={{ fontSize: '0.65rem', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> جاري الاتصال...
            </span>
          ) : (
            <span style={{ fontSize: '0.65rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <WifiOff size={10} /> غير متصل
            </span>
          )}
          {recording && (
            <span style={{ fontSize: '0.6rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', animation: 'pulse 1s infinite' }}>
              <Radio size={10} /> تسجيل
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setShowPanel(p => p === 'participants' ? null : 'participants')}
            style={{ background: showPanel === 'participants' ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem' }}>
            <Users size={14} /> {otherParticipants.length + 1}
          </button>
          <button onClick={() => setShowPanel(p => p === 'chat' ? null : 'chat')}
            style={{ background: showPanel === 'chat' ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex', fontSize: '0.72rem' }}>
            <MessageSquare size={14} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', overflow: 'auto' }}>
          {meetingType === 'voice' ? (
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'center', alignContent: 'center' }}>
              {allParticipants.map(p => (
                <div key={p.uid} style={{
                  width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontSize: '1.1rem', fontWeight: 700,
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{p.name}</span>
                  {p.muted && <MicOff size={12} color="#EF4444" />}
                  {p.handRaised && <span style={{ fontSize: '0.7rem' }}>✋</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${otherParticipants.length <= 1 ? '320px' : '240px'}, 1fr))`,
              gap: '10px', flex: 1, alignContent: 'start',
            }}>
              {/* Local video */}
              <VideoTile
                stream={localStream}
                participant={localUser || { uid: '', name: 'أنت' }}
                isLocal
                muted={muted}
                cameraOff={cameraOff}
                handRaised={handRaised}
              />
              {/* Remote videos */}
              {otherParticipants.map(p => (
                <VideoTile
                  key={p.uid}
                  stream={getRemoteStream(p.uid)}
                  participant={p}
                  isLocal={false}
                  muted={p.muted}
                  cameraOff={p.cameraOff}
                  handRaised={p.handRaised}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side panel (participants / chat) */}
        {showPanel && (
          <div style={{
            width: '280px', borderLeft: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)',
          }}>
            {showPanel === 'participants' ? (
              <>
                <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  المشاركون ({allParticipants.length})
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  {allParticipants.map(p => (
                    <div key={p.uid} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: '8px',
                      background: p.uid === localUser?.uid ? 'rgba(0,210,255,0.08)' : 'transparent',
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.78rem' }}>
                        {p.name} {p.uid === localUser?.uid && '(أنت)'}
                      </span>
                      {p.handRaised && <span style={{ fontSize: '1rem' }}>✋</span>}
                      {p.muted && <MicOff size={12} color="#EF4444" />}
                      {p.cameraOff && <VideoOff size={12} color="#F59E0B" />}
                      {p.sharingScreen && <Monitor size={12} color="#3B82F6" />}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  المحادثة
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {chatMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '20px' }}>
                      لا توجد رسائل بعد
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      padding: '6px 10px', borderRadius: '8px',
                      background: msg.senderId === localUser?.uid ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.04)',
                      fontSize: '0.72rem',
                    }}>
                      <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '0.62rem', marginBottom: '2px' }}>
                        {msg.senderName}
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <form onSubmit={e => { e.preventDefault(); if (chatText.trim()) { onSendChat(chatText); setChatText(''); } }}
                    style={{ display: 'flex', gap: '6px' }}>
                    <input value={chatText} onChange={e => setChatText(e.target.value)}
                      placeholder="اكتب رسالة..."
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none',
                        borderRadius: '8px', padding: '6px 10px', color: '#fff',
                        fontSize: '0.75rem', outline: 'none',
                      }} />
                    <button type="submit" style={{
                      background: 'var(--color-primary)', border: 'none', borderRadius: '8px',
                      color: '#050816', cursor: 'pointer', padding: '6px 10px', fontWeight: 600, fontSize: '0.72rem',
                    }}>
                      إرسال
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '12px 20px', background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
      }}>
        <ControlBtn icon={muted ? MicOff : Mic} active={!muted} danger={muted} label={muted ? 'كتم' : 'صوت'} onClick={onToggleMute} />
        {meetingType === 'video' && (
          <ControlBtn icon={cameraOff ? VideoOff : Video} active={!cameraOff} danger={cameraOff} label={cameraOff ? 'إيقاف' : 'كاميرا'} onClick={onToggleCamera} />
        )}
        <ControlBtn icon={sharingScreen ? MonitorOff : Monitor} active={sharingScreen} label="شاشة" onClick={onToggleScreenShare} />
        <ControlBtn icon={handRaised ? HandMetal : Hand} active={handRaised} label="يد" onClick={onToggleRaiseHand} />
        <ControlBtn icon={recording ? Download : Radio} active={recording} danger={recording} label={recording ? 'إيقاف' : 'تسجيل'} onClick={onToggleRecording} />

        <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.15)', margin: '0 8px' }} />

        <button onClick={onLeave}
          style={{
            background: '#EF4444', border: 'none', borderRadius: '10px',
            color: '#fff', cursor: 'pointer', padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontWeight: 600, fontSize: '0.82rem',
            boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <PhoneOff size={16} /> إنهاء
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

function ControlBtn({ icon: Icon, active, danger, label, onClick }: {
  icon: any; active: boolean; danger?: boolean; label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? (danger ? 'rgba(239,68,68,0.2)' : 'rgba(0,210,255,0.15)') : 'rgba(255,255,255,0.06)',
        border: 'none', borderRadius: '12px', color: danger && active ? '#EF4444' : active ? '#00D2FF' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer', padding: '10px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '3px', minWidth: '56px',
        transition: 'all 0.15s',
      }}>
      <Icon size={18} />
      <span style={{ fontSize: '0.55rem' }}>{label}</span>
    </button>
  );
}
