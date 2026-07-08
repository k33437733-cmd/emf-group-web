import { useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../constants/collections';
import { createMessage } from '../firebase/db/messages';
import { updateLastMessage, getConversationById } from '../firebase/db/conversations';
import { generateBotResponse, clearConversationHistory } from '../lib/chatbot';
import type { ChatMessage } from '../types/chat';
import type { UserProfile } from '../types/auth';

const BOT_USER: UserProfile = {
  uid: 'bot',
  name: 'EMF Support Bot',
  email: 'bot@emf-group.com',
  role: 'agent',
  status: 'active',
  onlineStatus: 'online',
  lastSeen: new Date().toISOString(),
  fcmTokens: [],
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  preferences: { language: 'ar', notifications: { email: false, push: false, sound: false } },
  metadata: { loginCount: 0, totalMessages: 0 },
};

interface BotSession {
  conversationId: string;
  ticketId?: string;
  botRepliedCount: number;
  lastBotResponseAt: string | null;
  stoppedAt: string | null;
  stoppedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

function sessionRef(conversationId: string) {
  return doc(db, COLLECTIONS.BOT_SESSIONS, conversationId);
}

async function getBotSession(conversationId: string): Promise<BotSession | null> {
  const snap = await getDoc(sessionRef(conversationId));
  if (!snap.exists()) return null;
  return snap.data() as BotSession;
}

async function ensureBotSession(conversationId: string, ticketId?: string): Promise<BotSession> {
  const existing = await getBotSession(conversationId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const session: BotSession = {
    conversationId,
    ticketId,
    botRepliedCount: 0,
    lastBotResponseAt: null,
    stoppedAt: null,
    stoppedByUserId: null,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(sessionRef(conversationId), session);
  return session;
}

async function incrementBotReply(conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(sessionRef(conversationId), {
    botRepliedCount: increment(1),
    lastBotResponseAt: now,
    updatedAt: now,
  });
}

async function stopBotSession(conversationId: string, stoppedByUserId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(sessionRef(conversationId), {
    stoppedAt: now,
    stoppedByUserId: stoppedByUserId,
    updatedAt: now,
  });
  clearConversationHistory(conversationId);
}

const BOT_DELAYS = [1800, 2200, 1500, 2600, 2000];

export function useChatBot(
  conversationId: string | null,
  messages: ChatMessage[],
  currentUser: UserProfile | null,
  ticketId?: string,
) {
  const initialized = useRef(false);
  const pendingBotRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUser || currentUser.uid === 'bot') return;

    const run = async () => {
      const session = await ensureBotSession(conversationId, ticketId);

      if (session.stoppedAt) return;

      const agentMessages = messages.filter(
        m => m.senderId !== currentUser.uid && m.senderId !== 'bot',
      );
      const userMessages = messages.filter(m => m.senderId === currentUser.uid);
      const botMessages = messages.filter(m => m.senderId === 'bot');

      if (agentMessages.length > 0) {
        const lastAgent = agentMessages[agentMessages.length - 1];
        if (!session.stoppedAt) {
          await stopBotSession(conversationId, lastAgent.senderId);
        }
        return;
      }

      if (pendingBotRef.current) return;

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;
      if (lastMessage.senderId !== currentUser.uid) return;
      if (lastMessage.senderId === 'bot') return;

      const trimmed = lastMessage.content?.trim() || '';
      if (!trimmed && !lastMessage.imageUrls?.length) return;

      pendingBotRef.current = true;

      const isFirstUserMsg = userMessages.length <= 1 && botMessages.length === 0;
      const isSubsequent = botMessages.length > 0 && agentMessages.length === 0;

      if (isFirstUserMsg || isSubsequent) {
        const response = generateBotResponse(trimmed, conversationId, !isFirstUserMsg);
        const delayIndex = Math.min(session.botRepliedCount, BOT_DELAYS.length - 1);
        const delay = BOT_DELAYS[delayIndex];

        timerRef.current = setTimeout(async () => {
          try {
            await createMessage({
              conversationId,
              senderId:   BOT_USER.uid,
              senderName: BOT_USER.name,
              senderRole: BOT_USER.role,
              senderType: 'bot',
              content:    response.message,
              type:       'text',
              isInternal: false,
            });
            const conv = await getConversationById(conversationId);
            if (conv) {
              const preview = response.message.length > 60
                ? response.message.slice(0, 57) + '...'
                : response.message;
              await updateLastMessage(conversationId, preview, BOT_USER.uid);
            }
            await incrementBotReply(conversationId);
          } catch {
          } finally {
            pendingBotRef.current = false;
          }
        }, delay);
      } else {
        pendingBotRef.current = false;
      }
    };

    if (!initialized.current) {
      initialized.current = true;
      setTimeout(run, 500);
    } else {
      run();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [conversationId, messages, currentUser, ticketId]);

  useEffect(() => {
    return () => {
      initialized.current = false;
      pendingBotRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
