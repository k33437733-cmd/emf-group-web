import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSupportChat } from '../hooks/useSupportChat';
import { useI18n } from '../context/I18nContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import MessageBubble from '../components/support/MessageBubble';
import MessageInput from '../components/support/MessageInput';
import TypingIndicator from '../components/support/TypingIndicator';
import ConversationList from '../components/support/ConversationList';
import SkeletonChat from '../components/support/SkeletonChat';
import VirtualizedMessageList from '../components/support/VirtualizedMessageList';
import ReconnectIndicator from '../components/support/ReconnectIndicator';
import ScrollToBottomFAB from '../components/support/ScrollToBottomFAB';
import ForwardDialog from '../components/support/ForwardDialog';
import MessageReactions from '../components/support/MessageReactions';
import { markAllMessagesRead } from '../firebase/support';
import { MessageSquare, CheckCheck } from 'lucide-react';

type AdminTab = 'all' | 'unread' | 'waiting';

function formatDateSeparator(iso: string, rtl: boolean) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return rtl ? 'اليوم' : 'Today';
  if (isYesterday) return rtl ? 'أمس' : 'Yesterday';
  return d.toLocaleDateString(rtl ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function shouldShowDateSeparator(curr: string, prev: string | undefined): boolean {
  if (!prev) return true;
  const c = new Date(curr).toDateString();
  const p = new Date(prev).toDateString();
  return c !== p;
}

export default function SupportChatPage() {
  const { user } = useAuth();
  const { rtl } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));

  const {
    conversations, activeConvId, messages, loading, error, sending, typingUsers,
    activeConversation, uploadProgress, uploadTracks, loadingMore, setActiveConv, sendMessage,
    startNewConversation, setTyping, deleteMessage, editMessage,
    cancelUpload, retryUpload, loadMore, hasMore,
    replyToMsg, setReplyTo, addReaction, sendReply,
  } = useSupportChat();

  const { status: netStatus, isOnline } = useNetworkStatus();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('all');
  const mq = useMediaQuery();
  const [showMobileConvList, setShowMobileConvList] = useState(true);
  const [forwardMsg, setForwardMsg] = useState<any>(null);

  // Auto-select conversation from URL param
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId && conversations.some(c => c.id === convId)) {
      setActiveConv(convId);
    }
  }, [searchParams, conversations, setActiveConv]);

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

  const handleSend = useCallback((text: string, files?: File[]) => {
    if (!text.trim() && (!files || files.length === 0)) return;
    sendMessage(text, 'text', files);
  }, [sendMessage]);

  // On mobile, selecting a conversation shows the chat panel
  const handleSelectConv = useCallback((id: string) => {
    setActiveConv(id);
    setShowMobileConvList(false);
  }, [setActiveConv]);

  const filteredConversations = useMemo(() => {
    if (!isAdmin) return conversations;
    if (adminTab === 'all') return conversations;
    if (adminTab === 'unread') return conversations.filter(c => (c.unreadCount?.total as number || 0) > 0);
    return conversations;
  }, [conversations, adminTab, isAdmin]);

  // ── Not logged in → redirect ──
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  // ═══════════════════════════════════════════════════════════════
  // CLIENT VIEW (single conversation, WhatsApp-style)
  // ═══════════════════════════════════════════════════════════════
  if (!isAdmin) {
    return (
      <div style={{
        height: 'calc(100vh - var(--navbar-height))', display: 'flex', flexDirection: 'column',
        background: 'var(--chat-bg, var(--bg-primary))',
        direction: rtl ? 'rtl' : 'ltr',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
          background: 'var(--bg-secondary)', flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
          }}>
            <MessageSquare size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {rtl ? 'الدعم الفني' : 'Support'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
              {activeConversation
                ? (rtl ? 'نرد عادةً خلال دقائق' : 'We usually reply within minutes')
                : (rtl ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?')}
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonChat />
        ) : error && !activeConvId ? (
          /* Error state */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '12px', padding: '32px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
            }}>
              <MessageSquare size={22} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
              {error}
            </p>
            <button onClick={startNewConversation} className="btn btn-primary" style={{ gap: '8px', padding: '0 20px', fontSize: '0.8rem' }}>
              {rtl ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : !activeConvId ? (
          /* No conversation - start new */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '16px', padding: '32px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--badge-bg)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--text-tertiary)',
            }}>
              <MessageSquare size={24} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {rtl ? 'ابدأ محادثة مع الدعم' : 'Start a conversation'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                {rtl ? 'نحن هنا لمساعدتك. أرسل لنا رسالة وسنرد عليك في أقرب وقت.' : 'We are here to help. Send us a message and we will reply as soon as possible.'}
              </p>
            </div>
            <button onClick={startNewConversation} className="btn btn-primary" style={{ gap: '8px', padding: '0 24px' }}>
              <MessageSquare size={14} /> {rtl ? 'بدء محادثة جديدة' : 'New Conversation'}
            </button>
          </div>
        ) : (
          <>
            {/* Network status */}
            <ReconnectIndicator status={netStatus} rtl={rtl} />

            {/* Messages area */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <VirtualizedMessageList
                messages={messages.filter(m => !m.isInternal)}
                loadMore={loadMore}
                hasMore={hasMore}
                loading={loadingMore}
                scrollToBottom={true}
                renderMessage={(msg, idx, msgs) => (
                  <>
                    {shouldShowDateSeparator(msg.createdAt, idx > 0 ? msgs[idx - 1]?.createdAt : undefined) && (
                      <div style={{
                        textAlign: 'center', padding: '12px 16px 8px',
                        fontSize: '0.68rem', color: 'var(--text-tertiary)',
                        fontWeight: 500,
                      }}>
                        <span style={{
                          background: 'var(--bg-secondary)', padding: '4px 14px',
                          borderRadius: '12px', border: '1px solid var(--color-border)',
                        }}>
                          {formatDateSeparator(msg.createdAt, rtl)}
                        </span>
                      </div>
                    )}
                    {msg.forwardedAt && (
                      <div style={{
                        textAlign: 'center', padding: '2px 16px',
                        fontSize: '0.6rem', color: 'var(--text-tertiary)', opacity: 0.6,
                      }}>
                        📨 {rtl ? 'رسالة مُعاد توجيهها' : 'Forwarded message'}
                      </div>
                    )}
                    <div onClick={() => setReplyTo(msg)} style={{ cursor: 'pointer' }}>
                      <MessageBubble
                        message={msg}
                        isOwn={msg.senderId === user.uid}
                        onDelete={deleteMessage}
                        onEdit={editMessage}
                        onForward={isAdmin ? (m) => setForwardMsg(m) : undefined}
                        showStatus={true}
                      />
                    </div>
                    <div style={{ padding: '0 16px 4px' }}>
                      <MessageReactions
                        reactions={msg.reactions}
                        currentUid={user.uid}
                        onReact={(emoji) => addReaction(msg.id, emoji)}
                      />
                    </div>
                  </>
                )}
                renderTyping={typingUsers.length > 0 ? <TypingIndicator userName={typingUsers[0].userName} rtl={rtl} /> : undefined}
              />
              <ScrollToBottomFAB scrollRef={messagesContainerRef} rtl={rtl} />
            </div>

            {/* Upload progress tracks */}
            {uploadTracks.length > 0 && (
              <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {uploadTracks.map(t => (
                  <div key={t.id} className="upload-track-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '0.7rem' }}>
                    <span className="upload-track-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{t.fileName}</span>
                    <div className="upload-track-progress" style={{ flex: 1, height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden', maxWidth: '100px' }}>
                      <div style={{ width: `${t.progress}%`, height: '100%', background: t.status === 'error' ? '#EF4444' : 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.2s' }} />
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', minWidth: '28px' }}>{t.progress}%</span>
                    {t.status === 'uploading' && (
                      <button onClick={() => cancelUpload(t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <span style={{ fontSize: '0.65rem' }}>إلغاء</span>
                      </button>
                    )}
                    {t.status === 'error' && (
                      <button onClick={() => retryUpload(t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <span style={{ fontSize: '0.65rem' }}>إعادة</span>
                      </button>
                    )}
                    {t.status === 'done' && <span style={{ color: '#16A34A', fontSize: '0.65rem' }}>تم</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              onTyping={setTyping}
              sending={sending}
              uploadProgress={uploadProgress}
              rtl={rtl}
              replyToMsg={replyToMsg}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN VIEW (3-panel dashboard)
  // ═══════════════════════════════════════════════════════════════
  const adminTabs: { key: AdminTab; label: string; labelEn: string }[] = [
    { key: 'all', label: 'الكل', labelEn: 'All' },
    { key: 'unread', label: 'غير مقروء', labelEn: 'Unread' },
    { key: 'waiting', label: 'بانتظار الرد', labelEn: 'Waiting' },
  ];

  return (
    <div className="support-admin-container" style={{
      height: 'calc(100vh - var(--navbar-height))', display: 'flex',
      direction: rtl ? 'rtl' : 'ltr', background: 'var(--bg-primary)',
    }}>
      <style>{`
        @media (max-width: 768px) {
          .chat-back-btn { display: flex !important; }
          .support-panel-info { display: none !important; }
          .support-panel-convlist { width: 100% !important; }
          .support-panel-convlist.mobile-hidden { display: none !important; }
          .support-panel-chat { width: 100% !important; min-width: 0 !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .support-panel-convlist { width: 260px !important; }
          .support-panel-info { display: none !important; }
        }
        @media (min-width: 1025px) {
          .chat-back-btn { display: none !important; }
        }
      `}</style>
      {/* ── Left Panel: Conversations List ── */}
      <div className={'support-panel-convlist' + (showMobileConvList ? '' : ' mobile-hidden')} style={{
        borderLeft: rtl ? '1px solid var(--color-border)' : 'none',
        borderRight: !rtl ? '1px solid var(--color-border)' : 'none',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <div style={{ padding: '14px 14px 0', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            {rtl ? 'محادثات الدعم' : 'Support Conversations'}
          </h3>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
            {adminTabs.map(tab => (
              <button key={tab.key} onClick={() => setAdminTab(tab.key)}
                style={{
                  padding: '6px 12px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
                  background: adminTab === tab.key ? 'var(--bg-primary)' : 'transparent',
                  color: adminTab === tab.key ? 'var(--color-primary)' : 'var(--text-tertiary)',
                  fontSize: '0.72rem', fontWeight: adminTab === tab.key ? 700 : 500,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                {rtl ? tab.label : tab.labelEn}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ConversationList
            conversations={filteredConversations}
            activeId={activeConvId}
            onSelect={handleSelectConv}
            loading={loading}
            rtl={rtl}
            currentUserUid={user?.uid}
          />
        </div>
      </div>

      {/* ── Center Panel: Chat ── */}
      <div className="support-panel-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 16px', borderBottom: '1px solid var(--color-border)',
              background: 'var(--bg-secondary)', flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <button className="chat-back-btn" onClick={() => setShowMobileConvList(true)}
                style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={rtl ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} /></svg>
              </button>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
              }}>
                {(activeConversation.name || 'U').charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeConversation.name || (rtl ? 'مستخدم' : 'User')}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                  {rtl ? 'نشط' : 'Active'}
                </div>
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                borderRadius: '8px', border: '1px solid var(--color-border)',
                background: 'transparent', color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit',
              }}>
                <CheckCheck size={14} style={{ color: 'var(--color-success)' }} />
                {rtl ? 'تحديد كمقروء' : 'Mark read'}
              </button>
            </div>

            {/* Network status */}
            <ReconnectIndicator status={netStatus} rtl={rtl} />

            {/* Messages */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <VirtualizedMessageList
                messages={messages.filter(m => !m.isInternal)}
                loadMore={loadMore}
                hasMore={hasMore}
                loading={loadingMore}
                scrollToBottom={true}
                renderMessage={(msg, idx, msgs) => (
                  <>
                    {shouldShowDateSeparator(msg.createdAt, idx > 0 ? msgs[idx - 1]?.createdAt : undefined) && (
                      <div style={{
                        textAlign: 'center', padding: '12px 16px 8px',
                        fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 500,
                      }}>
                        <span style={{
                          background: 'var(--bg-secondary)', padding: '4px 14px',
                          borderRadius: '12px', border: '1px solid var(--color-border)',
                        }}>
                          {formatDateSeparator(msg.createdAt, rtl)}
                        </span>
                      </div>
                    )}
                    {msg.forwardedAt && (
                      <div style={{
                        textAlign: 'center', padding: '2px 16px',
                        fontSize: '0.6rem', color: 'var(--text-tertiary)', opacity: 0.6,
                      }}>
                        📨 {rtl ? 'رسالة مُعاد توجيهها' : 'Forwarded message'}
                      </div>
                    )}
                    <div onClick={() => setReplyTo(msg)} style={{ cursor: 'pointer' }}>
                      <MessageBubble
                        message={msg}
                        isOwn={msg.senderId === user.uid}
                        onDelete={deleteMessage}
                        onEdit={editMessage}
                        onForward={isAdmin ? (m) => setForwardMsg(m) : undefined}
                        showStatus={true}
                      />
                    </div>
                    <div style={{ padding: '0 16px 4px' }}>
                      <MessageReactions
                        reactions={msg.reactions}
                        currentUid={user.uid}
                        onReact={(emoji) => addReaction(msg.id, emoji)}
                      />
                    </div>
                  </>
                )}
                renderTyping={typingUsers.length > 0 ? <TypingIndicator userName={typingUsers[0].userName} rtl={rtl} /> : undefined}
              />
              <ScrollToBottomFAB scrollRef={messagesContainerRef} rtl={rtl} />
            </div>

            {/* Upload progress tracks */}
            {uploadTracks.length > 0 && (
              <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {uploadTracks.map(t => (
                  <div key={t.id} className="upload-track-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '0.7rem' }}>
                    <span className="upload-track-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{t.fileName}</span>
                    <div className="upload-track-progress" style={{ flex: 1, height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden', maxWidth: '100px' }}>
                      <div style={{ width: `${t.progress}%`, height: '100%', background: t.status === 'error' ? '#EF4444' : 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.2s' }} />
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', minWidth: '28px' }}>{t.progress}%</span>
                    {t.status === 'uploading' && (
                      <button onClick={() => cancelUpload(t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <span style={{ fontSize: '0.65rem' }}>إلغاء</span>
                      </button>
                    )}
                    {t.status === 'error' && (
                      <button onClick={() => retryUpload(t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <span style={{ fontSize: '0.65rem' }}>إعادة</span>
                      </button>
                    )}
                    {t.status === 'done' && <span style={{ color: '#16A34A', fontSize: '0.65rem' }}>تم</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              onTyping={setTyping}
              sending={sending}
              uploadProgress={uploadProgress}
              rtl={rtl}
              isAdmin={isAdmin}
              replyToMsg={replyToMsg}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          /* No conversation selected */
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '12px', color: 'var(--text-tertiary)',
          }}>
            <MessageSquare size={36} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.85rem' }}>
              {rtl ? 'اختر محادثة من القائمة' : 'Select a conversation from the list'}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel: Customer Info ── */}
      {activeConversation && (
        <div className="support-panel-info" style={{
          borderRight: rtl ? '1px solid var(--color-border)' : 'none',
          borderLeft: !rtl ? '1px solid var(--color-border)' : 'none',
          padding: '16px', background: 'var(--bg-secondary)', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {/* Avatar */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px', color: '#fff', fontWeight: 700, fontSize: '1.2rem',
            }}>
              {(activeConversation.name || 'U').charAt(0)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeConversation.name || (rtl ? 'مستخدم' : 'User')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {activeConversation.memberRoles?.[activeConversation.members?.[0] || ''] === 'user'
                ? (rtl ? 'عضو مسجل' : 'Registered member')
                : (rtl ? 'مستخدم' : 'User')}
            </div>
          </div>

          {/* Stats */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '10px', padding: '12px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {rtl ? 'معلومات المحادثة' : 'Conversation Info'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{rtl ? 'الرسائل' : 'Messages'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{messages.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{rtl ? 'الحالة' : 'Status'}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                  {activeConversation.status === 'active' ? (rtl ? 'نشط' : 'Active') : (rtl ? 'مغلق' : 'Closed')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{rtl ? 'تاريخ البداية' : 'Started'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.65rem' }}>
                  {new Date(activeConversation.createdAt).toLocaleDateString(rtl ? 'ar-EG' : 'en-US')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              borderRadius: '8px', border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--text-primary)',
              cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              <CheckCheck size={14} style={{ color: 'var(--color-success)' }} />
              {rtl ? 'تحديد كمقروء' : 'Mark as read'}
            </button>
          </div>
        </div>
      )}

      {/* Forward Dialog */}
      {forwardMsg && (
        <ForwardDialog
          message={forwardMsg}
          conversations={conversations.filter(c => c.id !== activeConvId)}
          onClose={() => setForwardMsg(null)}
        />
      )}
    </div>
  );
}
