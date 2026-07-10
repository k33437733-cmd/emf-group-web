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
  Settings, Loader2, Film, HardDrive, Eye
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<'stats' | 'upload' | 'content' | 'users' | 'logs'>('stats');

  const [stats, setStats] = useState<any>({
    usersCount: 0, adminsCount: 0, videosCount: 0, appsCount: 0, filesCount: 0, totalViews: 0, totalDownloads: 0
  });

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState<'video' | 'app' | 'other'>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isSuperAdmin = user && user.role === 'super_admin';
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

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

  if (authLoading) return <div className="text-center py-5 text-white">جاري التحقق من الحساب...</div>;

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

  useEffect(() => {
    if (user && !isAdmin) {
      setActiveTab('stats');
    }
  }, [user, isAdmin]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim() || !user) {
      showToast('يرجى كتابة عنوان وتحديد ملف للرفع', 'warning');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const downloadUrl = await uploadFile(selectedFile, uploadType, (progress) => {
        setUploadProgress(progress);
      });

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
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);
      setActiveTab('content');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'فشل رفع الملف المختار', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteContent = async (item: ContentItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${item.title}" نهائياً؟`)) return;
    try {
      await deleteFileFromStorage(item.url);
      await deleteContentItem(item.id, item.title, user!.uid, user!.name);
      showToast('تم حذف الملف بنجاح', 'success');
    } catch (e) {
      showToast('فشل حذف الملف', 'error');
    }
  };

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

  const statCards = [
    { label: 'إجمالي الأعضاء', value: stats.usersCount, icon: Users, color: '#3b82f6' },
    { label: 'الفيديوهات', value: stats.videosCount, icon: Film, color: '#8b5cf6' },
    { label: 'التطبيقات', value: stats.appsCount, icon: Settings, color: '#06b6d4' },
    { label: 'إجمالي التنزيلات', value: stats.totalDownloads, icon: Download, color: '#10b981' },
  ];

  const tabs = [
    { id: 'stats' as const, label: 'الإحصائيات العامة', icon: BarChart3, adminOnly: false },
    { id: 'upload' as const, label: 'رفع محتوى جديد', icon: FolderPlus, adminOnly: true },
    { id: 'content' as const, label: 'إدارة المحتوى', icon: Video, adminOnly: true },
    { id: 'users' as const, label: 'إدارة الأعضاء', icon: Users, adminOnly: 'super' as const },
    { id: 'logs' as const, label: 'سجل النشاط', icon: FileText, adminOnly: 'super' as const },
  ];

  const visibleTabs = tabs.filter(t => {
    if (t.adminOnly === 'super') return isSuperAdmin;
    if (t.adminOnly) return isAdmin;
    return true;
  });

  return (
    <div className="container-fluid px-0" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="fw-bolder fs-2 mb-1 text-white">لوحة التحكم</h1>
        <p className="text-secondary-emphasis small m-0">
          أهلاً بك يا {user?.name}، صلاحية حسابك: <span className="fw-bold" style={{ color: '#3b82f6' }}>
            {user?.role === 'super_admin' ? 'مدير عام' : user?.role === 'admin' ? 'مدير عادي' : 'عضو'}
          </span>
        </p>
      </div>

      <div className="row g-4">
        {/* Sidebar tab navigation */}
        <div className="col-lg-3 col-xl-2">
          <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
            <div className="card-body p-2">
              <nav className="nav flex-column nav-pills gap-1" role="tablist">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`nav-link d-flex align-items-center gap-2 text-start border-0 w-100 ${activeTab === tab.id ? 'active' : ''}`}
                    style={{
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      padding: '10px 14px',
                      fontWeight: activeTab === tab.id ? 700 : 500,
                    }}
                  >
                    <tab.icon size={17} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="col-lg-9 col-xl-10">
          {/* Tab 1: Stats */}
          {activeTab === 'stats' && (
            <div className="d-flex flex-column gap-4">
              {isAdmin ? (
                <>
                  <div className="row g-3">
                    {statCards.map((card, i) => (
                      <div className="col-sm-6 col-xl-3" key={i}>
                        <div className="card border-0 shadow-sm h-100" style={{ background: 'var(--card-bg, #141d2b)' }}>
                          <div className="card-body d-flex align-items-center gap-3 p-3">
                            <div className="d-flex align-items-center justify-content-center rounded-3" style={{
                              width: '50px', height: '50px', flexShrink: 0,
                              background: `${card.color}15`, color: card.color,
                            }}>
                              <card.icon size={24} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-secondary-emphasis small">{card.label}</div>
                              <div className="fw-bolder fs-3 text-white mt-1">{card.value}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
                        <div className="card-body d-flex align-items-center gap-3 p-3">
                          <div className="d-flex align-items-center justify-content-center rounded-3" style={{
                            width: '50px', height: '50px', flexShrink: 0,
                            background: 'rgba(234,179,8,0.15)', color: '#eab308',
                          }}>
                            <Eye size={24} />
                          </div>
                          <div>
                            <div className="text-secondary-emphasis small">إجمالي المشاهدات</div>
                            <div className="fw-bolder fs-3 text-white mt-1">{stats.totalViews}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
                        <div className="card-body d-flex align-items-center gap-3 p-3">
                          <div className="d-flex align-items-center justify-content-center rounded-3" style={{
                            width: '50px', height: '50px', flexShrink: 0,
                            background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                          }}>
                            <HardDrive size={24} />
                          </div>
                          <div>
                            <div className="text-secondary-emphasis small">الملفات الأخرى</div>
                            <div className="fw-bolder fs-3 text-white mt-1">{stats.filesCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)', borderRight: '4px solid #3b82f6 !important' }}>
                    <div className="card-body p-4">
                      <h5 className="fw-bold mb-3 text-white">ملاحظات الرفع والأمان</h5>
                      <ul className="text-secondary-emphasis small mb-0" style={{ lineHeight: 1.8, paddingRight: '1.25rem' }}>
                        <li>أقصى حجم مسموح به لرفع مقاطع الفيديو هو <strong>50 ميجابايت</strong>.</li>
                        <li>أقصى حجم مسموح به لرفع التطبيقات والملفات التنفيذية هو <strong>100 ميجابايت</strong>.</li>
                        <li>تأكد من اختيار القسم الصحيح للمحتوى (فيديوهات / تطبيقات / ملفات) لتسهيل الفلترة.</li>
                        <li>جميع عمليات الرفع والحذف والتحكم تسجل تلقائياً في سجل نشاط الإدارة.</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card border-0 shadow-sm text-center" style={{ background: 'var(--card-bg, #141d2b)' }}>
                  <div className="card-body p-5">
                    <h4 className="fw-bold mb-3 text-white">بوابة الأعضاء EMF Group</h4>
                    <p className="text-secondary-emphasis mb-4 mx-auto" style={{ maxWidth: '500px', lineHeight: 1.7 }}>
                      تتيح لك بوابتنا تصفح الفيديوهات وتنزيل التطبيقات المخصصة لمسجلات كاميرات المراقبة والفيديو المسجلة. يمكنك زيارة المكتبة للبدء.
                    </p>
                    <button onClick={() => navigate('/content')} className="btn btn-primary px-4 py-2">
                      اذهب للمكتبة الرقمية
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload */}
          {activeTab === 'upload' && isAdmin && (
            <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4 pb-3 text-white border-bottom border-secondary border-opacity-10">رفع محتوى وملف جديد للمكتبة</h4>
                <form onSubmit={handleUploadSubmit} className="d-flex flex-column gap-3">
                  <div>
                    <label className="form-label small fw-semibold text-white-50">العنوان</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" placeholder="مثال: فيديو شرح إعداد الكاميرات" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required disabled={uploading} />
                  </div>
                  <div>
                    <label className="form-label small fw-semibold text-white-50">الوصف التفصيلي</label>
                    <textarea className="form-control bg-dark text-white border-secondary" style={{ minHeight: '100px', resize: 'vertical' }} placeholder="اكتب وصفاً مختصراً للملف..." value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} disabled={uploading} />
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-white-50">قسم المحتوى</label>
                      <select className="form-select bg-dark text-white border-secondary" value={uploadType} onChange={(e: any) => setUploadType(e.target.value)} disabled={uploading}>
                        <option value="video">فيديو 🎬</option>
                        <option value="app">تطبيق تسجيل 📱</option>
                        <option value="other">ملفات أخرى 📎</option>
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-white-50">الملف (الحدود: فيديو 50MB / تطبيق 100MB)</label>
                      <input type="file" className="form-control bg-dark text-white border-secondary" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required disabled={uploading} />
                    </div>
                  </div>

                  {uploading && (
                    <div className="my-2">
                      <div className="d-flex justify-content-between small text-secondary-emphasis mb-1">
                        <span>جاري رفع الملف...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="progress" style={{ height: '6px', background: 'rgba(255,255,255,0.05)' }}>
                        <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
                      </div>
                    </div>
                  )}

                  <div>
                    <button type="submit" className="btn btn-primary px-4 py-2" disabled={uploading}>
                      {uploading ? (
                        <><Loader2 size={16} className="me-1" /> جاري النشر...</>
                      ) : (
                        <><Plus size={16} className="me-1" /> نشر الملف الآن</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab 3: Content List */}
          {activeTab === 'content' && isAdmin && (
            <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4 text-white">إدارة محتويات المكتبة</h4>
                {contents.length === 0 ? (
                  <div className="text-center py-5 text-secondary-emphasis">لا توجد ملفات مرفوعة حالياً.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark table-hover table-borderless align-middle mb-0 small">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th className="py-3 text-secondary-emphasis fw-semibold">الملف</th>
                          <th className="py-3 text-secondary-emphasis fw-semibold">القسم</th>
                          <th className="py-3 text-secondary-emphasis fw-semibold">الحجم</th>
                          <th className="py-3 text-secondary-emphasis fw-semibold">بواسطة</th>
                          <th className="py-3 text-secondary-emphasis fw-semibold">المشاهدات</th>
                          <th className="py-3 text-secondary-emphasis fw-semibold">التنزيلات</th>
                          <th className="py-3 text-secondary-emphasis fw-semibold">التحكم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contents.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td className="py-3 fw-semibold text-white">{item.title}</td>
                            <td className="py-3">
                              <span className="badge bg-dark text-white-50 border border-secondary border-opacity-25">
                                {item.type === 'video' ? '🎬 فيديو' : item.type === 'app' ? '📱 تطبيق' : '📎 ملف'}
                              </span>
                            </td>
                            <td className="py-3 text-white-50">{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</td>
                            <td className="py-3 text-white-50">{item.uploadedByName}</td>
                            <td className="py-3 text-white">{item.views || 0}</td>
                            <td className="py-3 text-white">{item.downloads || 0}</td>
                            <td className="py-3">
                              <button onClick={() => handleDeleteContent(item)} className="btn btn-sm btn-outline-danger border-0" title="حذف المحتوى">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Users */}
          {activeTab === 'users' && isSuperAdmin && (
            <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4 text-white">إدارة صلاحيات وحالة الأعضاء</h4>
                <div className="table-responsive">
                  <table className="table table-dark table-hover table-borderless align-middle mb-0 small">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th className="py-3 text-secondary-emphasis fw-semibold">العضو</th>
                        <th className="py-3 text-secondary-emphasis fw-semibold">البريد الإلكتروني</th>
                        <th className="py-3 text-secondary-emphasis fw-semibold">الصلاحية</th>
                        <th className="py-3 text-secondary-emphasis fw-semibold">الحالة</th>
                        <th className="py-3 text-secondary-emphasis fw-semibold">تغيير الدور</th>
                        <th className="py-3 text-secondary-emphasis fw-semibold">تعديل الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(targetUser => (
                        <tr key={targetUser.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="py-3 fw-semibold text-white">{targetUser.name}</td>
                          <td className="py-3 text-white-50">{targetUser.email}</td>
                          <td className="py-3">
                            <span className={`badge ${targetUser.role === 'super_admin' ? 'bg-warning text-dark' : targetUser.role === 'admin' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                              {targetUser.role === 'super_admin' ? 'مدير عام' : targetUser.role === 'admin' ? 'مدير' : 'عضو'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`badge ${targetUser.status === 'blocked' ? 'bg-danger' : 'bg-success'}`}>
                              {targetUser.status === 'blocked' ? '🚫 محظور' : '✓ نشط'}
                            </span>
                          </td>
                          <td className="py-3">
                            {targetUser.role !== 'super_admin' && (
                              <div className="d-flex gap-1">
                                <button onClick={() => handleChangeRole(targetUser, 'admin')} className="btn btn-sm btn-outline-info" disabled={targetUser.role === 'admin'}>مدير</button>
                                <button onClick={() => handleChangeRole(targetUser, 'user')} className="btn btn-sm btn-outline-secondary" disabled={targetUser.role === 'user'}>عضو</button>
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            {targetUser.role !== 'super_admin' && (
                              <button onClick={() => handleToggleBlock(targetUser)} className={`btn btn-sm ${targetUser.status === 'blocked' ? 'btn-outline-success' : 'btn-outline-danger'}`}>
                                {targetUser.status === 'blocked' ? 'إلغاء الحظر' : 'حظر الحساب'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Logs */}
          {activeTab === 'logs' && isSuperAdmin && (
            <div className="card border-0 shadow-sm" style={{ background: 'var(--card-bg, #141d2b)' }}>
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4 text-white">سجل نشاط مديري النظام</h4>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-4 text-secondary-emphasis small">لا توجد سجلات نشاط مسجلة.</div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="d-flex justify-content-between align-items-center p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="text-end">
                          <span className="fw-semibold text-white">{log.userName}</span>
                          <span className="badge bg-primary bg-opacity-10 text-primary mx-2">{log.action}</span>
                          <div className="text-secondary-emphasis small mt-1">{log.description}</div>
                        </div>
                        <span className="text-secondary-emphasis small" style={{ direction: 'ltr', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
