import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { subscribeToSupportConversations } from '../firebase/support';
import type { Conversation } from '../types';
import { showToast } from '../components/ui/Toast';

interface NotificationPopup {
  id: string;
  customerName: string;
  customerPhoto?: string;
  message: string;
  conversationId: string;
  time: string;
}

// Module-level Map: persists across re-mounts so first-message detection works
const notifiedConversations = new Map<string, string>();

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export function useNotifications(onNewMessage?: (popup: NotificationPopup) => void) {
  const { user } = useAuth();
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));

  const showBrowserNotification = useCallback((title: string, body: string, link: string) => {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(title, { body, icon: '/favicon.ico' });
      n.onclick = () => { window.focus(); window.location.href = link; };
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || !user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (!isAdmin || !user) return;

    const unsub = subscribeToSupportConversations(user.uid, true, (conversations: Conversation[]) => {
      conversations.forEach(conv => {
        const currentTime = conv.lastMessageTime;
        const knownTime = notifiedConversations.get(conv.id);
        if (!currentTime) return;

        // Skip own messages
        if (conv.lastMessageSenderId === user.uid) {
          if (!knownTime) notifiedConversations.set(conv.id, currentTime);
          return;
        }

        const isNew = !knownTime;
        const isUpdated = knownTime !== currentTime;

        if (isNew || isUpdated) {
          notifiedConversations.set(conv.id, currentTime);
          if (conv.lastMessage && conv.lastMessageSenderId !== user.uid) {
            triggerNotification(conv);
          }
        }
      });
    });

    return () => unsub();
  }, [isAdmin, user, showBrowserNotification, onNewMessage]);

  function triggerNotification(conv: Conversation) {
    if (!user) return;
    const customerName = conv.name || 'مستخدم';
    const msg = conv.lastMessage || 'رسالة جديدة';
    const preview = msg.length > 60 ? msg.substring(0, 57) + '…' : msg;

    if (onNewMessage) {
      onNewMessage({
        id: conv.id,
        customerName,
        customerPhoto: conv.customerAvatar || undefined,
        message: preview,
        conversationId: conv.id,
        time: formatTime(conv.lastMessageTime || conv.updatedAt),
      });
    }

    showToast(`رسالة من ${customerName}: ${preview}`, 'info');
    showBrowserNotification(customerName, preview, `/support?conv=${conv.id}`);
  }
}
