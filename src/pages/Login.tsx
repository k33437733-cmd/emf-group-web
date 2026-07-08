import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/ui/Toast';
import { Lock, Mail, User } from 'lucide-react';

export default function Login() {
  const { user, signIn, signUp, resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/content', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!name) {
          showToast('يرجى إدخال اسمك الكامل لتسجيل حسابك', 'warning');
          return;
        }
        await signUp(email, password, name);
      }
    } catch (err) {
      // Errors handled by useAuth
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('يرجى إدخال بريدك الإلكتروني أولاً', 'warning');
      return;
    }
    try {
      await resetPassword(resetEmail);
      setShowForgot(false);
    } catch (err) {}
  };

  return (
    <div style={{
      maxWidth: '440px',
      margin: '80px auto',
      padding: '0 24px',
      direction: 'rtl'
    }} className="animate-fade">
      <div className="glass-card" style={{ padding: '40px 32px' }}>
        
        {/* Toggle between states */}
        {!showForgot ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
                {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {isLogin ? 'أهلاً بك في البوابة الإلكترونية لشركة EMF' : 'انضم لفريق عمل وعملاء EMF Group'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">الاسم الكامل</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingRight: '44px' }}
                      placeholder="أدخل اسمك الثلاثي"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                    <User size={18} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingRight: '44px' }}
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Mail size={18} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingRight: '44px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock size={18} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {isLogin && (
                <div style={{ textAlign: 'left', marginTop: '-8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              >
                {loading ? 'جاري التحميل...' : isLogin ? 'دخول' : 'إنشاء الحساب'}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: '16px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px'
              }}>
                <span>{isLogin ? 'ليس لديك حساب بالفعل؟' : 'لديك حساب مسجل بالفعل؟'}</span>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-blue)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginRight: '6px'
                  }}
                >
                  {isLogin ? 'سجل حساب جديد' : 'سجل دخولك'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Forgot Password Interface */
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>استعادة الحساب</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingRight: '44px' }}
                    placeholder="email@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                  <Mail size={18} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flexGrow: 1, padding: '12px' }}
                >
                  إرسال
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="btn btn-secondary"
                  style={{ flexGrow: 1, padding: '12px' }}
                >
                  رجوع
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
