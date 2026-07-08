import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getOrCreateAdminGroup,
  getOrCreateDMConversation,
  subscribeToConversations,
  subscribeToSupportConversations,
} from '../firebase/db/conversations';
import {
  listAgents,
  listRegularUsers,
} from '../firebase/db/users';
import {
  subscribeToLatestMessages,
  purgeOldMessages,
} from '../firebase/db/messages';
import { sendMessage, markRead } from '../services/ChatService';
import type { Conversation, UserProfile } from '../types';
import { MessageSquare, ArrowRight, CheckCheck, Users, MessageCirclePlus } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';
import ConversationList from '../components/chat/ConversationList';
import { showToast } from '../components/ui/Toast';

type ChatTab = 'admin' | 'member' | 'support';

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<ChatTab>('admin');

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [agents, setAgents] = useState<UserProfile[]>([]);

  // Conversations
  const [adminConvs, setAdminConvs] = useState<Conversation[]>([]);
  const [memberConvs, setMemberConvs] = useState<Conversation[]>([]);
  const [supportConvs, setSupportConvs] = useState<Conversation[]>([]);

  // Active conversation
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Guard
  useEffect(() => {
    if (!user || !isAdmin) {
      navigate(user ? '/content' : '/login', { replace: true });
      if (user && !isAdmin) showToast('صفحة الشات مخصصة للإدارة فقط', 'warning');
    }
  }, [user, isAdmin, navigate]);

  // Load contacts
  useEffect(() => {
    if (!user || !isAdmin) return;
    listAgents().then(list => {
      setAgents(list.filter(c => c.uid !== user.uid));
      getOrCreateAdminGroup(list).catch(() => {});
    });
    listRegularUsers().then(list => setMembers(list.filter(c => c.uid !== user.uid)));
    purgeOldMessages().catch(() => {});
  }, [user, isAdmin]);

  // Subscribe to conversations
  useEffect(() => {
    if (!user) return;

    let currentDMs: Conversation[] = [];
    let currentGroups: Conversation[] = [];

    const updateAdminConvs = () => {
      const combined = [...currentGroups, ...currentDMs].sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      setAdminConvs(combined);
    };

    const unsubAdminDMs = subscribeToConversations(user.uid, 'admin_dm', (list) => {
      currentDMs = list;
      updateAdminConvs();
    });

    const unsubAdminGroups = subscribeToConversations(user.uid, 'admin_group', (list) => {
      currentGroups = list;
      updateAdminConvs();
    });

    const unsubMember = subscribeToConversations(user.uid, 'agent_member', setMemberConvs);
    const unsubSupport = subscribeToSupportConversations(user.uid, setSupportConvs);

    return () => {
      unsubAdminDMs();
      unsubAdminGroups();
      unsubMember();
      unsubSupport();
    };
  }, [user]);

  // Subscribe to messages
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const unsub = subscribeToLatestMessages(activeConvId, setMessages);
    return () => unsub();
  }, [activeConvId]);

  // Mark as read when conversation opens
  useEffect(() => {
    if (!activeConvId || !user) return;
    markRead(activeConvId, user).catch(() => {});
  }, [activeConvId, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Restore active conv from URL hash on mount
  useEffect(() => {
    const hash = searchParams.get('conv');
    if (hash) setActiveConvId(hash);
  }, []);

  const activeConv = useMemo(() => {
    const existing = [...adminConvs, ...memberConvs, ...supportConvs].find(c => c.id === activeConvId);
    if (existing) return existing;
    
    // Fallback for new DM conversations that haven't synced yet
    if (activeConvId && !activeConvId.includes('admin_group') && !activeConvId.includes('support')) {
      const parts = activeConvId.split('_');
      const otherUid = parts.find(p => p !== user?.uid);
      if (otherUid) {
        const otherUser = [...agents, ...members].find(u => u.uid === otherUid);
        if (otherUser) {
          return {
            id: activeConvId,
            type: (user?.role === 'user' || otherUser.role === 'user') ? 'agent_member' : 'admin_dm',
            members: [user!.uid, otherUser.uid],
            memberNames: { [user!.uid]: user!.name, [otherUser.uid]: otherUser.name },
            memberRoles: { [user!.uid]: user!.role, [otherUser.uid]: otherUser.role },
            isGroup: false,
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            status: 'active'
          } as Conversation;
        }
      }
    }
    return undefined;
  }, [adminConvs, memberConvs, supportConvs, activeConvId, user, agents, members]);

  const handleSelectConv = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setShowNewChat(false);
  };

  const handleSelectGroup = async () => {
    if (!user) return;
    const groupConv = adminConvs.find(c => c.isGroup);
    if (groupConv) { handleSelectConv(groupConv); return; }
    const allList = await listAgents();
    const id = await getOrCreateAdminGroup(allList);
    setActiveConvId(id);
  };

  const handleSelectMember = async (member: UserProfile) => {
    if (!user) return;
    const id = await getOrCreateDMConversation(user, member);
    setActiveConvId(id);
    setShowNewChat(false);
  };

  const handleSend = (text: string, imageUrls?: string[]) => {
    if (!activeConvId || !user || !text.trim()) return;
    sendMessage({
      conversationId: activeConvId,
      sender: user,
      content: text,
      type: imageUrls ? 'image' : 'text',
      imageUrls
    }).catch((err) => {
      console.error('Failed to send chat message:', err);
      showToast('فشل إرسال الرسالة', 'error');
    });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  if (!user || !isAdmin) return null;

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', gap: '0', padding: '0', margin: '0', direction: 'rtl', background: 'var(--bg-primary)' }} className="animate-fade">

      {/* ─── Sidebar ─── */}
      <div className={`chat-sidebar ${activeConvId ? 'hide-mobile' : ''}`} style={{ width: '380px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', position: 'relative' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => { setTab('admin'); setActiveConvId(null); }} style={{
            flex: 1, padding: '14px', background: 'none', border: 'none',
            color: tab === 'admin' ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontWeight: tab === 'admin' ? 'bold' : 'normal',
            borderBottom: tab === 'admin' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem'
          }}>
            شات الإدارة
          </button>
          <button onClick={() => { setTab('member'); setActiveConvId(null); }} style={{
            flex: 1, padding: '14px', background: 'none', border: 'none',
            color: tab === 'member' ? '#10b981' : 'var(--text-muted)',
            fontWeight: tab === 'member' ? 'bold' : 'normal',
            borderBottom: tab === 'member' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem'
          }}>
            شات الأعضاء
          </button>
          <button onClick={() => { setTab('support'); setActiveConvId(null); }} style={{
            flex: 1, padding: '14px', background: 'none', border: 'none',
            color: tab === 'support' ? '#f59e0b' : 'var(--text-muted)',
            fontWeight: tab === 'support' ? 'bold' : 'normal',
            borderBottom: tab === 'support' ? '2px solid #f59e0b' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem'
          }}>
            طلبات الدعم
            {supportConvs.filter(c => (c.unreadCount?.[user.uid] || 0) > 0).length > 0 && (
              <span style={{
                marginRight: '6px',
                background: '#f59e0b',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.65rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                verticalAlign: 'middle'
              }}>
                {supportConvs.filter(c => (c.unreadCount?.[user.uid] || 0) > 0).length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable container for list items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'admin' ? (
            <>
              <div onClick={handleSelectGroup} style={{
                padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s',
                background: activeConvId === 'admin_group_chat' ? 'rgba(59,130,246,0.08)' : 'transparent'
              }} className="chat-hover">
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gradient-cyber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Users size={20} />
                </div>
                <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white' }}>مجموعة الإدارة العامة 📢</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>تواصل جماعي مع كافة المدراء</div>
                </div>
              </div>

              <ConversationList
                conversations={adminConvs.filter(c => !c.isGroup)}
                activeId={activeConvId}
                currentUid={user.uid}
                onSelect={handleSelectConv}
                emptyLabel="لا توجد محادثات إدارية"
              />
            </>
          ) : tab === 'member' ? (
            <ConversationList
              conversations={memberConvs}
              activeId={activeConvId}
              currentUid={user.uid}
              onSelect={handleSelectConv}
              emptyLabel="لا توجد محادثات مع أعضاء"
            />
          ) : (
            /* Support Tab */
            <ConversationList
              conversations={supportConvs}
              activeId={activeConvId}
              currentUid={user.uid}
              onSelect={handleSelectConv}
              emptyLabel="لا توجد طلبات دعم حالياً"
            />
          )}
        </div>

        {/* FAB for New Chat (only in admin/member tabs) */}
        {tab !== 'support' && (
          <button 
            onClick={() => setShowNewChat(true)}
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
              transition: 'transform 0.2s',
              zIndex: 10
            }}
            className="hover-scale"
          >
            <MessageCirclePlus size={28} />
          </button>
        )}

        {/* New Chat Panel (Slide-over) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--bg-secondary)',
          transform: showNewChat ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20
        }}>
          {/* Header */}
          <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
              <ArrowRight size={24} />
            </button>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white' }}>
              {tab === 'admin' ? 'محادثة إدارية جديدة' : 'محادثة عضو جديدة'}
            </div>
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(tab === 'admin' ? agents : members).length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                لا يوجد مستخدمين متاحين
              </div>
            ) : (
              (tab === 'admin' ? agents : members).map(m => {
                const hasConv = (tab === 'admin' ? adminConvs : memberConvs).some(c => c.members.includes(m.uid) && !c.isGroup);
                return (
                  <div key={m.uid} onClick={() => handleSelectMember(m)} style={{
                    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
                    transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.02)'
                  }} className="chat-hover">
                    <div style={{ 
                      width: '46px', height: '46px', borderRadius: '50%', 
                      background: tab === 'admin' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', 
                      border: tab === 'admin' ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(16,185,129,0.2)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: 'bold', fontSize: '1rem', 
                      color: tab === 'admin' ? 'var(--accent-blue)' : '#10b981', flexShrink: 0 
                    }}>
                      {m.name.substring(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'white', fontWeight: 'bold', marginBottom: '2px' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hasConv ? 'محادثة موجودة' : 'انقر لبدء محادثة'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── Chat Window ─── */}
      <div className={`chat-window ${!activeConvId ? 'hide-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        {activeConvId && activeConv ? (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)' }}>
              <button onClick={() => setActiveConvId(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }} className="mobile-back-chat">
                <ArrowRight size={22} />
              </button>
              {(() => {
                const otherUid = activeConv.members.find(m => m !== user.uid);
                const otherName = otherUid ? activeConv.memberNames?.[otherUid] || activeConv.name : activeConv.name;
                const isGroup = activeConv.isGroup;
                return (
                  <>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: isGroup ? '12px' : '50%', flexShrink: 0,
                      background: activeConv.type === 'agent_member' ? 'rgba(16,185,129,0.1)' : isGroup ? 'var(--gradient-cyber)' : 'rgba(59,130,246,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.8rem',
                      border: activeConv.type === 'agent_member' ? '1px solid rgba(16,185,129,0.2)' : 'none'
                    }}>
                      {isGroup ? '📢' : otherName?.substring(0, 2) || '??'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>
                        {isGroup ? 'مجموعة الإدارة العامة 📢' : otherName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {isGroup ? 'جميع المشرفين' : activeConv.type === 'agent_member' ? 'عضو في الموقع' : 'محادثة مباشرة'}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0b141a' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  لا توجد رسائل سابقة. أرسل رسالتك الأولى.
                </div>
              ) : messages.map(msg => {
                const isSelf = msg.senderId === user.uid;
                const isBot = msg.senderId === 'bot';
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isSelf ? 'flex-start' : 'flex-end', maxWidth: isBot ? '80%' : '72%', gap: '4px' }}>
                    {activeConv.isGroup && !isSelf && !isBot && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: msg.senderRole === 'super_admin' ? '#c084fc' : '#60a5fa', marginRight: '6px' }}>
                        {msg.senderName}
                      </span>
                    )}
                    {isBot && !isSelf && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent-emerald)', marginRight: '6px' }}>
                        🤖 المساعد الذكي
                      </span>
                    )}
                    <div style={{
                      padding: isBot ? '12px 18px' : '10px 16px', borderRadius: '16px',
                      background: isSelf ? '#005c4b' : isBot ? 'rgba(16, 185, 129, 0.06)' : '#202c33',
                      border: '1px solid', borderColor: isSelf ? 'rgba(0,92,75,0.2)' : isBot ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: 'white', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      {msg.type === 'image' && msg.imageUrls?.map((url: string, i: number) => (
                        <img key={i} src={url} alt="" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                      ))}
                      {msg.type === 'file' && msg.fileUrl && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'underline' }}>
                          {msg.content}
                        </a>
                      )}
                      {msg.type === 'text' && <span style={{ fontSize: isBot ? '0.88rem' : '0.85rem', lineHeight: 1.6 }}>{msg.content}</span>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isSelf && <CheckCheck size={11} style={{ color: 'var(--accent-cyan)' }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              placeholder={tab === 'member' ? 'اكتب ردك للعضو...' : 'اكتب رسالتك...'}
            />
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <MessageSquare size={32} />
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white', marginBottom: '4px' }}>بوابة المحادثات</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '300px' }}>
                اختر محادثة من القائمة الجانبية للبدء
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .chat-hover:hover { background: rgba(255,255,255,0.03) !important; }
        @media (max-width: 767px) {
          .chat-sidebar.hide-mobile { display: none !important; }
          .chat-window.hide-mobile { display: none !important; }
          .chat-sidebar { width: 100% !important; display: flex; }
          .chat-window { width: 100% !important; display: flex; }
          .mobile-back-chat { display: flex !important; }
        }
        @media (min-width: 768px) { .mobile-back-chat { display: none !important; } }
      `}</style>
    </div>
  );
}
