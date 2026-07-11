import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Conversation } from '../types';
import * as supportFirebase from '../firebase/support';
import * as convFirebase from '../firebase/db/conversations';

export interface ConversationFilter {
  type?: string;
  status?: string;
  assignedTo?: string;
  unreadOnly?: boolean;
  search?: string;
}

export const conversationRepository = {
  subscribeAll(userUid: string, isAdmin: boolean, callback: (list: Conversation[]) => void, onError?: (err: Error) => void) {
    return supportFirebase.subscribeToSupportConversations(userUid, isAdmin, callback, onError);
  },

  subscribeAdminDMs(userUid: string, callback: (list: Conversation[]) => void) {
    return convFirebase.subscribeToConversations(userUid, 'admin_dm', callback);
  },

  subscribeAdminGroups(userUid: string, callback: (list: Conversation[]) => void) {
    return convFirebase.subscribeToConversations(userUid, 'admin_group', callback);
  },

  subscribeGroups(callback: (list: Conversation[]) => void) {
    return convFirebase.subscribeToAllGroups(callback);
  },

  subscribeMember(userUid: string, callback: (list: Conversation[]) => void) {
    return convFirebase.subscribeToConversations(userUid, 'agent_member', callback);
  },

  subscribeSupport(userUid: string, callback: (list: Conversation[]) => void) {
    return convFirebase.subscribeToSupportConversations(userUid, callback);
  },

  subscribeDepartments(userUid: string, callback: (list: Conversation[]) => void) {
    return convFirebase.subscribeToConversations(userUid, 'department', callback);
  },

  async getById(id: string): Promise<Conversation | null> {
    try {
      const snap = await getDoc(doc(db, 'support_conversations', id));
      return snap.exists() ? (snap.data() as Conversation) : null;
    } catch {
      return null;
    }
  },

  async ensureSupport(customer: any): Promise<string> {
    return supportFirebase.ensureSupportConversation(customer);
  },

  async markRead(conversationId: string, userUid: string) {
    return supportFirebase.markConversationRead(conversationId, userUid);
  },

  async mute(conversationId: string) { return supportFirebase.muteConversation(conversationId); },
  async unmute(conversationId: string) { return supportFirebase.unmuteConversation(conversationId); },
  async toggleImportant(conversationId: string, important: boolean) { return supportFirebase.toggleImportant(conversationId, important); },
  async setTags(conversationId: string, tags: string[]) { return supportFirebase.setConversationTags(conversationId, tags); },
  async archive(conversationId: string) { return supportFirebase.archiveConversation(conversationId); },
  async unarchive(conversationId: string) { return supportFirebase.unarchiveConversation(conversationId); },
  async transfer(conversationId: string, newUid: string, newName: string, by: string) {
    return supportFirebase.transferConversation(conversationId, newUid, newName, by);
  },
};
