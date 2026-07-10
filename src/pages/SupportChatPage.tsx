import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToCustomerSupportConversation } from '../firebase/db/conversations';
import { subscribeToLatestMessages } from '../firebase/db/messages';
import { sendMessage, markRead } from '../services/ChatService';
import { createSupportTicket } from '../services/TicketService';
import { useChatBot } from '../hooks/useChatBot';
import type { Conversation, ChatMessage } from '../types';
import { MessageSquare, AlertCircle, CheckCheck, Users, Bot, Loader2 } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';
import { showToast } from '../components/ui/Toast';

export default function SupportChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [ticketId, setTicketId] = useState<string | undefined>();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if admin (Removed so they can test the bot)
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Initialize support conversation
  useEffect(() => {
    if (!user) return;
    
    setInitializing(true);
    
    // الاشتراك في محادثة الدعم
    const unsub = subscribeToCustomerSupportConversation(user.uid, (conv) => {
      if (conv) {
        setConversation(conv);
        setLoading(false);
        setInitializing(false);
      } else {
        // إنشاء محادثة دعم جديدة وتذكرة دعم
        setLoading(true);
        createSupportTicket(user, 'طلب دعم فني تلقائي', 'general')
          .then(() => {
            setLoading(false);
            setInitializing(false);
          })
          .catch((err) => {
            console.error('Failed to create support conversation:', err);
            showToast('فشل إنشاء محادثة الدعم', 'error');
            setLoading(false);
            setInitializing(false);
          });
      }
    });
    
    return () => unsub();
  }, [user]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversation) return;
    
    const unsub = subscribeToLatestMessages(conversation.id, setMessages);
    return () => unsub();
  }, [conversation]);

  // Track ticketId from conversation
  useEffect(() => {
    if (conversation?.ticketId) {
      setTicketId(conversation.ticketId);
    }
  }, [conversation]);

  // Mark as read
  useEffect(() => {
    if (!conversation || !user) return;
    markRead(conversation.id, user).catch(() => {});
  }, [conversation, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🤖 Chatbot auto-responder (user side only)
  useChatBot(conversation?.id ?? null, messages, user, ticketId);

  const handleSend = (text: string, imageUrls?: string[]) => {
    if (!conversation || !user || !text.trim()) return;
    
    sendMessage({
      conversationId: conversation.id,
      sender: user,
      content: text,
      type: imageUrls ? 'image' : 'text',
      imageUrls
    }).catch((err) => {
      console.error('Failed to send support message:', err);
      showToast('فشل إرسال الرسالة', 'error');
    });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  if (!user || user.role !== 'user') return null;

  if (loading || initializing) {
    return (
      <div style={{ 
        maxWidth: '850px', 
        margin: '60px auto', 
        padding: '0 24px', 
        textAlign: 'center',
        direction: 'rtl' 
      }}>
        <div className="glass-card" style={{ padding: '60px 40px' }}>
          <Loader2 className="animate-spin-fast text-primary mb-3" size={32} style={{ margin: '0 auto' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>
            {initializing ? 'جاري إنشاء محادثة الدعم...' : 'جاري التحميل...'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            يرجى الانتظار قليلاً لتأكيد التذكرة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        maxWidth: '850px', 
        margin: '0 auto', 
        height: 'calc(100vh - var(--navbar-height) - 48px)', 
        padding: '0 24px', 
        direction: 'rtl' 
      }} 
      className="page-enter support-chat-page-wrapper"
    >
      
      <div 
        className="glass-card" 
        style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)'
        }}
      >
        
        {/* Header section */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--border-color)', 
          background: 'rgba(0,0,0,0.1)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              fontSize: '1.25rem',
              border: '1px solid rgba(59, 130, 246, 0.15)'
            }}>
              <Users size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2px', color: '#fff' }}>
                دعم فني EMF Group 💬
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                تواصل مع فريق الدعم الفني - المسؤولون متصلون لتسوية مشكلتك
              </p>
            </div>
          </div>
        </div>

        {/* Welcome information banner */}
        {messages.length === 0 && (
          <div style={{ 
            padding: '36px 24px', 
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(5, 8, 16, 0.15)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'rgba(59, 130, 246, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              margin: '0 auto 16px',
              border: '1px solid rgba(59, 130, 246, 0.12)'
            }}>
              <MessageSquare size={26} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
              مرحباً بك في الدعم الفني! 👋
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.82rem', 
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto'
            }}>
              هذه محادثة خاصة بينك وبين فريق الدعم الفني لشركة EMF Group.
              يمكنك طرح أي سؤال أو مشكلة، وسيتم الرد عليك من قبل المسؤول في أقرب وقت.
            </p>
            
            {/* Action Tips layout */}
            <div style={{ 
              marginTop: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              maxWidth: '380px',
              margin: '20px auto 0'
            }}>
              <div 
                className="glass-card" 
                style={{ 
                  padding: '10px 14px', 
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.01)'
                }}
              >
                <AlertCircle size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  جميع المسؤولين يمكنهم رؤية المحادثة والرد
                </span>
              </div>
              <div 
                className="glass-card" 
                style={{ 
                  padding: '10px 14px', 
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.01)'
                }}
              >
                <CheckCheck size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  يمكنك إرسال رسائل نصية ومرفقات صور
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Message Feed grid */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px 24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px',
          background: 'rgba(5,8,16,0.1)' 
        }} className="support-chat-messages-scroll">
          {messages.map(msg => {
            const isSelf = msg.senderId === user.uid;
            const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'super_admin';
            const isBot = msg.senderId === 'bot';
            
            return (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignSelf: isSelf ? 'flex-start' : 'flex-end',
                  maxWidth: isBot ? '80%' : '75%',
                  gap: '4px'
                }}
              >
                {/* Sender Title Banner */}
                {!isSelf && isAdmin && !isBot && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginRight: '6px'
                  }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: msg.senderRole === 'super_admin' 
                        ? 'rgba(139, 92, 246, 0.15)' 
                        : 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      color: msg.senderRole === 'super_admin' 
                        ? 'var(--accent-purple)' 
                        : 'var(--accent-blue)'
                    }}>
                      {msg.senderName.substring(0, 2)}
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold',
                      color: msg.senderRole === 'super_admin' 
                        ? 'var(--accent-purple)' 
                        : 'var(--accent-blue)'
                    }}>
                      {msg.senderName}
                      {msg.senderRole === 'super_admin' && ' 👑'}
                    </span>
                  </div>
                )}

                {/* Bot indicator */}
                {isBot && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginRight: '6px'
                  }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: 'var(--accent-emerald)'
                    }}>
                      <Bot size={12} />
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold',
                      color: 'var(--accent-emerald)'
                    }}>
                      المساعد الذكي
                    </span>
                  </div>
                )}
                
                {/* Bubble box */}
                <div style={{
                  padding: isBot ? '12px 16px' : '10px 16px',
                  borderRadius: isSelf ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                  background: isSelf 
                    ? 'var(--bg-chat-bubble-self)' 
                    : isBot
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(6, 95, 70, 0.1) 100%)'
                    : 'var(--bg-chat-bubble-other)',
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
                  gap: '6px',
                  boxShadow: isSelf ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
                }}>
                  {isBot && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginBottom: '2px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.15)'
                    }}>
                      <Bot size={12} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: 'var(--accent-emerald)'
                      }}>
                        رد تلقائي
                      </span>
                    </div>
                  )}

                  {/* Images content */}
                  {msg.type === 'image' && msg.imageUrls?.map((url: string, i: number) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt="" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '260px', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }} 
                      onClick={() => window.open(url, '_blank')} 
                    />
                  ))}
                  
                  {/* Message texts */}
                  {(msg.type === 'text' || isBot) && (
                    <span style={{ 
                      fontSize: '0.84rem', 
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </span>
                  )}
                  
                  {/* Timestamp specs */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    justifyContent: 'flex-end',
                    fontSize: '0.6rem',
                    color: isSelf ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                    marginTop: '2px'
                  }}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {isSelf && <CheckCheck size={11} style={{ color: 'var(--accent-cyan)' }} />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <ChatInput
          onSend={handleSend}
          placeholder="اكتب رسالتك للدعم الفني..."
        />
      </div>

      <style>{`
        .support-chat-messages-scroll::-webkit-scrollbar {
          width: 4px;
        }
        @media(max-width: 768px) {
          .support-chat-page-wrapper {
            padding: 0px 4px !important;
            height: calc(100vh - var(--navbar-height) - 16px) !important;
          }
        }
      `}</style>
    </div>
  );
}