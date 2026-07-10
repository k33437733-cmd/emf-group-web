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
  Settings, Loader2, Film, HardDrive, Eye, ShieldAlert, Inbox, ClipboardList
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';

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

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin-fast" size={24} style={{ marginLeft: 'var(--space-2)' }} />
        جاري التحقق من الحساب...
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 page-enter" style={{ direction: 'rtl' }}>
      
      {/* Page Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="body-text m-0" style={{ marginTop: 'var(--space-2)' }}>
            أهلاً بك يا <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>، صلاحية حسابك:{' '}
            <strong style={{ color: 'var(--accent-blue)' }}>
              {user?.role === 'super_admin' ? 'مدير عام' : user?.role === 'admin' ? 'مدير عادي' : 'عضو'}
            </strong>
          </p>
        </div>
      </div>

      <div className="row g-4">
        
        {/* Tabpill Selector */}
        <div className="col-lg-3 col-xl-2">
          <div className="card-base dashboard-tab-nav" style={{ padding: 'var(--space-2)' }}>
            <nav className="nav flex-column gap-1" role="tablist">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-link d-flex align-items-center gap-3 text-start border-0 w-100 ${activeTab === tab.id ? 'active' : ''}`}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    transition: 'all var(--transition-base)',
                    cursor: 'pointer'
                  }}
                >
                  <tab.icon size={17} style={{ flexShrink: 0 }} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <style>{`
          @media (max-width: 991px) {
            .dashboard-tab-nav {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            .dashboard-tab-nav .nav {
              flex-direction: row !important;
              white-space: nowrap;
              gap: var(--space-1) !important;
              padding-bottom: var(--space-1);
            }
            .dashboard-tab-nav .nav .nav-link {
              flex-shrink: 0;
            }
          }
        `}</style>

        {/* Dynamic Display Panel */}
        <div className="col-lg-9 col-xl-10">
          
          {/* Tab 1: Stats & Overview */}
          {activeTab === 'stats' && (
            <div className="d-flex flex-column gap-4 animate-scale">
              {isAdmin ? (
                <>
                  {/* Grid Metrics — responsive auto-fit */}
                  <div className="grid-stats">
                    {statCards.map((card, i) => (
                      <div
                        key={i}
                        className="card-base"
                        style={{
                          height: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 var(--space-6)',
                        }}
                      >
                        <div className="d-flex align-items-center gap-4 w-100">
                          <div
                            style={{
                              width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                              background: `${card.color}12`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <card.icon size={24} style={{ color: card.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="small-label">{card.label}</div>
                            <div className="stat-number">{card.value}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Second row stats */}
                  <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))' }}>
                    <div className="card-base" style={{ height: '104px', display: 'flex', alignItems: 'center', padding: '0 var(--space-6)' }}>
                      <div className="d-flex align-items-center gap-4 w-100">
                        <div style={{
                          width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                          background: 'rgba(245,158,11,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Eye size={22} style={{ color: 'var(--accent-amber)' }} />
                        </div>
                        <div>
                          <div className="small-label">إجمالي المشاهدات</div>
                          <div className="stat-number">{stats.totalViews}</div>
                        </div>
                      </div>
                    </div>
                    <div className="card-base" style={{ height: '104px', display: 'flex', alignItems: 'center', padding: '0 var(--space-6)' }}>
                      <div className="d-flex align-items-center gap-4 w-100">
                        <div style={{
                          width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                          background: 'rgba(6,182,212,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <HardDrive size={22} style={{ color: 'var(--accent-cyan)' }} />
                        </div>
                        <div>
                          <div className="small-label">الملفات الأخرى</div>
                          <div className="stat-number">{stats.filesCount}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Guidelines Alert Card */}
                  <div className="card-base" style={{ padding: 'var(--space-6)', borderRight: '4px solid var(--accent-blue)' }}>
                    <h5 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                      <ShieldAlert size={18} style={{ color: 'var(--accent-blue)' }} />
                      ملاحظات الرفع والأمان للمسؤولين
                    </h5>
                    <ul className="body-text mb-0" style={{ lineHeight: 'var(--lh-relaxed)', paddingRight: 'var(--space-5)' }}>
                      <li>أقصى حجم مسموح به لرفع مقاطع الفيديو هو <strong>50 ميجابايت</strong>.</li>
                      <li>أقصى حجم مسموح به لرفع التطبيقات والملفات التنفيذية هو <strong>100 ميجابايت</strong>.</li>
                      <li>تأكد من اختيار القسم الصحيح للمحتوى (فيديوهات / تطبيقات / ملفات) لتسهيل الفلترة.</li>
                      <li>جميع عمليات الرفع والحذف والتحكم تسجل تلقائياً في سجل نشاط الإدارة.</li>
                    </ul>
                  </div>
                </>
              ) : (
                /* Member portal view */
                <div className="card-base text-center" style={{ padding: 'var(--space-16) var(--space-10)' }}>
                  <h4 className="section-title mb-3">بوابة الأعضاء EMF Group</h4>
                  <p className="body-text mb-4 mx-auto" style={{ maxWidth: '520px' }}>
                    تتيح لك بوابتنا تصفح الفيديوهات وتنزيل التطبيقات المخصصة لمسجلات كاميرات المراقبة والفيديو المسجلة. يمكنك زيارة المكتبة للبدء.
                  </p>
                  <button onClick={() => navigate('/content')} className="btn btn-primary">
                    اذهب للمكتبة الرقمية
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload Files */}
          {activeTab === 'upload' && isAdmin && (
            <div className="card-base animate-scale" style={{ padding: 'var(--space-8)' }}>
              <h4 className="section-title mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                رفع محتوى وملف جديد للمكتبة
              </h4>
              <form onSubmit={handleUploadSubmit} className="d-flex flex-column gap-3">
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
                    placeholder="اكتب وصفاً مختصراً للملف..." 
                    value={uploadDesc} 
                    onChange={(e) => setUploadDesc(e.target.value)} 
                    disabled={uploading} 
                  />
                </div>
                
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="form-label">قسم المحتوى</label>
                      <select 
                        className="form-input" 
                        value={uploadType} 
                        onChange={(e: any) => setUploadType(e.target.value)} 
                        disabled={uploading}
                        style={{ appearance: 'auto' }}
                      >
                        <option value="video">فيديو 🎬</option>
                        <option value="app">تطبيق تسجيل 📱</option>
                        <option value="other">ملفات أخرى 📎</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="form-group">
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
                </div>

                {uploading && (
                  <div className="my-2">
                    <div className="d-flex justify-content-between small text-secondary mb-1">
                      <span>جاري رفع الملف للمخدم...</span>
                      <span className="fw-bold">{uploadProgress}%</span>
                    </div>
                    <div className="progress" style={{ height: '6px', background: 'var(--badge-bg)', borderRadius: 'var(--radius-full)' }}>
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated" 
                        style={{ width: `${uploadProgress}%`, background: 'var(--gradient-cyber)', borderRadius: 'var(--radius-full)' }} 
                      />
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin-fast me-1" />
                        <span>جاري النشر...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>نشر الملف الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: Content List Manager */}
          {activeTab === 'content' && isAdmin && (
            <div className="card-base animate-scale" style={{ padding: 'var(--space-8)' }}>
              <h4 className="section-title mb-4">إدارة محتويات المكتبة</h4>
              
              {contents.length === 0 ? (
                <EmptyState icon={<Inbox size={48} />} title="لا توجد ملفات" message="لم يتم رفع أي ملفات إلى المكتبة بعد." />
              ) : (
                <div className="table-container">
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>الملف</th>
                          <th>القسم</th>
                          <th>الحجم</th>
                          <th>بواسطة</th>
                          <th>المشاهدات</th>
                          <th>التنزيلات</th>
                          <th className="text-center">التحكم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contents.map(item => (
                          <tr key={item.id}>
                            <td className="fw-semibold">{item.title}</td>
                            <td>
                              <span className="badge" style={{ 
                                background: 'var(--badge-bg)', 
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-sm)'
                              }}>
                                {item.type === 'video' ? '🎬 فيديو' : item.type === 'app' ? '📱 تطبيق' : '📎 ملف'}
                              </span>
                            </td>
                            <td className="text-secondary">{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</td>
                            <td className="text-secondary">{item.uploadedByName}</td>
                            <td>{item.views || 0}</td>
                            <td>{item.downloads || 0}</td>
                            <td className="text-center">
                              <button 
                                onClick={() => handleDeleteContent(item)} 
                                className="btn btn-sm btn-icon btn-ghost"
                                style={{ color: 'var(--accent-red)' }}
                                title="حذف المحتوى"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Users Administration */}
          {activeTab === 'users' && isSuperAdmin && (
            <div className="card-base animate-scale" style={{ padding: 'var(--space-8)' }}>
              <h4 className="section-title mb-4">إدارة صلاحيات وحالة الأعضاء</h4>
              
              <div className="table-container">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>العضو</th>
                        <th>البريد الإلكتروني</th>
                        <th>الصلاحية</th>
                        <th>الحالة</th>
                        <th>تغيير الدور</th>
                        <th className="text-center">تعديل الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(targetUser => (
                        <tr key={targetUser.uid}>
                          <td className="fw-semibold">{targetUser.name}</td>
                          <td className="text-secondary">{targetUser.email}</td>
                          <td>
                            <span className="badge" style={{ 
                              background: targetUser.role === 'super_admin' ? 'rgba(245,158,11,0.12)' : targetUser.role === 'admin' ? 'rgba(6,182,212,0.12)' : 'var(--badge-bg)',
                              border: targetUser.role === 'super_admin' ? '1px solid rgba(245,158,11,0.25)' : targetUser.role === 'admin' ? '1px solid rgba(6,182,212,0.25)' : '1px solid var(--border-color)',
                              color: targetUser.role === 'super_admin' ? 'var(--accent-amber)' : targetUser.role === 'admin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              {targetUser.role === 'super_admin' ? 'مدير عام' : targetUser.role === 'admin' ? 'مدير' : 'عضو'}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{ 
                              background: targetUser.status === 'blocked' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                              border: targetUser.status === 'blocked' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(16,185,129,0.25)',
                              color: targetUser.status === 'blocked' ? 'var(--accent-red)' : 'var(--accent-emerald)',
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              {targetUser.status === 'blocked' ? '🚫 محظور' : '✓ نشط'}
                            </span>
                          </td>
                          <td>
                            {targetUser.role !== 'super_admin' && (
                              <div className="d-flex gap-1">
                                <button 
                                  onClick={() => handleChangeRole(targetUser, 'admin')} 
                                  className={`btn btn-sm ${targetUser.role === 'admin' ? 'btn-ghost' : 'btn-secondary'}`}
                                  style={targetUser.role === 'admin' ? { color: 'var(--accent-cyan)' } : {}}
                                  disabled={targetUser.role === 'admin'}
                                >
                                  مدير
                                </button>
                                <button 
                                  onClick={() => handleChangeRole(targetUser, 'user')} 
                                  className={`btn btn-sm ${targetUser.role === 'user' ? 'btn-ghost' : 'btn-secondary'}`}
                                  disabled={targetUser.role === 'user'}
                                >
                                  عضو
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            {targetUser.role !== 'super_admin' && (
                              <button 
                                onClick={() => handleToggleBlock(targetUser)} 
                                className={`btn btn-sm ${targetUser.status === 'blocked' ? 'btn-ghost' : 'btn-ghost'}`}
                                style={{ color: targetUser.status === 'blocked' ? 'var(--accent-emerald)' : 'var(--accent-red)' }}
                              >
                                {targetUser.status === 'blocked' ? 'تفعيل' : 'حظر'}
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

          {/* Tab 5: Activities Logs */}
          {activeTab === 'logs' && isSuperAdmin && (
            <div className="card-base animate-scale" style={{ padding: 'var(--space-8)' }}>
              <h4 className="section-title mb-4">سجل نشاط مديري النظام</h4>
              
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '480px', overflowY: 'auto', paddingLeft: 'var(--space-2)' }}>
                {auditLogs.length === 0 ? (
                  <EmptyState icon={<ClipboardList size={48} />} title="لا توجد سجلات" message="لم يتم تسجيل أي أحداث نشاط بعد." />
                ) : (
                  auditLogs.map(log => (
                    <div 
                      key={log.id} 
                      className="d-flex justify-content-between align-items-center p-3" 
                      style={{ 
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        transition: 'all var(--transition-base)',
                      }}
                    >
                      <div className="text-end">
                        <span className="fw-semibold" style={{ fontSize: 'var(--text-sm)' }}>{log.userName}</span>
                        <span 
                          className="badge mx-2"
                          style={{
                            background: 'rgba(59,130,246,0.08)',
                            border: '1px solid rgba(59,130,246,0.15)',
                            color: 'var(--accent-blue)',
                            fontSize: 'var(--text-xs)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          {log.action}
                        </span>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>{log.description}</div>
                      </div>
                      
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', direction: 'ltr', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
