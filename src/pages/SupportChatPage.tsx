import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToCustomerSupportConversation } from '../firebase/db/conversations';
import { subscribeToLatestMessages } from '../firebase/db/messages';
import { sendMessage, markRead } from '../services/ChatService';
import { createSupportTicket } from '../services/TicketService';
import { useChatBot } from '../hooks/useChatBot';
import type { Conversation, ChatMessage } from '../types';
import { MessageSquare, AlertCircle, CheckCheck, Users, Bot } from 'lucide-react';
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
        maxWidth: '900px', 
        margin: '60px auto', 
        padding: '40px 24px', 
        textAlign: 'center',
        direction: 'rtl' 
      }}>
        <div className="glass-card" style={{ padding: '60px 40px' }}>
          <div className="animate-spin-fast" style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%',
            border: '4px solid rgba(59, 130, 246, 0.1)',
            borderTopColor: 'var(--accent-blue)',
            margin: '0 auto 20px'
          }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            {initializing ? 'جاري إنشاء محادثة الدعم...' : 'جاري التحميل...'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            يرجى الانتظار قليلاً
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto', 
      height: 'calc(100vh - var(--navbar-height))', 
      padding: '0 24px', 
      direction: 'rtl' 
    }} className="animate-fade">
      
      <div className="glass-card" style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}>
        
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border-color)', 
          background: 'rgba(15,22,42,0.2)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.3rem'
            }}>
              <Users size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }}>
                دعم فني EMF Group 💬
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                تواصل مع فريق الدعم الفني - جميع المسؤولين يمكنهم رؤية رسائلك والرد عليها
              </p>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        {messages.length === 0 && (
          <div style={{ 
            padding: '40px 24px', 
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              margin: '0 auto 20px'
            }}>
              <MessageSquare size={36} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '12px' }}>
              مرحباً بك في الدعم الفني! 👋
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.9rem', 
              lineHeight: 1.6,
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              هذه محادثة خاصة بينك وبين فريق الدعم الفني لشركة EMF Group.
              يمكنك طرح أي سؤال أو مشكلة، وسيتم الرد عليك من قبل أحد المسؤولين في أقرب وقت ممكن.
            </p>
            
            {/* Tips */}
            <div style={{ 
              marginTop: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              maxWidth: '400px',
              margin: '24px auto 0'
            }}>
              <div className="glass-card" style={{ 
                padding: '12px 16px', 
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertCircle size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  جميع المسؤولين يمكنهم رؤية المحادثة
                </span>
              </div>
              <div className="glass-card" style={{ 
                padding: '12px 16px', 
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <CheckCheck size={16} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  يمكنك إرسال نصوص وصور
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px 24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          background: 'rgba(5,8,16,0.3)' 
        }}>
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
                  maxWidth: isBot ? '85%' : '75%',
                  gap: '6px'
                }}
              >
                {/* Sender name for admins and bot */}
                {!isSelf && isAdmin && !isBot && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginRight: '8px'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: msg.senderRole === 'super_admin' 
                        ? 'rgba(139, 92, 246, 0.2)' 
                        : 'rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: msg.senderRole === 'super_admin' 
                        ? 'var(--accent-purple)' 
                        : 'var(--accent-blue)'
                    }}>
                      {msg.senderName.substring(0, 2)}
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
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

                {/* Bot sender name */}
                {isBot && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginRight: '8px'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: 'var(--accent-emerald)'
                    }}>
                      <Bot size={14} />
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      color: 'var(--accent-emerald)'
                    }}>
                      المساعد الذكي
                    </span>
                  </div>
                )}
                
                {/* Message bubble */}
                <div style={{
                  padding: isBot ? '14px 20px' : '12px 18px',
                  borderRadius: isBot ? '18px 18px 18px 6px' : '18px',
                  background: isSelf 
                    ? 'var(--bg-chat-bubble-self)' 
                    : isBot
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 95, 70, 0.15) 100%)'
                    : 'var(--bg-chat-bubble-other)',
                  border: '1px solid',
                  borderColor: isSelf 
                    ? 'rgba(59,130,246,0.2)' 
                    : isBot
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  wordBreak: 'break-word',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: isSelf 
                    ? '0 2px 8px rgba(59, 130, 246, 0.15)' 
                    : isBot
                    ? '0 2px 12px rgba(16, 185, 129, 0.1)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Bot header indicator */}
                  {isBot && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.15)'
                    }}>
                      <Bot size={14} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--accent-emerald)',
                        letterSpacing: '0.3px'
                      }}>
                        رد تلقائي
                      </span>
                    </div>
                  )}

                  {/* Images */}
                  {msg.type === 'image' && msg.imageUrls?.map((url: string, i: number) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt="" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '280px', 
                        borderRadius: '12px', 
                        cursor: 'pointer' 
                      }} 
                      onClick={() => window.open(url, '_blank')} 
                    />
                  ))}
                  
                  {/* Text */}
                  {(msg.type === 'text' || isBot) && (
                    <span style={{ 
                      fontSize: isBot ? '0.9rem' : '0.95rem', 
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </span>
                  )}
                  
                  {/* Timestamp */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    justifyContent: 'flex-end',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: '4px'
                  }}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {isSelf && <CheckCheck size={12} style={{ color: 'var(--accent-cyan)' }} />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <ChatInput
          onSend={handleSend}
          placeholder="اكتب رسالتك للدعم الفني..."
        />
      </div>
    </div>
  );
}