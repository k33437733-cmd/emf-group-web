import type { ChatMessage, UserProfile } from '../types';
import * as supportFirebase from '../firebase/support';
import * as msgFirebase from '../firebase/db/messages';

export const messageRepository = {
  subscribe(conversationId: string, callback: (msgs: ChatMessage[]) => void, onError?: (err: Error) => void) {
    return supportFirebase.subscribeToMessages(conversationId, callback, onError);
  },

  subscribeLatest(conversationId: string, callback: (msgs: ChatMessage[]) => void) {
    return msgFirebase.subscribeToLatestMessages(conversationId, callback);
  },

  async send(conversationId: string, sender: UserProfile, content: string, type: ChatMessage['type'] = 'text', opts?: any) {
    return supportFirebase.sendSupportMessage(conversationId, sender, content, type, opts);
  },

  async delete(messageId: string, senderId: string) {
    return supportFirebase.deleteSupportMessage(messageId, senderId);
  },

  async edit(messageId: string, senderId: string, content: string) {
    return supportFirebase.editSupportMessage(messageId, senderId, content);
  },

  async getPage(conversationId: string, beforeCursor?: string, pageSize = 40) {
    return supportFirebase.getSupportMessagePage(conversationId, beforeCursor, pageSize);
  },

  async addReaction(messageId: string, conversationId: string, userId: string, emoji: string) {
    return supportFirebase.addReaction(messageId, conversationId, userId, emoji);
  },

  async getById(conversationId: string, messageId: string): Promise<ChatMessage | null> {
    return supportFirebase.getMessage(conversationId, messageId);
  },

  async forward(fromConvId: string, toConvId: string, message: ChatMessage, by: string) {
    return supportFirebase.forwardMessage(fromConvId, toConvId, message, by);
  },
};
