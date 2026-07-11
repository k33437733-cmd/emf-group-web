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
      maxWidth: '460px',
      margin: '60px auto',
      padding: '0 24px',
      direction: 'rtl',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }} className="animate-fade">
      <div 
        className="glass-card" 
        style={{ 
          padding: '44px 36px', 
          width: '100%', 
          position: 'relative', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Glow effect inside card */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(30px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} />

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '14px', direction: 'ltr' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.5px' }}>EMF</span>
            <span style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900, fontSize: '1.5rem',
            }}>GROUP</span>
          </div>
          
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            {!showForgot ? (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد') : 'استعادة كلمة المرور'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {!showForgot 
              ? (isLogin ? 'أهلاً بك في البوابة الإلكترونية لشركة EMF Group' : 'انضم لفريق عمل وعملاء EMF Group') 
              : 'أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور'}
          </p>
        </div>

        {/* Toggle between states */}
        {!showForgot ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingRight: '46px', background: 'rgba(0,0,0,0.15)' }}
                    placeholder="أدخل اسمك الثلاثي"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                  <User size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingRight: '46px', background: 'rgba(0,0,0,0.15)' }}
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingRight: '46px', background: 'rgba(0,0,0,0.15)' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
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
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'color 0.2s',
                  }}
                  className="forgot-pass-btn"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px 16px', marginTop: '8px', fontSize: '0.92rem' }}
            >
              {loading ? (
                <>جاري التحميل...</>
              ) : (
                <>{isLogin ? 'دخول للبوابة' : 'إنشاء الحساب الآن'}</>
              )}
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '18px'
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
                  marginRight: '6px',
                  transition: 'color 0.2s',
                }}
                className="toggle-auth-state-btn"
              >
                {isLogin ? 'سجل حساب جديد' : 'سجل دخولك'}
              </button>
            </div>
          </form>
        ) : (
          /* Forgot Password Interface */
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingRight: '46px', background: 'rgba(0,0,0,0.15)' }}
                  placeholder="email@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
                <Mail size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flexGrow: 1, padding: '12px' }}
              >
                إرسال الرابط
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="btn btn-secondary"
                style={{ flexGrow: 1, padding: '12px' }}
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
      
      <style>{`
        .forgot-pass-btn:hover {
          color: var(--text-primary) !important;
        }
        .toggle-auth-state-btn:hover {
          color: #60a5fa !important;
        }
      `}</style>
    </div>
  );
}
