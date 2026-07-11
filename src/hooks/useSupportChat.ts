import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  ensureSupportConversation, subscribeToSupportConversations,
  subscribeToMessages, sendSupportMessage, markConversationRead,
  setTypingStatus, deleteSupportMessage, editSupportMessage,
  uploadAttachment, subscribeTypingStatus,
} from '../firebase/support';
import type { Conversation, ChatMessage } from '../types';

interface UseSupportChatReturn {
  conversations: Conversation[];
  activeConvId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  typingUsers: { userId: string; userName: string }[];
  activeConversation: Conversation | null;
  uploadProgress: number;
  setActiveConv: (id: string | null) => void;
  sendMessage: (content: string, type?: ChatMessage['type'], file?: File) => Promise<void>;
  startNewConversation: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  deleteMessage: (msgId: string) => Promise<void>;
  editMessage: (msgId: string, content: string) => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
}

export function useSupportChat(): UseSupportChatReturn {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));

  const activeConversation = conversations.find(c => c.id === activeConvId) || null;

  // Subscribe to conversations list, with error fallback
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    let cancelled = false;

    const unsub = subscribeToSupportConversations(
      user.uid,
      isAdmin,
      (list) => {
        if (cancelled) return;
        setConversations(list);
        setError(null);
        setLoading(false);
        if (!activeConvId && list.length > 0) {
          setActiveConvId(list[0].id);
        }
      },
      (err) => {
        if (cancelled) return;
        console.error('Failed to load conversations', err);
        setError('فشل تحميل المحادثات. حاول مرة أخرى.');
        setLoading(false);
      }
    );

    return () => { cancelled = true; unsub(); };
  }, [user, isAdmin]);

  // For non-admin users, auto-ensure a conversation exists
  useEffect(() => {
    if (!user || isAdmin) return;
    if (loading) return;
    if (conversations.length > 0) return;

    let cancelled = false;

    (async () => {
      try {
        const id = await ensureSupportConversation(user);
        if (!cancelled) setActiveConvId(id);
      } catch (err) {
        console.error('Failed to ensure support conversation', err);
        if (!cancelled) setError('فشل إنشاء المحادثة. حاول مرة أخرى.');
      }
    })();

    return () => { cancelled = true; };
  }, [user, isAdmin, loading, conversations.length]);

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }

    let cancelled = false;

    const unsub = subscribeToMessages(
      activeConvId,
      (msgs) => { if (!cancelled) setMessages(msgs); },
      (err) => {
        if (cancelled) return;
        console.error('Failed to load messages', err);
        setError('فشل تحميل الرسائل');
      }
    );

    markConversationRead(activeConvId, user?.uid || '');

    return () => { cancelled = true; unsub(); };
  }, [activeConvId, user?.uid]);

  // Subscribe to typing status
  useEffect(() => {
    if (!activeConvId) return;

    let cancelled = false;

    const unsub = subscribeTypingStatus(activeConvId, (data) => {
      if (cancelled) return;
      if (!data || data.userId === user?.uid) { setTypingUsers([]); return; }
      setTypingUsers(data.isTyping ? [{ userId: data.userId, userName: data.userName }] : []);
    });

    return () => { cancelled = true; unsub(); };
  }, [activeConvId, user?.uid]);

  const sendMsg = useCallback(async (content: string, type: ChatMessage['type'] = 'text', file?: File) => {
    if (!user || !activeConvId || (!content.trim() && !file)) return;
    setSending(true);
    try {
      let fileData: any = undefined;
      if (file) {
        setUploadProgress(0);
        const url = await uploadAttachment(file, setUploadProgress);
        fileData = { fileUrl: url, fileName: file.name, fileSize: file.size, fileType: file.type };
        type = file.type.startsWith('image/') ? 'image' : 'file';
      }
      await sendSupportMessage(activeConvId, user, content.trim(), type, fileData);
      setTypingStatus(activeConvId, user.uid, user.name || '', false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    } catch (e) {
      console.error('Send failed', e);
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  }, [user, activeConvId]);

  const startNewConv = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const id = await ensureSupportConversation(user);
      setActiveConvId(id);
    } catch (err) {
      console.error('Failed to create conversation', err);
      setError('فشل إنشاء المحادثة. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!user || !activeConvId) return;
    setTypingStatus(activeConvId, user.uid, user.name || '', isTyping);
    if (isTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTypingStatus(activeConvId, user.uid, user.name || '', false);
      }, 3000);
    }
  }, [user, activeConvId]);

  const deleteMsg = useCallback(async (msgId: string) => {
    if (!user) return;
    await deleteSupportMessage(msgId, user.uid);
  }, [user]);

  const editMsg = useCallback(async (msgId: string, content: string) => {
    if (!user) return;
    await editSupportMessage(msgId, user.uid, content);
  }, [user]);

  const loadMore = useCallback(() => {
    setHasMore(false);
  }, []);

  return {
    conversations, activeConvId, messages, loading, error, sending, typingUsers,
    activeConversation, uploadProgress,
    setActiveConv: setActiveConvId, sendMessage: sendMsg, startNewConversation: startNewConv,
    setTyping, deleteMessage: deleteMsg, editMessage: editMsg, loadMore, hasMore,
  };
}
