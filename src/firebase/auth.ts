import { 
  signOut as fbSignOut, 
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { getRoleByEmail } from '../constants/roles';
import type { UserProfile } from '../types';

/**
 * Get or create user profile document in Firestore
 */
export async function getOrCreateUserProfile(user: FirebaseUser, defaultName?: string): Promise<UserProfile> {
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Update lastLogin
    await updateDoc(docRef, {
      lastLogin: new Date().toISOString()
    });
    return {
      uid: user.uid,
      name: data.name || user.displayName || user.email?.split('@')[0] || 'مستخدم',
      email: data.email || user.email || '',
      role: data.role || 'user',
      status: data.status || 'active',
      onlineStatus: data.onlineStatus || 'offline',
      lastSeen: data.lastSeen || new Date().toISOString(),
      fcmTokens: data.fcmTokens || [],
      createdAt: data.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: data.preferences || { language: 'ar', notifications: { email: true, push: true, sound: true } },
      metadata: data.metadata || { loginCount: 0, totalMessages: 0 }
    };
  } else {
    // Create new profile
    const email = user.email || '';
    const role = getRoleByEmail(email);
    const name = defaultName || user.displayName || email.split('@')[0] || 'مستخدم جديد';
    
    const newProfile: UserProfile = {
      uid: user.uid,
      name,
      email,
      role,
      status: 'active',
      onlineStatus: 'offline',
      lastSeen: new Date().toISOString(),
      fcmTokens: [],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: { language: 'ar', notifications: { email: true, push: true, sound: true } },
      metadata: { loginCount: 0, totalMessages: 0 }
    };

    await setDoc(docRef, newProfile);
    return newProfile;
  }
}

/**
 * Listen to auth state changes
 */
export function subscribeToAuth(callback: (userProfile: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await getOrCreateUserProfile(user);
        if (profile.status === 'blocked') {
          await fbSignOut(auth);
          callback(null);
        } else {
          callback(profile);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}
