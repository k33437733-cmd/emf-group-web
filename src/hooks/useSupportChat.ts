import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  getOrCreateSupportConversation, subscribeToSupportConversations,
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
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));

  const activeConversation = conversations.find(c => c.id === activeConvId) || null;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSupportConversations(user.uid, isAdmin, (list) => {
      setConversations(list);
      setLoading(false);
      if (!activeConvId && list.length > 0) setActiveConvId(list[0].id);
    });
    return () => unsub();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const unsub = subscribeToMessages(activeConvId, setMessages);
    markConversationRead(activeConvId, user?.uid || '');
    return () => unsub();
  }, [activeConvId, user?.uid]);

  useEffect(() => {
    if (!activeConvId) return;
    const unsub = subscribeTypingStatus(activeConvId, (data) => {
      if (!data || data.userId === user?.uid) { setTypingUsers([]); return; }
      setTypingUsers(data.isTyping ? [{ userId: data.userId, userName: data.userName }] : []);
    });
    return () => unsub();
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
    try {
      const id = await getOrCreateSupportConversation(user);
      setActiveConvId(id);
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
    conversations, activeConvId, messages, loading, sending, typingUsers,
    activeConversation, uploadProgress,
    setActiveConv: setActiveConvId, sendMessage: sendMsg, startNewConversation: startNewConv,
    setTyping, deleteMessage: deleteMsg, editMessage: editMsg, loadMore, hasMore,
  };
}
