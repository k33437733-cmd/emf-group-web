import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSupportChat } from '../hooks/useSupportChat';
import { useI18n } from '../context/I18nContext';
import MessageBubble from '../components/support/MessageBubble';
import MessageInput from '../components/support/MessageInput';
import TypingIndicator from '../components/support/TypingIndicator';
import ConversationList from '../components/support/ConversationList';
import SkeletonChat from '../components/support/SkeletonChat';
import { markAllMessagesRead } from '../firebase/support';
import { MessageSquare, CheckCheck } from 'lucide-react';

type AdminTab = 'all' | 'unread' | 'waiting';

export default function SupportChatPage() {
  const { user } = useAuth();
  const { rtl } = useI18n();
  const navigate = useNavigate();
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));

  const {
    conversations, activeConvId, messages, loading, sending, typingUsers,
    activeConversation, uploadProgress, setActiveConv, sendMessage,
    startNewConversation, setTyping, deleteMessage, editMessage,
  } = useSupportChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConvId]);

  // Mark messages read when viewing
  useEffect(() => {
    if (!activeConvId || !user) return;
    const timeout = setTimeout(() => {
      markAllMessagesRead(activeConvId, user.uid);
    }, 500);
    return () => clearTimeout(timeout);
  }, [activeConvId, user]);

  const handleSend = useCallback((text: string, file?: File) => {
    if (!text.trim() && !file) return;
    sendMessage(text, 'text', file);
  }, [sendMessage]);

  const [adminFilter, setAdminFilter] = useState<AdminTab>('all');

  const filteredConversations = useMemo(() => {
    if (!isAdmin) return conversations;
    if (adminFilter === 'all') return conversations;
    if (adminFilter === 'unread') return conversations.filter(c => Object.values(c.unreadCount || {}).some(v => (v as number) > 0));
    return conversations;
  }, [conversations, adminFilter, isAdmin]);

  // ── Admin does not load → redirect to login ──
  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); }
  }, [user, navigate]);

  if (!user) return null;

  // ═══════════════════════════════════════════════════════════════
  // CLIENT VIEW  (single conversation, WhatsApp-style)
  // ═══════════════════════════════════════════════════════════════
  if (!isAdmin) {
    return (
      <div style={{ height: 'calc(100vh - var(--navbar-height))', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', direction: rtl ? 'rtl' : 'ltr' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
            <MessageSquare size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>الدعم الفني</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
              {activeConversation ? 'نرد عادةً خلال دقائق' : 'كيف يمكننا مساعدتك؟'}
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonChat />
        ) : !activeConvId ? (
          /* No conversation yet - start new */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <MessageSquare size={24} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>ابدأ محادثة مع الدعم</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>نحن هنا لمساعدتك. أرسل لنا رسالة وسنرد عليك في أقرب وقت.</p>
            </div>
            <button onClick={startNewConversation} className="btn btn-primary" style={{ gap: '8px', padding: '0 24px' }}>
              <MessageSquare size={14} /> بدء محادثة جديدة
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {messages.filter(m => !m.isInternal).map(msg => (
                <MessageBubble
                  key={msg.id} message={msg}
                  isOwn={msg.senderId === user.uid}
                  onDelete={deleteMessage}
                  onEdit={editMessage}
                  showStatus={true}
                />
              ))}
              {typingUsers.length > 0 && <TypingIndicator userName={typingUsers[0].userName} rtl={rtl} />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              onTyping={setTyping}
              sending={sending}
              uploadProgress={uploadProgress}
              rtl={rtl}
            />
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN VIEW  (3-panel dashboard)
  // ═══════════════════════════════════════════════════════════════
  const adminTabs: { key: AdminTab; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unread', label: 'غير مقروء' },
    { key: 'waiting', label: 'بانتظار الرد' },
  ];

  return (
    <div style={{ height: 'calc(100vh - var(--navbar-height))', display: 'flex', direction: rtl ? 'rtl' : 'ltr', background: 'var(--bg-primary)' }}>

      {/* ── Left Panel: Conversations List ── */}
      <div style={{
        width: '320px', borderLeft: rtl ? '1px solid var(--color-border)' : 'none',
        borderRight: !rtl ? '1px solid var(--color-border)' : 'none',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <div style={{ padding: '14px 14px 0', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>محادثات الدعم</h3>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
            {adminTabs.map(tab => (
              <button key={tab.key} onClick={() => setAdminFilter(tab.key)}
                style={{
                  padding: '6px 12px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
                  background: adminFilter === tab.key ? 'var(--bg-primary)' : 'transparent',
                  color: adminFilter === tab.key ? 'var(--color-primary)' : 'var(--text-tertiary)',
                  fontSize: '0.72rem', fontWeight: adminFilter === tab.key ? 700 : 500,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>{tab.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ConversationList
            conversations={filteredConversations}
            activeId={activeConvId}
            onSelect={setActiveConv}
            loading={loading}
            rtl={rtl}
          />
        </div>
      </div>

      {/* ── Center Panel: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Chat Header */}
        {activeConversation ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
              {(activeConversation.name || 'U').charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeConversation.name || 'مستخدم'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                {activeConversation.members.length} عضو
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            اختر محادثة من القائمة
          </div>
        )}

        {activeConversation && (
          <>
            <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {messages.filter(m => !m.isInternal).map(msg => (
                <MessageBubble
                  key={msg.id} message={msg}
                  isOwn={msg.senderId === user.uid}
                  onDelete={deleteMessage}
                  onEdit={editMessage}
                  showStatus={true}
                />
              ))}
              {typingUsers.length > 0 && <TypingIndicator userName={typingUsers[0].userName} rtl={rtl} />}
              <div ref={messagesEndRef} />
            </div>

            <MessageInput
              onSend={handleSend}
              onTyping={setTyping}
              sending={sending}
              uploadProgress={uploadProgress}
              rtl={rtl}
            />
          </>
        )}
      </div>

      {/* ── Right Panel: Customer Profile ── */}
      {activeConversation && (
        <div style={{
          width: '260px', borderRight: rtl ? '1px solid var(--color-border)' : 'none',
          borderLeft: !rtl ? '1px solid var(--color-border)' : 'none',
          padding: '16px', background: 'var(--bg-secondary)', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {/* Avatar & name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
              {(activeConversation.name || 'U').charAt(0)}
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeConversation.name || 'مستخدم'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {activeConversation.memberRoles[activeConversation.members[0]] === 'user' ? 'عضو مسجل' : 'مستخدم'}
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>معلومات المحادثة</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>الرسائل</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{messages.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>الحالة</span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{activeConversation.status === 'active' ? 'نشط' : 'مغلق'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>تاريخ البداية</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.65rem' }}>
                  {new Date(activeConversation.createdAt).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              <CheckCheck size={14} style={{ color: 'var(--color-success)' }} /> تحديد كمقروء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
