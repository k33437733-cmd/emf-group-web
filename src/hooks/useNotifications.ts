import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { subscribeToSupportConversations } from '../firebase/support';
import type { Conversation } from '../types';
import { showToast } from '../components/ui/Toast';

interface NotificationPopup {
  id: string;
  customerName: string;
  message: string;
  conversationId: string;
}

export function useNotifications(onNewMessage?: (popup: NotificationPopup) => void) {
  const { user } = useAuth();
  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super_admin'));
  const prevConversationsRef = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  const playSound = useCallback(() => {
    try {
      if (audioRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
      }
    } catch {}
  }, []);

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
        const lastId = prevConversationsRef.current.get(conv.id);
        const currentTime = conv.lastMessageTime;
        if (lastId && lastId !== currentTime && conv.lastMessageSenderId !== user.uid) {
          playSound();
          const customerName = conv.name || 'مستخدم';
          const msg = conv.lastMessage || 'رسالة جديدة';

          if (onNewMessage) {
            onNewMessage({
              id: conv.id,
              customerName,
              message: msg,
              conversationId: conv.id,
            });
          }

          showToast(`رسالة من ${customerName}: ${msg}`, 'info');
          showBrowserNotification(customerName, msg, '/support');
        }

        if (!lastId) {
          prevConversationsRef.current.set(conv.id, conv.lastMessageTime);
        } else if (lastId !== currentTime) {
          prevConversationsRef.current.set(conv.id, conv.lastMessageTime);
        }
      });
    });

    return () => unsub();
  }, [isAdmin, user, playSound, showBrowserNotification, onNewMessage]);
}
