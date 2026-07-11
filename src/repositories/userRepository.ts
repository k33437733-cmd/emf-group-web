import type { UserProfile } from '../types';
import * as userDb from '../firebase/db/users';

export const userRepository = {
  async listAgents(): Promise<UserProfile[]> {
    return userDb.listAgents();
  },

  async listMembers(): Promise<UserProfile[]> {
    return userDb.listRegularUsers();
  },

  async getById(uid: string): Promise<UserProfile | null> {
    try {
      const { doc, getDoc, db } = await import('../firebase/config');
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch {
      return null;
    }
  },

  async update(uid: string, data: Partial<UserProfile>) {
    return userDb.updateUser(uid, data);
  },

  async createProfile(uid: string, email: string, name: string, role: string) {
    return userDb.createUserProfile(uid, email, name, role);
  },
};
