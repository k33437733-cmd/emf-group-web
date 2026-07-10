import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getOrCreateAdminGroup,
  getOrCreateDMConversation,
  subscribeToConversations,
  subscribeToAllGroups,
  subscribeToSupportConversations,
  createGroupConversation,
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
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
import { MessageSquare, ArrowRight, CheckCheck, Users, MessageCirclePlus, Settings, Bot } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';
import ConversationList from '../components/chat/ConversationList';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import GroupSettings from '../components/chat/GroupSettings';
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

  // All groups (including non-member)
  const [allGroups, setAllGroups] = useState<Conversation[]>([]);

  // Active conversation
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      getOrCreateAdminGroup(list).catch((err) => {
        console.error('Failed to initialize admin group:', err);
      });
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

    const unsubAllGroups = subscribeToAllGroups(setAllGroups);

    const unsubMember = subscribeToConversations(user.uid, 'agent_member', setMemberConvs);
    const unsubSupport = subscribeToSupportConversations(user.uid, setSupportConvs);

    return () => {
      unsubAdminDMs();
      unsubAdminGroups();
      unsubAllGroups();
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
    const existing = [...adminConvs, ...memberConvs, ...supportConvs, ...allGroups].find(c => c.id === activeConvId);
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
  }, [adminConvs, memberConvs, supportConvs, allGroups, activeConvId, user, agents, members]);

  const isGroupMember = activeConv ? (activeConv.members?.includes(user?.uid ?? '') ?? false) : false;

  const handleSelectConv = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setShowNewChat(false);
  };

  const handleSelectGroup = async () => {
    if (!user) return;
    try {
      const groupConv = adminConvs.find(c => c.isGroup);
      if (groupConv) { handleSelectConv(groupConv); return; }
      const allList = await listAgents();
      const id = await getOrCreateAdminGroup(allList);
      setActiveConvId(id);
    } catch (err: any) {
      console.error('Failed to open group chat:', err);
      showToast(err?.message || 'فشل فتح مجموعة الإدارة', 'error');
    }
  };

  const handleSelectNonMemberGroup = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setShowNewChat(false);
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
    }).catch((err: any) => {
      const msg = err?.message || err?.code || 'فشل إرسال الرسالة';
      console.error('Failed to send chat message:', err);
      showToast(msg, 'error');
    });
  };

  // ─── Group management handlers ──────────────────────────────────────────────

  const handleCreateGroup = async (name: string, members: UserProfile[], avatar?: string) => {
    if (!user) return;
    const id = await createGroupConversation(name, members, user, avatar);
    setActiveConvId(id);
    showToast('تم إنشاء المجموعة بنجاح', 'success');
  };

  const handleUpdateGroupInfo = async (updates: { name?: string; avatar?: string }) => {
    if (!activeConvId || !user) return;
    await updateGroupInfo(activeConvId, updates, user);
    showToast('تم الحفظ', 'success');
  };

  const handleRemoveMember = async (uid: string) => {
    if (!activeConvId || !user) return;
    const memberName = activeConv?.memberNames?.[uid] || uid;
    await removeGroupMember(activeConvId, uid, user, memberName);
  };

  const handleAddMembers = async (newMembers: UserProfile[]) => {
    if (!activeConvId || !user) return;
    await addGroupMembers(activeConvId, newMembers, user);
    showToast('تمت الإضافة', 'success');
  };

  const memberGroups = useMemo(() => allGroups.filter(g => g.members?.includes(user?.uid ?? '')), [allGroups, user]);
  const nonMemberGroups = useMemo(() => allGroups.filter(g => !g.members?.includes(user?.uid ?? '')), [allGroups, user]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  if (!user || !isAdmin) return null;

  return (
    <div 
      style={{ 
        width: '100%', 
        height: 'calc(100vh - var(--navbar-height) - 48px)', 
        display: 'flex', 
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        padding: '0', 
        margin: '0', 
        direction: 'rtl', 
        background: 'var(--bg-secondary)' 
      }} 
      className="animate-fade chat-workspace-container"
    >

      {/* ─── Sidebar Contacts Pane ─── */}
      <div 
        className={`chat-sidebar ${activeConvId ? 'hide-mobile' : ''}`} 
        style={{
          width: sidebarCollapsed ? '0px' : '360px',
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          flexShrink: 0,
          background: 'var(--bg-secondary)', 
          borderLeft: '1px solid var(--border-color)',
          position: 'relative', 
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >

        {/* Custom Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
          <button 
            onClick={() => { setTab('admin'); setActiveConvId(null); }} 
            style={{
              flex: 1, padding: '14px 10px', background: 'none', border: 'none',
              color: tab === 'admin' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: tab === 'admin' ? 700 : 500,
              borderBottom: tab === 'admin' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem'
            }}
          >
            شات الإدارة
          </button>
          <button 
            onClick={() => { setTab('member'); setActiveConvId(null); }} 
            style={{
              flex: 1, padding: '14px 10px', background: 'none', border: 'none',
              color: tab === 'member' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              fontWeight: tab === 'member' ? 700 : 500,
              borderBottom: tab === 'member' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem'
            }}
          >
            شات الأعضاء
          </button>
          <button 
            onClick={() => { setTab('support'); setActiveConvId(null); }} 
            style={{
              flex: 1, padding: '14px 10px', background: 'none', border: 'none',
              color: tab === 'support' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              fontWeight: tab === 'support' ? 700 : 500,
              borderBottom: tab === 'support' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem'
            }}
          >
            <span>طلبات الدعم</span>
            {supportConvs.filter(c => (c.unreadCount?.[user.uid] || 0) > 0).length > 0 && (
              <span style={{
                marginRight: '6px',
                background: 'var(--accent-amber)',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.62rem',
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

        {/* Contacts List Scroll area */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="chat-contacts-scroll">
          {tab === 'admin' ? (
            <>
              {/* General admin group */}
              <div 
                onClick={handleSelectGroup} 
                style={{
                  padding: '14px 16px', 
                  borderBottom: '1px solid rgba(255,255,255,0.02)', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  transition: 'background 0.2s',
                  background: activeConvId === 'admin_group_chat' ? 'rgba(59,130,246,0.08)' : 'transparent'
                }} 
                className="chat-list-hover-row"
              >
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  background: 'var(--gradient-cyber)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(139,92,246,0.2)'
                }}>
                  <Users size={18} />
                </div>
                <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'white' }}>مجموعة الإدارة العامة 📢</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    تواصل جماعي مع كافة المدراء
                  </div>
                </div>
              </div>

              {/* Create Custom Group button */}
              <div 
                onClick={() => setShowCreateGroup(true)} 
                style={{
                  padding: '12px 16px', 
                  borderBottom: '1px solid rgba(255,255,255,0.02)', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  transition: 'all 0.2s'
                }} 
                className="chat-list-hover-row"
              >
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)',
                }}>
                  <MessageCirclePlus size={18} />
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff' }}>إنشاء مجموعة جديدة</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>مجموعة محادثة مع المشرفين</div>
                </div>
              </div>

              {/* Groups section header */}
              {(memberGroups.length > 0 || nonMemberGroups.length > 0) && (
                <div style={{ padding: '10px 16px 4px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  المجموعات
                </div>
              )}

              {/* Member groups */}
              {memberGroups.map(group => (
                <div 
                  key={group.id}
                  onClick={() => handleSelectConv(group)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s',
                    background: activeConvId === group.id ? 'rgba(59,130,246,0.08)' : 'transparent'
                  }}
                  className="chat-list-hover-row"
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: group.avatar ? 'transparent' : 'rgba(139,92,246,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a78bfa', fontWeight: 700, fontSize: '0.75rem',
                    overflow: 'hidden',
                  }}>
                    {group.avatar ? (
                      <img src={group.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Users size={16} />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group.groupName || 'مجموعة'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {group.members.length} عضو
                    </div>
                  </div>
                </div>
              ))}

              {/* Non-member groups */}
              {nonMemberGroups.map(group => (
                <div 
                  key={group.id}
                  onClick={() => handleSelectNonMemberGroup(group)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s',
                    opacity: 0.55,
                    background: activeConvId === group.id ? 'rgba(234,179,8,0.06)' : 'transparent'
                  }}
                  className="chat-list-hover-row"
                  title="لم يتم ضمك إلى هذه المجموعة"
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem',
                  }}>
                    🔒
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group.groupName || 'مجموعة'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      غير مضاف
                    </div>
                  </div>
                </div>
              ))}

              {/* DMs */}
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
            <ConversationList
              conversations={supportConvs}
              activeId={activeConvId}
              currentUid={user.uid}
              onSelect={handleSelectConv}
              emptyLabel="لا توجد طلبات دعم حالياً"
            />
          )}
        </div>

        {/* FAB for New Chat */}
        {tab !== 'support' && (
          <button 
            onClick={() => setShowNewChat(true)}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
              transition: 'transform 0.2s',
              zIndex: 10
            }}
            className="hover-scale"
          >
            <MessageCirclePlus size={22} />
          </button>
        )}

        {/* New DM contacts drawer overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0d1325',
          transform: showNewChat ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
              <ArrowRight size={20} />
            </button>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'white' }}>
              {tab === 'admin' ? 'محادثة إدارية جديدة' : 'محادثة عضو جديدة'}
            </div>
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(tab === 'admin' ? agents : members).length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                لا يوجد مستخدمين متاحين
              </div>
            ) : (
              (tab === 'admin' ? agents : members).map(m => {
                const hasConv = (tab === 'admin' ? adminConvs : memberConvs).some(c => c.members.includes(m.uid) && !c.isGroup);
                return (
                  <div 
                    key={m.uid} 
                    onClick={() => handleSelectMember(m)} 
                    style={{
                      padding: '12px 20px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '14px',
                      transition: 'background 0.15s', 
                      borderBottom: '1px solid rgba(255,255,255,0.01)'
                    }} 
                    className="chat-list-hover-row"
                  >
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: tab === 'admin' ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)', 
                      border: tab === 'admin' ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(16,185,129,0.15)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: 700, fontSize: '0.88rem', 
                      color: tab === 'admin' ? 'var(--accent-blue)' : 'var(--accent-emerald)', 
                      flexShrink: 0 
                    }}>
                      {m.name.substring(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600, marginBottom: '2px' }}>{m.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{hasConv ? 'محادثة موجودة بالفعل' : 'ابدأ محادثة جديدة'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── Active Chat Window ─── */}
      <div 
        className={`chat-window ${!activeConvId ? 'hide-mobile' : ''}`} 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          background: 'var(--bg-primary)' 
        }}
      >
        {activeConvId && activeConv ? (
          !isGroupMember && activeConv.isGroup ? (
            /* Restricted: non-member group view */
            <>
              {/* Header */}
              <div 
                style={{ 
                  padding: '14px 20px', 
                  borderBottom: '1px solid var(--border-color)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  background: 'var(--bg-secondary)' 
                }}
              >
                <button onClick={() => setActiveConvId(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} className="mobile-back-chat">
                  <ArrowRight size={20} />
                </button>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  🔒
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                    {activeConv.groupName || 'مجموعة'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    غير مضاف إلى المجموعة
                  </div>
                </div>
              </div>
              {/* Restricted message */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px 20px' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '20px',
                    background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', fontSize: '2rem',
                  }}>
                    🔒
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
                    {activeConv.groupName || 'مجموعة خاصة'}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                    لم يتم ضمك إلى هذه المجموعة بعد، سيتمكن أحد مدراء المجموعة من إضافتك لتتمكن من المشاركة في المحادثة
                  </p>
                  <div style={{
                    marginTop: '20px', padding: '10px 20px', borderRadius: '12px',
                    background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.1)',
                    display: 'inline-block', fontSize: '0.75rem', color: 'var(--accent-amber)',
                    fontWeight: 600,
                  }}>
                    انتظر حتى يتم ضمك إلى المجموعة
                  </div>
                </div>
              </div>
            </>
          ) : (
          <>
            {/* Window Header */}
            <div 
              style={{ 
                padding: '14px 20px', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                background: 'var(--bg-secondary)' 
              }}
            >
              {/* Desktop toggle sidebar button */}
              <button 
                onClick={() => setSidebarCollapsed(s => !s)} 
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                  padding: '4px', display: 'flex', alignItems: 'center', transition: '0.2s',
                }} 
                className="chat-toggle-sidebar-button"
                title={sidebarCollapsed ? 'إظهار القائمة' : 'إخفاء القائمة'}
              >
                <ArrowRight size={16} style={{ transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.2s' }} />
              </button>
              
              {/* Mobile Back button */}
              <button onClick={() => setActiveConvId(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }} className="mobile-back-chat">
                <ArrowRight size={20} />
              </button>

              {(() => {
                const otherUid = activeConv.members.find(m => m !== user.uid);
                const otherName = otherUid ? activeConv.memberNames?.[otherUid] || activeConv.name : activeConv.name;
                const isGroup = activeConv.isGroup;
                return (
                  <>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: isGroup ? '10px' : '50%', flexShrink: 0,
                      background: activeConv.type === 'agent_member' ? 'rgba(16,185,129,0.1)' : isGroup ? 'var(--gradient-cyber)' : 'rgba(59,130,246,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem',
                      border: activeConv.type === 'agent_member' ? '1px solid rgba(16,185,129,0.2)' : 'none'
                    }}>
                      {isGroup ? '📢' : otherName?.substring(0, 2) || '??'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>
                        {isGroup ? activeConv.groupName || 'المجموعة' : otherName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {isGroup ? `${activeConv.members.length} مشرف بالإدارة` : activeConv.type === 'agent_member' ? 'عضو مسجل' : 'محادثة مباشرة مؤمنة'}
                      </div>
                    </div>
                    {isGroup && (
                      <button 
                        onClick={() => setShowGroupSettings(true)} 
                        style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer',
                          padding: '8px', borderRadius: '10px', display: 'flex', transition: 'all 0.2s'
                        }} 
                        className="chat-toggle-sidebar-button"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Messaging Feed Scroll area */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '24px 20px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px', 
                background: 'rgba(5, 8, 16, 0.2)' 
              }}
              className="chat-messages-scroll"
            >
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  لا توجد رسائل سابقة. أرسل رسالتك الأولى للبدء.
                </div>
              ) : messages.map(msg => {
                const isSelf = msg.senderId === user.uid;
                const isBot = msg.senderId === 'bot';
                const isSystem = msg.type === 'system_event';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '6px 16px', 
                        fontSize: '0.72rem', 
                        color: 'var(--text-secondary)',
                        textAlign: 'center', 
                        maxWidth: '85%',
                      }}>
                        <span>{msg.content}</span>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={msg.id} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignSelf: isSelf ? 'flex-start' : 'flex-end', 
                      maxWidth: isBot ? '80%' : '72%', 
                      gap: '4px' 
                    }}
                  >
                    {activeConv.isGroup && !isSelf && !isBot && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: msg.senderRole === 'super_admin' ? 'var(--accent-purple)' : 'var(--accent-blue)', marginRight: '6px' }}>
                        {msg.senderName}
                      </span>
                    )}
                    {isBot && !isSelf && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-emerald)', marginRight: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Bot size={11} />
                        <span>المساعد الذكي</span>
                      </span>
                    )}

                    {/* Chat Bubble Container */}
                    <div style={{
                      padding: isBot ? '12px 18px' : '10px 16px', 
                      borderRadius: isSelf ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                      background: isSelf 
                        ? 'var(--accent-blue)' 
                        : isBot 
                        ? 'rgba(16, 185, 129, 0.05)' 
                        : '#0d1325',
                      border: '1px solid', 
                      borderColor: isSelf 
                        ? 'rgba(59,130,246,0.2)' 
                        : isBot 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : 'var(--border-color)',
                      color: 'white', 
                      wordBreak: 'break-word', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      boxShadow: isSelf ? '0 4px 12px rgba(59,130,246,0.15)' : 'none'
                    }}>
                      {/* Image attachments */}
                      {msg.type === 'image' && msg.imageUrls?.map((url: string, i: number) => (
                        <img 
                          key={i} 
                          src={url} 
                          alt="" 
                          style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }} 
                          onClick={() => window.open(url, '_blank')} 
                        />
                      ))}
                      {/* File attachments */}
                      {msg.type === 'file' && msg.fileUrl && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 600 }}>
                          {msg.content}
                        </a>
                      )}
                      
                      {msg.type === 'text' && <span style={{ fontSize: '0.84rem', lineHeight: 1.6 }}>{msg.content}</span>}
                      
                      {/* Bubble footer info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontSize: '0.62rem', color: isSelf ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: '2px' }}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isSelf && <CheckCheck size={11} style={{ color: 'var(--accent-cyan)' }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input panel */}
            <ChatInput
              onSend={handleSend}
              placeholder={tab === 'member' ? 'اكتب ردك للعضو...' : 'اكتب رسالتك...'}
            />
          </>
        )
      ) : (
        /* Empty Active state banner */
        <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
            <MessageSquare size={26} />
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '0.94rem', color: 'white', marginBottom: '4px' }}>بوابة المحادثات</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', maxWidth: '300px', margin: '0 auto' }}>
              اختر محادثة من القائمة الجانبية للبدء
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && user && (
        <CreateGroupModal
          allAdmins={[user, ...agents]}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && activeConv && activeConv.isGroup && user && (
        <GroupSettings
          conv={activeConv}
          allAdmins={[user, ...agents]}
          currentUid={user.uid}
          onClose={() => setShowGroupSettings(false)}
          onUpdate={handleUpdateGroupInfo}
          onRemoveMember={handleRemoveMember}
          onAddMembers={handleAddMembers}
        />
      )}

      <style>{`
        .chat-list-hover-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .chat-contacts-scroll::-webkit-scrollbar,
        .chat-messages-scroll::-webkit-scrollbar {
          width: 4px;
        }
        @media (max-width: 768px) {
          .chat-sidebar.hide-mobile { display: none !important; }
          .chat-window.hide-mobile { display: none !important; }
          .chat-sidebar { width: 100% !important; display: flex; }
          .chat-window { width: 100% !important; display: flex; }
          .mobile-back-chat { display: flex !important; }
          .chat-toggle-sidebar-button { display: none !important; }
          .chat-workspace-container {
            height: calc(100vh - var(--navbar-height) - 24px) !important;
          }
        }
      `}</style>
    </div>
  );
}
