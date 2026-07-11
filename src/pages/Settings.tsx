import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { updateUser } from '../firebase/db/users';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase/config';
import { Sun, Moon, Monitor, Palette, Shield, User, Bell, Camera, Check, X, Loader2, Save, Eye, EyeOff, Clock, Wifi } from 'lucide-react';

type Tab = 'appearance' | 'profile' | 'security' | 'notifications';

const tabs: { key: Tab; label: string; icon: typeof Sun }[] = [
  { key: 'appearance', label: 'المظهر', icon: Palette },
  { key: 'profile', label: 'الملف الشخصي', icon: User },
  { key: 'notifications', label: 'الإشعارات', icon: Bell },
  { key: 'security', label: 'الأمان', icon: Shield },
];

const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; desc: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'فاتح', desc: 'واجهة مشرقة مناسبة للإضاءة القوية', icon: Sun },
  { value: 'dark', label: 'داكن', desc: 'واجهة مريحة للعين في الإضاءة المنخفضة', icon: Moon },
  { value: 'system', label: 'النظام', desc: 'تطابق إعدادات جهازك تلقائياً', icon: Monitor },
];

const accentOptions: { value: string; label: string }[] = [
  { value: 'blue', label: 'أزرق' }, { value: 'purple', label: 'أرجواني' },
  { value: 'pink', label: 'زهري' }, { value: 'red', label: 'أحمر' },
  { value: 'orange', label: 'برتقالي' }, { value: 'gold', label: 'ذهبي' },
  { value: 'green', label: 'أخضر' }, { value: 'cyan', label: 'سيان' },
  { value: 'dark', label: 'داكن' }, { value: 'navy', label: 'كحلي' },
];

const LANGUAGES = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

const ONLINE_STATUSES: { value: 'online' | 'away' | 'offline'; label: string; icon: any }[] = [
  { value: 'online', label: 'متصل', icon: Wifi },
  { value: 'away', label: 'غير متواجد', icon: Clock },
  { value: 'offline', label: 'غير متصل', icon: X },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode, appliedTheme, accent, setMode, setAccent } = useTheme();
  const { user } = useAuth();
  const activeTab: Tab = (searchParams.get('tab') as Tab) || 'appearance';
  const switchTab = (tab: Tab) => setSearchParams(tab === 'appearance' ? {} : { tab });

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [lang, setLang] = useState(user?.preferences?.language || 'ar');
  const [onlineStatus, setOnlineStatus] = useState(user?.onlineStatus || 'online');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notifEmail, setNotifEmail] = useState(user?.preferences?.notifications?.email ?? true);
  const [notifPush, setNotifPush] = useState(user?.preferences?.notifications?.push ?? true);
  const [notifSound, setNotifSound] = useState(user?.preferences?.notifications?.sound ?? true);

  // Security state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSaved, setPassSaved] = useState(false);

  useEffect(() => { if (user) { setName(user.name); setBio(user.bio || ''); setPhone(user.phone || ''); setLang(user.preferences?.language || 'ar'); setOnlineStatus(user.onlineStatus || 'online'); setNotifEmail(user.preferences?.notifications?.email ?? true); setNotifPush(user.preferences?.notifications?.push ?? true); setNotifSound(user.preferences?.notifications?.sound ?? true); } }, [user]);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    const storage = getStorage(app);
    const path = `avatars/${user?.uid}_${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, file);
    return new Promise((resolve, reject) => {
      task.on('state_changed', snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => getDownloadURL(ref).then(resolve).catch(reject));
    });
  }, [user]);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true); setSaved(false);
    try {
      let avatarUrl = user.avatar;
      if (avatarFile && avatarPreview) avatarUrl = await uploadAvatar(avatarFile);
      await updateUser(user.uid, { name, bio, phone, preferences: { language: lang as 'ar' | 'en', notifications: { email: notifEmail, push: notifPush, sound: notifSound } }, onlineStatus, avatar: avatarUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error('Save failed', err); }
    finally { setSaving(false); setUploadProgress(0); }
  };

  const saveNotifications = async () => {
    if (!user) return;
    setSaving(true);
    try { await updateUser(user.uid, { preferences: { language: lang as 'ar' | 'en', notifications: { email: notifEmail, push: notifPush, sound: notifSound } } }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch {}
    finally { setSaving(false); }
  };

  const saveOnlineStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!user) return;
    setOnlineStatus(status);
    try { await updateUser(user.uid, { onlineStatus: status }); } catch {}
  };

  const changePassword = async () => {
    setPassError(''); setPassSaved(false);
    if (newPass.length < 6) { setPassError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return; }
    if (newPass !== confirmPass) { setPassError('كلمتا المرور غير متطابقتين'); return; }
    try {
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../firebase/config');
      const credential = EmailAuthProvider.credential(user?.email || '', currentPass);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPass);
      setPassSaved(true); setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setPassSaved(false), 3000);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') setPassError('كلمة المرور الحالية غير صحيحة');
      else setPassError('فشل تغيير كلمة المرور. حاول مرة أخرى.');
    }
  };

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 'min(900px, calc(100vw - 32px))', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0 }}>الإعدادات</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>خصص تجربتك وتحكم في إعدادات حسابك</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--border-color)', paddingBottom: 0, marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => switchTab(tab.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-5)', border: 'none', background: 'transparent',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontSize: 'var(--text-sm)', fontWeight: isActive ? 'var(--fw-bold)' : 'var(--fw-medium)',
              cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
              transition: 'all var(--transition-fast)', marginBottom: -1, whiteSpace: 'nowrap',
            }}><tab.icon size={16} /> {tab.label}</button>
          );
        })}
      </div>

      {/* ═══ APPEARANCE TAB ═══ */}
      {activeTab === 'appearance' && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-1) 0' }}>المظهر</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--space-5) 0' }}>
              {mode === 'system' ? `يتبع النظام حالياً: ${appliedTheme === 'dark' ? 'داكن' : 'فاتح'}` : `الوضع الحالي: ${mode === 'dark' ? 'داكن' : 'فاتح'}`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 'var(--space-4)' }}>
              {themeOptions.map(opt => {
                const selected = mode === opt.value;
                return (
                  <button key={opt.value} onClick={() => setMode(opt.value)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-6) var(--space-4)', borderRadius: 'var(--radius-lg)',
                    border: selected ? '2px solid var(--accent-blue)' : '2px solid var(--border-color)',
                    background: selected ? 'var(--sidebar-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-base)',
                    boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                  }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? 'var(--accent-blue)' : 'var(--badge-bg)', color: selected ? '#fff' : 'var(--text-secondary)' }}>
                      <opt.icon size={22} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-4) 0' }}>ألوان لوحة التحكم</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px, 100%), 1fr))', gap: 'var(--space-3)' }}>
                {accentOptions.map(opt => (
                  <button key={opt.value} onClick={() => setAccent(opt.value as any)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                    border: accent === opt.value ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    background: accent === opt.value ? 'var(--sidebar-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer', minHeight: '60px',
                  }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: `var(--accent-${opt.value})`, boxShadow: '0 0 0 1px var(--border-color)' }} />
                    <span style={{ marginRight: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROFILE TAB ═══ */}
      {activeTab === 'profile' && (
        <div>
          {/* Avatar + Name */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-5) 0' }}>الصورة الشخصية</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-color)' }}>
                  {avatarPreview ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} style={{ color: 'var(--text-tertiary)' }} />}
                </div>
                <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', border: 'none', color: '#050816', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={14} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
              </div>
              {uploadProgress > 0 && <div style={{ width: 100 }}><div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 2, transition: 'width 0.2s' }} /></div></div>}
            </div>
          </div>

          {/* Personal info */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-5) 0' }}>المعلومات الشخصية</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Field label="الاسم" value={name} onChange={setName} />
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>نبذة عني</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="اكتب نبذة قصيرة عن نفسك..." rows={3} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <Field label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" dir="ltr" />
              <Field label="البريد الإلكتروني" value={user?.email || ''} disabled />
            </div>
          </div>

          {/* Language & Status */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-5) 0' }}>التفضيلات</h2>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>اللغة</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {LANGUAGES.map(l => (
                  <button key={l.value} onClick={() => setLang(l.value as 'ar' | 'en')} style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', border: lang === l.value ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: lang === l.value ? 'var(--sidebar-active)' : 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: lang === l.value ? 700 : 400, fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>حالة الاتصال</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {ONLINE_STATUSES.map(s => (
                  <button key={s.value} onClick={() => saveOnlineStatus(s.value)} style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', border: onlineStatus === s.value ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: onlineStatus === s.value ? 'var(--sidebar-active)' : 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: 'var(--text-primary)', fontWeight: onlineStatus === s.value ? 700 : 400, fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                    <s.icon size={14} /> {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            {saved && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16A34A', fontSize: 'var(--text-sm)' }}><Check size={14} /> تم الحفظ</span>}
            <button onClick={saveProfile} disabled={saving} style={{
              background: saving ? 'var(--border-color)' : 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-lg)',
              color: saving ? 'var(--text-tertiary)' : '#050816', cursor: saving ? 'not-allowed' : 'pointer',
              padding: 'var(--space-3) var(--space-6)', fontWeight: 600, fontSize: 'var(--text-sm)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: 'inherit',
            }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={16} />}
              حفظ التغييرات
            </button>
          </div>
        </div>
      )}

      {/* ═══ NOTIFICATIONS TAB ═══ */}
      {activeTab === 'notifications' && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-5) 0' }}>إعدادات الإشعارات</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <ToggleRow icon={Bell} label="الإشعارات عبر البريد الإلكتروني" desc="استلام إشعارات على بريدك الإلكتروني" checked={notifEmail} onChange={setNotifEmail} />
              <ToggleRow icon={Bell} label="الإشعارات الفورية" desc="استلام إشعارات داخل التطبيق" checked={notifPush} onChange={setNotifPush} />
              <ToggleRow icon={Bell} label="صوت الإشعارات" desc="تشغيل صوت عند وصول إشعار جديد" checked={notifSound} onChange={setNotifSound} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
              {saved && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16A34A', fontSize: 'var(--text-sm)', marginLeft: 'var(--space-3)' }}><Check size={14} /> تم الحفظ</span>}
              <button onClick={saveNotifications} disabled={saving} style={{
                background: saving ? 'var(--border-color)' : 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-lg)',
                color: saving ? 'var(--text-tertiary)' : '#050816', cursor: saving ? 'not-allowed' : 'pointer',
                padding: 'var(--space-3) var(--space-6)', fontWeight: 600, fontSize: 'var(--text-sm)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: 'inherit',
              }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={16} />}
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECURITY TAB ═══ */}
      {activeTab === 'security' && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: '0 0 var(--space-5) 0' }}>تغيير كلمة المرور</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 400 }}>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>كلمة المرور الحالية</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }} />
                  <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>كلمة المرور الجديدة</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>تأكيد كلمة المرور الجديدة</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }} />
              </div>
              {passError && <p style={{ color: '#EF4444', fontSize: 'var(--text-sm)', margin: 0 }}>{passError}</p>}
              {passSaved && <p style={{ color: '#16A34A', fontSize: 'var(--text-sm)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> تم تغيير كلمة المرور بنجاح</p>}
              <button onClick={changePassword} disabled={!currentPass || !newPass || !confirmPass} style={{
                background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-lg)',
                color: '#050816', cursor: (!currentPass || !newPass || !confirmPass) ? 'not-allowed' : 'pointer',
                padding: 'var(--space-3) var(--space-6)', fontWeight: 600, fontSize: 'var(--text-sm)',
                fontFamily: 'inherit', alignSelf: 'flex-start',
              }}>
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', dir, disabled }: { label: string; value: string; onChange?: (v: string) => void; type?: string; dir?: string; disabled?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled} dir={dir}
        style={{ width: '100%', background: disabled ? 'var(--bg-secondary)' : 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', opacity: disabled ? 0.6 : 1 }} />
    </div>
  );
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange }: { icon: any; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: checked ? 'rgba(0,210,255,0.1)' : 'var(--badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: checked ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
        background: checked ? 'var(--color-primary)' : 'var(--border-color)', transition: 'background 0.2s',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
          left: checked ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}
