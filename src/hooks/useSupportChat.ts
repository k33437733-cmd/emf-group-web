import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { checkRateLimit } from '../lib/rateLimit';
import { sanitizeText, validateMessageContent } from '../lib/sanitize';
import {
  ensureSupportConversation, subscribeToSupportConversations,
  subscribeToMessages, sendSupportMessage, markConversationRead,
  setTypingStatus, deleteSupportMessage, editSupportMessage,
  uploadAttachment, subscribeTypingStatus, broadcastAllConversationsToAdmins,
  subscribeUnreadSupportCount,
} from '../firebase/support';
import type { Conversation, ChatMessage } from '../types';
import type { FileUploadItem } from '../firebase/support';

interface UploadTrack {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

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
  uploadTracks: UploadTrack[];
  unreadCount: number;
  setActiveConv: (id: string | null) => void;
  sendMessage: (content: string, type?: ChatMessage['type'], files?: File[]) => Promise<void>;
  startNewConversation: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  deleteMessage: (msgId: string) => Promise<void>;
  editMessage: (msgId: string, content: string) => Promise<void>;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  replyToMsg: ChatMessage | null;
  setReplyTo: (msg: ChatMessage | null) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  sendReply: (content: string) => Promise<void>;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploadTracks, setUploadTracks] = useState<UploadTrack[]>([]);
  const uploadHandlesRef = useRef<Map<string, { cancel: () => void; file: File }>>(new Map());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));
  const broadcastDoneRef = useRef(false);

  const activeConversation = conversations.find(c => c.id === activeConvId) || null;

  // Broadcast to admins on mount (ensures new admins are added to all conversations)
  useEffect(() => {
    if (!user || !isAdmin || broadcastDoneRef.current) return;
    broadcastDoneRef.current = true;
    broadcastAllConversationsToAdmins().catch(err =>
      console.error('Failed to broadcast conversations to admins', err)
    );
  }, [user, isAdmin]);

  // Subscribe to unread count
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUnreadSupportCount(user.uid, setUnreadCount);
    return () => unsub();
  }, [user]);

  // Subscribe to conversations list
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
    setHasMore(true);
    setOldestCursor(null);

    const unsub = subscribeToMessages(
      activeConvId,
      (msgs) => {
        if (cancelled) return;
        setMessages(msgs);
        if (msgs.length > 0) {
          setOldestCursor(msgs[0].createdAt);
        }
      },
      (err) => {
        if (cancelled) return;
        console.error('Failed to load messages', err);
        setError('فشل تحميل الرسائل');
      }
    );

    if (user) markConversationRead(activeConvId, user.uid);

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

  const sendMsg = useCallback(async (content: string, _type: ChatMessage['type'] = 'text', files?: File[]) => {
    if (!user || !activeConvId || (!content.trim() && (!files || files.length === 0))) return;
    const key = `send:${user.uid}`;
    if (!checkRateLimit(key, { maxRequests: 10, windowMs: 1000 })) return;
    const validContent = validateMessageContent(content);
    if (!validContent.valid) return;
    const sanitized = sanitizeText(content.trim());
    setSending(true);

    try {
      if (files && files.length > 0) {
        // Prepare upload items
        const items: FileUploadItem[] = files.map(f => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          progress: 0,
          status: 'pending' as const,
        }));

        // Track them
        setUploadTracks(items.map(i => ({ id: i.id, fileName: i.file.name, progress: 0, status: 'uploading' })));

        // Store handles for cancel
        const handleMap = new Map<string, { cancel: () => void; file: File }>();
        const controllers = new Map<string, AbortController>();

        // Upload each file individually with progress
        const uploadOne = async (item: FileUploadItem): Promise<{ id: string; url: string; file: File }> => {
          const controller = new AbortController();
          controllers.set(item.id, controller);
          const handle = uploadAttachment(item.file, (pct) => {
            setUploadTracks(prev => prev.map(t => t.id === item.id ? { ...t, progress: pct } : t));
          }, controller.signal);
          handleMap.set(item.id, { cancel: handle.cancel, file: item.file });
          try {
            const url = await handle.promise;
            setUploadTracks(prev => prev.map(t => t.id === item.id ? { ...t, progress: 100, status: 'done' } : t));
            return { id: item.id, url, file: item.file };
          } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'storage/canceled') {
              setUploadTracks(prev => prev.map(t => t.id === item.id ? { ...t, status: 'error', error: 'ملغي' } : t));
            } else {
              setUploadTracks(prev => prev.map(t => t.id === item.id ? { ...t, status: 'error', error: 'فشل الرفع' } : t));
            }
            controllers.delete(item.id);
            handleMap.delete(item.id);
            throw err;
          }
        };

        uploadHandlesRef.current = handleMap;

        // Upload all files in parallel
        const results = await Promise.allSettled(items.map(uploadOne));

        // Send successfully uploaded files as messages
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { url, file } = result.value;
            const msgType = file.type.startsWith('image/') ? 'image' as const : 'file' as const;
            await sendSupportMessage(activeConvId, user, '', msgType, {
              fileUrl: url, fileName: file.name, fileSize: file.size, fileType: file.type,
            });
          }
        }

        // If there was text too, send it as a separate message
        if (sanitized) {
          await sendSupportMessage(activeConvId, user, sanitized, 'text', undefined);
        }

        controllers.clear();
        handleMap.clear();
      } else {
        // Text-only message
        await sendSupportMessage(activeConvId, user, sanitized, 'text', undefined);
      }

      setTypingStatus(activeConvId, user.uid, user.name || '', false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    } catch (e) {
      console.error('Send failed', e);
    } finally {
      setSending(false);
      setUploadProgress(0);
      setTimeout(() => setUploadTracks([]), 2000);
    }
  }, [user, activeConvId]);

  const cancelUpload = useCallback((id: string) => {
    const handle = uploadHandlesRef.current.get(id);
    if (handle) handle.cancel();
  }, []);

  const retryUpload = useCallback((id: string) => {
    const handle = uploadHandlesRef.current.get(id);
    if (!handle) return;
    // Re-trigger sendMsg with just this file
    sendMsg('', 'file', [handle.file]);
  }, [sendMsg]);

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

  const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!activeConvId || !user) return;
    const { addReaction } = await import('../firebase/support');
    await addReaction(messageId, activeConvId, user.uid, emoji);
  }, [activeConvId, user]);

  const handleSendReply = useCallback(async (content: string) => {
    if (!user || !activeConvId || !replyToMsg || !content.trim()) return;
    const sanitized = sanitizeText(content.trim());
    await sendSupportMessage(activeConvId, user, sanitized, 'text', { replyTo: replyToMsg.id });
    setReplyToMsg(null);
  }, [user, activeConvId, replyToMsg]);

  const loadMore = useCallback(async () => {
    if (!activeConvId || !oldestCursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { getSupportMessagePage } = await import('../firebase/support');
      const result = await getSupportMessagePage(activeConvId, oldestCursor, 40);
      if (result.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newOnes = result.messages.filter((m: any) => !existingIds.has(m.id));
          return [...newOnes, ...prev];
        });
        setHasMore(result.hasMore);
        setOldestCursor(result.oldestCursor);
      }
      setHasMore(more);
    } catch (err) {
      console.error('loadMore failed', err);
    } finally {
      setLoadingMore(false);
    }
  }, [activeConvId, oldestCursor, loadingMore, hasMore]);

  return {
    conversations, activeConvId, messages, loading, error, sending, typingUsers,
    activeConversation, uploadProgress, uploadTracks, unreadCount, loadingMore,
    setActiveConv: setActiveConvId, sendMessage: sendMsg, startNewConversation: startNewConv,
    setTyping, deleteMessage: deleteMsg, editMessage: editMsg, loadMore, hasMore,
    cancelUpload, retryUpload,
    replyToMsg, setReplyTo: setReplyToMsg, addReaction: handleAddReaction, sendReply: handleSendReply,
  };
}
