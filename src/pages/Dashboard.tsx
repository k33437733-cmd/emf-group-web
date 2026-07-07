import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  subscribeToStats, 
  subscribeToContents, 
  subscribeToUsers, 
  subscribeToAuditLogs,
  addContentItem,
  deleteContentItem,
  updateUserRole,
  updateUserStatus
} from '../firebase/db';
import { uploadFile, deleteFileFromStorage } from '../firebase/storage';
import type { ContentItem, UserProfile, AuditLog, UserRole, UserStatus } from '../types';
import { 
  BarChart3, Video, FolderPlus, Users, FileText, Download, Plus, Trash2,
  Settings, Loader2
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<'stats' | 'upload' | 'content' | 'users' | 'logs'>('stats');

  // Firestore Subscriptions State
  const [stats, setStats] = useState<any>({
    usersCount: 0, adminsCount: 0, videosCount: 0, appsCount: 0, filesCount: 0, totalViews: 0, totalDownloads: 0
  });

  // Content Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState<'video' | 'app' | 'other'>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isSuperAdmin = user && user.role === 'super_admin';
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Basic Auth Check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        navigate('/content', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>جاري التحقق من الحساب...</div>;

  // Subscribe to DB metrics
  useEffect(() => {
    if (!user) return;

    let statsUnsub = () => {};
    let contentUnsub = () => {};
    let usersUnsub = () => {};
    let logsUnsub = () => {};

    if (isAdmin) {
      statsUnsub = subscribeToStats((res) => setStats(res));
      contentUnsub = subscribeToContents((list) => setContents(list));
    }

    if (isSuperAdmin) {
      usersUnsub = subscribeToUsers((list) => setUsersList(list));
      logsUnsub = subscribeToAuditLogs((list) => setAuditLogs(list));
    }

    return () => {
      statsUnsub();
      contentUnsub();
      usersUnsub();
      logsUnsub();
    };
  }, [user, isAdmin, isSuperAdmin]);

  // Fallback active tab for non-admins
  useEffect(() => {
    if (user && !isAdmin) {
      setActiveTab('stats'); // For regular users, show simple stats/welcome panel
    }
  }, [user, isAdmin]);

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim() || !user) {
      showToast('يرجى كتابة عنوان وتحديد ملف للرفع', 'warning');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload file to Storage
      const downloadUrl = await uploadFile(selectedFile, uploadType, (progress) => {
        setUploadProgress(progress);
      });

      // 2. Add Content item to Firestore
      await addContentItem({
        title: uploadTitle.trim(),
        description: uploadDesc.trim(),
        type: uploadType,
        url: downloadUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.name.split('.').pop() || '',
        uploadedBy: user.uid,
        uploadedByName: user.name,
        updatedAt: new Date().toISOString(),
        tags: [],
        accessLevel: 'all',
        isPublished: true
      });

      showToast('تم رفع ونشر الملف بنجاح!', 'success');
      
      // Reset form
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);
      setActiveTab('content'); // Redirect to content list
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'فشل رفع الملف المختار', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete Content
  const handleDeleteContent = async (item: ContentItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${item.title}" نهائياً؟`)) return;
    try {
      // Delete from storage
      await deleteFileFromStorage(item.url);
      // Delete from firestore
      await deleteContentItem(item.id, item.title, user!.uid, user!.name);
      showToast('تم حذف الملف بنجاح', 'success');
    } catch (e) {
      showToast('فشل حذف الملف', 'error');
    }
  };

  // User Actions (Super Admin only)
  const handleChangeRole = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!user) return;
    try {
      await updateUserRole(targetUser.uid, newRole, user.uid, user.name);
      showToast(`تم تغيير صلاحية ${targetUser.name} إلى ${newRole === 'admin' ? 'مدير' : newRole === 'super_admin' ? 'مدير عام' : 'مستخدم'}`, 'success');
    } catch (e) {
      showToast('فشل تعديل الصلاحية', 'error');
    }
  };

  const handleToggleBlock = async (targetUser: UserProfile) => {
    if (!user) return;
    const newStatus: UserStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
    try {
      await updateUserStatus(targetUser.uid, newStatus, user.uid, user.name);
      showToast(`تم ${newStatus === 'blocked' ? 'حظر' : 'تفعيل'} حساب ${targetUser.name}`, 'success');
    } catch (e) {
      showToast('فشل تعديل حالة الحساب', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', direction: 'rtl' }} className="animate-fade">
      
      {/* Welcome Banner */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>لوحة التحكم</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          أهلاً بك يا {user?.name}، صلاحية حسابك: <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{user?.role === 'super_admin' ? 'مدير عام' : user?.role === 'admin' ? 'مدير عادي' : 'عضو'}</span>
        </p>
      </div>

      {/* Main Dashboard Layout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Sidebar menu */}
        <div className="glass-card dashboard-sidebar" style={{
          width: '240px',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '8px',
          flexShrink: 0
        }}>
          
          <button 
            onClick={() => setActiveTab('stats')}
            className={`dashboard-tab ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            الإحصائيات العامة
          </button>

          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('upload')}
                className={`dashboard-tab ${activeTab === 'upload' ? 'active' : ''}`}
              >
                <FolderPlus size={16} />
                رفع محتوى جديد
              </button>

              <button 
                onClick={() => setActiveTab('content')}
                className={`dashboard-tab ${activeTab === 'content' ? 'active' : ''}`}
              >
                <Video size={16} />
                إدارة المحتوى
              </button>
            </>
          )}

          {isSuperAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('users')}
                className={`dashboard-tab ${activeTab === 'users' ? 'active' : ''}`}
              >
                <Users size={16} />
                إدارة الأعضاء والمدراء
              </button>

              <button 
                onClick={() => setActiveTab('logs')}
                className={`dashboard-tab ${activeTab === 'logs' ? 'active' : ''}`}
              >
                <FileText size={16} />
                سجل نشاط الإدارة
              </button>
            </>
          )}
        </div>

        {/* Right Side: Tab Contents */}
        <div style={{ flexGrow: 1, minWidth: '320px' }}>
          
          {/* Tab 1: Stats */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Stats Cards grid */}
              {isAdmin ? (
                <div className="grid-cards">
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', borderRadius: '12px' }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>إجمالي الأعضاء</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '2px' }}>{stats.usersCount}</h3>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', borderRadius: '12px' }}>
                      <Video size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الفيديوهات المرفوعة</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '2px' }}>{stats.videosCount}</h3>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', borderRadius: '12px' }}>
                      <Settings size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>التطبيقات المسجلة</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '2px' }}>{stats.appsCount}</h3>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', borderRadius: '12px' }}>
                      <Download size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>إجمالي التنزيلات</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '2px' }}>{stats.totalDownloads}</h3>
                    </div>
                  </div>
                </div>
              ) : (
                /* Simple Member statistics panel */
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '12px' }}>بوابة الأعضاء EMF Group</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                    تتيح لك بوابتنا تصفح الفيديوهات وتنزيل التطبيقات المخصصة لمسجلات كاميرات المراقبة والفيديو المسجلة. يمكنك زيارة المكتبة للبدء في تصفح الملفات.
                  </p>
                  <button onClick={() => navigate('/content')} className="btn btn-primary">
                    اذهب للمكتبة الرقمية
                  </button>
                </div>
              )}

              {/* Quick instructions for Admins */}
              {isAdmin && (
                <div className="glass-card" style={{ padding: '28px', borderRight: '4px solid var(--accent-blue)' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '10px' }}>ملاحظات الرفع والأمان</h4>
                  <ul style={{ paddingRight: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>أقصى حجم مسموح به لرفع مقاطع الفيديو هو <strong>50 ميجابايت</strong>.</li>
                    <li>أقصى حجم مسموح به لرفع التطبيقات والملفات التنفيذية هو <strong>100 ميجابايت</strong>.</li>
                    <li>تأكد من اختيار القسم الصحيح للمحتوى (فيديوهات / تطبيقات / ملفات) لتسهيل الفلترة.</li>
                    <li>جميع عمليات الرفع والحذف والتحكم تسجل تلقائياً في سجل نشاط الإدارة.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload Content */}
          {activeTab === 'upload' && isAdmin && (
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                رفع محتوى وملف جديد للمكتبة
              </h3>

              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">العنوان</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: فيديو شرح إعداد الكاميرات"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                    disabled={uploading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الوصف التفصيلي</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="اكتب وصفاً مختصراً للملف لسهولة البحث عنه..."
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    disabled={uploading}
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: '150px' }}>
                    <label className="form-label">قسم المحتوى</label>
                    <select
                      className="form-input"
                      value={uploadType}
                      onChange={(e: any) => setUploadType(e.target.value)}
                      disabled={uploading}
                    >
                      <option value="video">فيديو 🎬</option>
                      <option value="app">تطبيق تسجيل 📱</option>
                      <option value="other">ملفات أخرى 📎</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flexGrow: 1, minWidth: '200px' }}>
                    <label className="form-label">الملف (الحدود: فيديو 50MB / تطبيق 100MB)</label>
                    <input
                      type="file"
                      className="form-input"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      required
                      disabled={uploading}
                    />
                  </div>
                </div>

                {uploading && (
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>جاري رفع الملف...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--gradient-primary)', transition: 'width 0.1s ease' }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin-fast" />
                      جاري النشر...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      نشر الملف الآن
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Content List CRUD */}
          {activeTab === 'content' && isAdmin && (
            <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>إدارة محتويات المكتبة</h3>
              
              {contents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  لا توجد ملفات مرفوعة حالياً.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px' }}>الملف</th>
                      <th style={{ padding: '12px 8px' }}>القسم</th>
                      <th style={{ padding: '12px 8px' }}>الحجم</th>
                      <th style={{ padding: '12px 8px' }}>بواسطة</th>
                      <th style={{ padding: '12px 8px' }}>المشاهدات</th>
                      <th style={{ padding: '12px 8px' }}>التنزيلات</th>
                      <th style={{ padding: '12px 8px' }}>التحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contents.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row">
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{item.title}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: '0.75rem' }}>
                            {item.type === 'video' ? 'فيديو 🎬' : item.type === 'app' ? 'تطبيق 📱' : 'ملف 📎'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{item.uploadedByName}</td>
                        <td style={{ padding: '12px 8px' }}>{item.views || 0}</td>
                        <td style={{ padding: '12px 8px' }}>{item.downloads || 0}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <button
                            onClick={() => handleDeleteContent(item)}
                            className="btn btn-danger"
                            style={{ padding: '6px', borderRadius: '6px', fontSize: '0.75rem' }}
                            title="حذف المحتوى"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 4: Users Management (Super Admin only) */}
          {activeTab === 'users' && isSuperAdmin && (
            <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>إدارة صلاحيات وحالة الأعضاء</h3>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px' }}>العضو</th>
                    <th style={{ padding: '12px 8px' }}>البريد الإلكتروني</th>
                    <th style={{ padding: '12px 8px' }}>الصلاحية الحالية</th>
                    <th style={{ padding: '12px 8px' }}>الحالة</th>
                    <th style={{ padding: '12px 8px' }}>تغيير الدور</th>
                    <th style={{ padding: '12px 8px' }}>تعديل الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(targetUser => (
                    <tr key={targetUser.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row">
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{targetUser.name}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{targetUser.email}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className={`badge badge-${targetUser.role.replace('_', '-')}`}>
                          {targetUser.role === 'super_admin' ? 'مدير عام' : targetUser.role === 'admin' ? 'مدير' : 'عضو'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className={`badge badge-${targetUser.status}`}>
                          {targetUser.status === 'blocked' ? 'محظور 🚫' : 'نشط ✓'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {targetUser.role !== 'super_admin' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleChangeRole(targetUser, 'admin')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                              disabled={targetUser.role === 'admin'}
                            >
                              مدير
                            </button>
                            <button
                              onClick={() => handleChangeRole(targetUser, 'user')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                              disabled={targetUser.role === 'user'}
                            >
                              عضو
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {targetUser.role !== 'super_admin' && (
                          <button
                            onClick={() => handleToggleBlock(targetUser)}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.7rem',
                              borderColor: targetUser.status === 'blocked' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                              color: targetUser.status === 'blocked' ? 'var(--accent-emerald)' : 'var(--accent-red)'
                            }}
                          >
                            {targetUser.status === 'blocked' ? 'إلغاء الحظر' : 'حظر الحساب'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 5: Logs (Super Admin only) */}
          {activeTab === 'logs' && isSuperAdmin && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>سجل نشاط مديري النظام</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                {auditLogs.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    لا توجد سجلات نشاط مسجلة.
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: 'white' }}>{log.userName}</span>
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--accent-blue)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          margin: '0 8px',
                          fontSize: '0.7rem'
                        }}>
                          {log.action}
                        </span>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.75rem' }}>{log.description}</p>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {new Date(log.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      <style>{`
        .dashboard-tab {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          text-align: right;
          transition: all 0.2s ease;
        }
        .dashboard-tab:hover, .dashboard-tab.active {
          color: white;
          background: rgba(255, 255, 255, 0.06);
        }
        .dashboard-tab.active {
          border-right: 3px solid var(--accent-blue);
          border-radius: 0 8px 8px 0;
        }
        .table-row:hover {
          background: rgba(255, 255, 255, 0.01) !important;
        }
        @media (max-width: 768px) {
          .dashboard-sidebar {
            width: 100% !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
          }
          .dashboard-tab {
            width: auto !important;
            flex-grow: 1 !important;
          }
          .dashboard-tab.active {
            border-right: none !important;
            border-bottom: 2px solid var(--accent-blue) !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
