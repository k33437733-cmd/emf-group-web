import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  subscribeToAuthState,
  signIn as serviceSignIn,
  signUp as serviceSignUp,
  signOut as serviceSignOut,
  requestPasswordReset as serviceRequestPasswordReset
} from '../services/AuthService';
import type { UserProfile } from '../types';
import { showToast } from '../components/ui/Toast';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuthState((profile) => {
      setUser(profile);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const profile = await serviceSignIn(email, pass);
      setUser(profile);
      showToast(`أهلاً بك مجدداً، ${profile.name}!`, 'success');
    } catch (err: any) {
      console.error(err);
      let msg = 'فشل تسجيل الدخول، يرجى التحقق من البيانات';
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/profile-missing'
      ) {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (err.code === 'auth/user-blocked') {
        msg = 'هذا الحساب محظور من دخول الموقع';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'تم إرسال محاولات كثيرة خاطئة، يرجى الانتظار قليلاً';
      }
      showToast(msg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const profile = await serviceSignUp(email, pass, name);
      setUser(profile);
      showToast('تم إنشاء حسابك بنجاح!', 'success');
    } catch (err: any) {
      console.error(err);
      let msg = 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً';
      if (err.code === 'auth/name-required') {
        msg = 'الاسم مطلوب لإنشاء الحساب';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'البريد الإلكتروني مستخدم بالفعل';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'صيغة البريد الإلكتروني غير صحيحة';
      } else if (err.code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة جداً، يرجى اختيار 6 أحرف على الأقل';
      }
      showToast(msg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await serviceSignOut(user);
      setUser(null);
      showToast('تم تسجيل الخروج بنجاح', 'info');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await serviceRequestPasswordReset(email);
      showToast('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
    } catch (err: any) {
      console.error(err);
      let msg = 'فشل إرسال البريد لإعادة التعيين';
      if (err.code === 'auth/user-not-found') {
        msg = 'هذا البريد غير مسجل لدينا';
      }
      showToast(msg, 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
