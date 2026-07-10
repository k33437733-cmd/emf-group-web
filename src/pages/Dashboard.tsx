import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAnalytics } from '../hooks/useAnalytics';
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
  BarChart3, Video, FolderPlus, Users, FileText, Plus, Trash2,
  Loader2, ShieldAlert, Inbox, ClipboardList
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import KpiCard from '../components/analytics/KpiCard';
import DateFilter from '../components/analytics/DateFilter';
import ChartWrapper from '../components/analytics/ChartWrapper';
import ActivityTimeline from '../components/analytics/ActivityTimeline';
import ExportButtons from '../components/analytics/ExportButtons';
import {
  PageHeader, Badge, EmptyState, SectionHeader, FieldGroup, ProgressBar
} from '../components/ui/UIComponents';

import {
  ResponsiveContainer,
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend,
} from 'recharts';

interface TooltipPayloadItem {
  color: string;
  name: string;
  value?: number;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}
function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card-2)', border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius-md)', padding: '8px 12px',
      boxShadow: 'var(--shadow-lg)', fontSize: '0.72rem',
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value?.toLocaleString('ar-SA')}</div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const analytics = useAnalytics();

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
    if (user && !isAdmin) setActiveTab('stats');
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
      const downloadUrl = await uploadFile(selectedFile, uploadType, (progress) => setUploadProgress(progress));
      await addContentItem({
        title: uploadTitle.trim(), description: uploadDesc.trim(), type: uploadType,
        url: downloadUrl, fileName: selectedFile.name, fileSize: selectedFile.size,
        fileType: selectedFile.name.split('.').pop() || '', uploadedBy: user.uid,
        uploadedByName: user.name, updatedAt: new Date().toISOString(),
        tags: [], accessLevel: 'all', isPublished: true
      });
      showToast('تم رفع ونشر الملف بنجاح!', 'success');
      setUploadTitle(''); setUploadDesc(''); setSelectedFile(null);
      setActiveTab('content');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'فشل رفع الملف المختار';
      showToast(msg, 'error');
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

  if (authLoading || analytics.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-2)' }}>
        <Loader2 className="anim-spin" size={24} style={{ marginLeft: 10 }} />
        <span>جاري تحميل لوحة التحكم...</span>
      </div>
    );
  }

  const roleText = user?.role === 'super_admin' ? 'مدير عام' : user?.role === 'admin' ? 'مدير عادي' : 'عضو';

  return (
    <div className="anim-fade" style={{ direction: 'rtl' }}>
      
      {/* Page Header */}
      <PageHeader
        title="لوحة التحكم"
        subtitle={`أهلاً بك يا ${user?.name} | صلاحية حسابك: ${roleText}`}
        breadcrumb={[
          { label: 'الرئيسية', href: '/' },
          { label: 'لوحة التحكم' }
        ]}
        actions={activeTab === 'stats' && isAdmin && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <DateFilter preset={analytics.dateRange.preset} onChange={analytics.setDateRange} />
            <ExportButtons />
          </div>
        )}
      />

      <div className="row g-4">
        {/* Tab Sidebar Selection */}
        <div className="col-lg-3 col-xl-2">
          <div className="card-base dashboard-tab-nav" style={{ padding: '8px', background: 'var(--bg-card)' }}>
            <nav className="nav flex-column gap-1" role="tablist">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
                  style={{
                    border: '1px solid transparent',
                    background: activeTab === tab.id ? 'var(--primary-bg)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--primary-light)' : 'var(--text-2)',
                    borderColor: activeTab === tab.id ? 'var(--primary-border)' : 'transparent',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    width: '100%',
                    textAlign: 'right',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <tab.icon size={16} style={{ flexShrink: 0 }} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <style>{`
          @media (max-width: 991px) {
            .dashboard-tab-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .dashboard-tab-nav .nav { flex-direction: row !important; white-space: nowrap; gap: 8px !important; }
            .dashboard-tab-nav .nav button { width: auto !important; flex-shrink: 0; }
          }
        `}</style>

        {/* Dynamic Display Panel */}
        <div className="col-lg-9 col-xl-10" style={{ minWidth: 0 }}>
          <ErrorBoundary key={activeTab} fallback={
            <div className="card-base text-center" style={{ padding: '64px 32px' }}>
              <h4 className="text-1 font-bold mb-3">تعذر تحميل هذا القسم</h4>
              <p className="text-3 mb-4 mx-auto" style={{ maxWidth: '520px' }}>
                حدث خطأ غير متوقع أثناء معالجة هذا القسم. يرجى التبديل بين الأقسام أو إعادة تحديث الصفحة.
              </p>
              <button onClick={() => window.location.reload()} className="btn-base btn-primary">
                تحديث الصفحة
              </button>
            </div>
          }>
            
            {/* Tab 1: Stats & Overview */}
            {activeTab === 'stats' && (
              <div role="tabpanel" className="d-flex flex-col gap-5 anim-scale">
                {isAdmin ? (
                  <>
                    {/* KPI Stats cards */}
                    <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
                      {analytics.kpiCards.map((card, i) => (
                        <KpiCard key={i} {...card} />
                      ))}
                    </div>

                    {/* Chart grids */}
                    <div className="grid-2 mt-2">
                      
                      {/* 1. Members growth */}
                      <ChartWrapper title="نمو الأعضاء" subtitle={`الإجمالي: ${stats.usersCount || analytics.kpiCards[0]?.value || 0}`}>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={analytics.membersGrowth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} name="تسجيلات" />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartWrapper>

                      {/* 2. Content Uploads */}
                      <ChartWrapper title="المحتوى المرفوع" subtitle="فيديو / تطبيقات / ملفات">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analytics.contentUploads}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                            <Bar dataKey="videos" stackId="a" fill="var(--purple)" name="فيديو" />
                            <Bar dataKey="apps" stackId="a" fill="var(--info)" name="تطبيقات" />
                            <Bar dataKey="files" stackId="a" fill="var(--success)" name="ملفات" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartWrapper>

                      {/* 3. Views Analytics */}
                      <ChartWrapper title="تحليل المشاهدات" subtitle={`الإجمالي: ${analytics.viewsAnalytics.total.toLocaleString('ar-SA')} | النمو: ${analytics.viewsAnalytics.growth > 0 ? '+' : ''}${analytics.viewsAnalytics.growth}%`}>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={analytics.viewsAnalytics.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="value" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.12} strokeWidth={2} name="مشاهدات" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartWrapper>

                      {/* 4. Downloads Analytics */}
                      <ChartWrapper title="تحليل التنزيلات" subtitle={`الشهر الحالي: ${analytics.downloadsAnalytics.currentMonth.toLocaleString('ar-SA')} | السابق: ${analytics.downloadsAnalytics.previousMonth.toLocaleString('ar-SA')} | النمو: ${analytics.downloadsAnalytics.growth > 0 ? '+' : ''}${analytics.downloadsAnalytics.growth}%`}>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={analytics.downloadsAnalytics.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="value" stroke="var(--success)" strokeWidth={2} dot={false} name="تنزيلات" />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartWrapper>

                      {/* 5. User Activity bar */}
                      <ChartWrapper title="خريطة النشاط" subtitle="الساعات الأكثر نشاطاً">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analytics.userActivity.slice(0, 24)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" fill="var(--primary)" name="نشاط" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartWrapper>

                      {/* 6. Most Viewed content */}
                      <ChartWrapper title="الأكثر مشاهدة" subtitle="أعلى 10 محتويات مشاهدة">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={analytics.mostViewed.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={110} tickFormatter={v => v.length > 15 ? v.slice(0, 15) + '…' : v} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="views" fill="var(--purple)" name="مشاهدات" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartWrapper>

                      {/* 7. Content distribution */}
                      <ChartWrapper title="توزيع المحتوى" subtitle="نسبة أنواع المحتوى بالمكتبة">
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={analytics.contentDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={4}>
                                {analytics.contentDistribution.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </ChartWrapper>

                      {/* 8. User roles distribution */}
                      <ChartWrapper title="توزيع الصلاحيات" subtitle="نسبة أدوار الأعضاء">
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={analytics.roleDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={4}>
                                {analytics.roleDistribution.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </ChartWrapper>
                    </div>

                    {/* 9. Storage Analysis */}
                    <div style={{ marginTop: 20 }}>
                      <ChartWrapper title="سعة التخزين" subtitle={`المستخدم: ${formatBytes(analytics.storage.used)} من ${formatBytes(analytics.storage.total)}`}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          <ProgressBar value={Math.round((analytics.storage.used / analytics.storage.total) * 100)} color="gold" height={10} label="النسبة الإجمالية المستهلكة" />
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                            <div className="card-base p-4" style={{ background: 'var(--bg-card-2)' }}>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>فيديو</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{formatBytes(analytics.storage.videos)}</div>
                            </div>
                            <div className="card-base p-4" style={{ background: 'var(--bg-card-2)' }}>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>تطبيقات</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{formatBytes(analytics.storage.apps)}</div>
                            </div>
                            <div className="card-base p-4" style={{ background: 'var(--bg-card-2)' }}>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>ملفات</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{formatBytes(analytics.storage.files)}</div>
                            </div>
                            <div className="card-base p-4" style={{ background: 'var(--bg-card-2)', borderRight: '2px solid var(--success)' }}>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>السعة المتبقية</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>{formatBytes(analytics.storage.total - analytics.storage.used)}</div>
                            </div>
                          </div>
                        </div>
                      </ChartWrapper>
                    </div>

                    {/* 10. Live Timeline */}
                    <div style={{ marginTop: 20 }}>
                      <ChartWrapper title="سجل الأحداث الفوري" subtitle="مراقبة العمليات في الوقت الحقيقي">
                        <ActivityTimeline events={analytics.timeline} />
                      </ChartWrapper>
                    </div>

                    {/* Guidelines Card */}
                    <div className="card-base p-5" style={{ borderRight: '4px solid var(--primary)', background: 'var(--bg-card)', marginTop: 20 }}>
                      <div className="text-1 font-bold mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
                        <span>سياسات رفع المحتوى والأمان</span>
                      </div>
                      <ul style={{ paddingRight: 20, color: 'var(--text-2)', fontSize: '0.84rem', lineHeight: 1.7 }}>
                        <li>الحد الأقصى لرفع ملفات الفيديو هو <strong>50 ميجابايت</strong>.</li>
                        <li>الحد الأقصى لرفع ملفات التطبيقات والبرمجيات هو <strong>100 ميجابايت</strong>.</li>
                        <li>يرجى التأكد من ملء العناوين والأوصاف باللغة العربية الواضحة لتسهيل القراءة للعملاء.</li>
                        <li>جميع الإجراءات الإدارية تسجل فوراً في سجل النظام لأغراض الحماية والمتابعة.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="card-base text-center" style={{ padding: '64px 32px' }}>
                    <h4 className="text-1 font-bold mb-3">بوابة الأعضاء EMF Group</h4>
                    <p className="text-3 mb-4 mx-auto" style={{ maxWidth: '520px', fontSize: '0.9rem' }}>
                      تتيح لك البوابة تصفح الفيديوهات وتنزيل تطبيقات كاميرات المراقبة المخصصة. يرجى زيارة المكتبة الرقمية للبدء في الاستخدام.
                    </p>
                    <button onClick={() => navigate('/content')} className="btn-base btn-primary">
                      زيارة المكتبة الرقمية
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Upload new content */}
            {activeTab === 'upload' && isAdmin && (
              <div className="card-base p-5 anim-scale" style={{ background: 'var(--bg-card)' }}>
                <SectionHeader title="رفع محتوى جديد" subtitle="أضف مقاطع فيديو أو تطبيقات أو ملفات إرشادية للمكتبة" icon={FolderPlus} />
                <hr className="divider" />
                
                <form onSubmit={handleUploadSubmit}>
                  <FieldGroup label="عنوان المحتوى" required htmlFor="upload-title">
                    <input
                      id="upload-title"
                      type="text"
                      className="field-input"
                      placeholder="مثال: شرح إعدادات مسجل كاميرات المراقبة DVR"
                      value={uploadTitle}
                      onChange={e => setUploadTitle(e.target.value)}
                      required
                      disabled={uploading}
                    />
                  </FieldGroup>

                  <FieldGroup label="وصف المحتوى" htmlFor="upload-desc">
                    <textarea
                      id="upload-desc"
                      className="field-input"
                      style={{ minHeight: 100, resize: 'vertical' }}
                      placeholder="اكتب تفاصيل أو معلومات هامة لمساعدة المستخدمين..."
                      value={uploadDesc}
                      onChange={e => setUploadDesc(e.target.value)}
                      disabled={uploading}
                    />
                  </FieldGroup>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <FieldGroup label="نوع المحتوى">
                        <select
                          className="field-input field-select"
                          value={uploadType}
                          onChange={e => setUploadType(e.target.value as 'video' | 'app' | 'other')}
                          disabled={uploading}
                        >
                          <option value="video">🎥 فيديو تعليمي</option>
                          <option value="app">📱 تطبيق مسجل</option>
                          <option value="other">📎 ملفات أخرى</option>
                        </select>
                      </FieldGroup>
                    </div>

                    <div className="col-md-8">
                      <FieldGroup label="ملف المحتوى (الفيديو حد أقصى 50MB، الملفات 100MB)" required htmlFor="upload-file">
                        <input
                          id="upload-file"
                          type="file"
                          className="field-input"
                          onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                          required
                          disabled={uploading}
                          style={{ padding: '8px 12px' }}
                        />
                      </FieldGroup>
                    </div>
                  </div>

                  {uploading && (
                    <div style={{ margin: '14px 0' }}>
                      <ProgressBar value={uploadProgress} color="primary" label="جاري نقل الملف للخوادم..." />
                    </div>
                  )}

                  <div style={{ marginTop: 20 }}>
                    <button type="submit" className="btn-base btn-primary" disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 size={16} className="anim-spin" />
                          <span>جاري الحفظ والنشر...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>نشر المحتوى الآن</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 3: Content List Manager */}
            {activeTab === 'content' && isAdmin && (
              <div className="card-base p-5 anim-scale" style={{ background: 'var(--bg-card)' }}>
                <SectionHeader title="إدارة ملفات المكتبة" subtitle="إدارة وحذف المحتويات المنشورة على البوابة" icon={Video} />
                <hr className="divider" />

                {contents.length === 0 ? (
                  <EmptyState icon={Inbox} title="المكتبة فارغة" desc="لم يتم نشر أي محتوى في المكتبة الرقمية حتى الآن." />
                ) : (
                  <div className="data-table-wrapper">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>الملف</th>
                            <th>القسم</th>
                            <th>الحجم</th>
                            <th>الناشر</th>
                            <th>المشاهدات</th>
                            <th>التنزيلات</th>
                            <th style={{ textAlign: 'center' }}>التحكم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contents.map(item => (
                            <tr key={item.id}>
                              <td className="font-semibold text-1">{item.title}</td>
                              <td>
                                <Badge variant={item.type === 'video' ? 'purple' : item.type === 'app' ? 'info' : 'green'}>
                                  {item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'}
                                </Badge>
                              </td>
                              <td className="text-3">{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</td>
                              <td className="text-3">{item.uploadedByName}</td>
                              <td className="text-2 font-medium">{item.views || 0}</td>
                              <td className="text-2 font-medium">{item.downloads || 0}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => handleDeleteContent(item)}
                                  className="btn-base btn-danger btn-icon-sm"
                                  title="حذف المحتوى نهائياً"
                                >
                                  <Trash2 size={13} />
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
              <div className="card-base p-5 anim-scale" style={{ background: 'var(--bg-card)' }}>
                <SectionHeader title="إدارة صلاحيات الأعضاء" subtitle="تعديل صلاحيات الأدوار وحظر أو تفعيل الحسابات" icon={Users} />
                <hr className="divider" />

                <div className="data-table-wrapper">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>العضو</th>
                          <th>البريد الإلكتروني</th>
                          <th>الصلاحية الحاليّة</th>
                          <th>حالة الحساب</th>
                          <th>تعديل الدور</th>
                          <th style={{ textAlign: 'center' }}>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map(targetUser => (
                          <tr key={targetUser.uid}>
                            <td className="font-semibold text-1">{targetUser.name}</td>
                            <td className="text-3">{targetUser.email}</td>
                            <td>
                              <Badge variant={targetUser.role === 'super_admin' ? 'gold' : targetUser.role === 'admin' ? 'info' : 'ghost'} dot>
                                {targetUser.role === 'super_admin' ? 'مدير عام' : targetUser.role === 'admin' ? 'مدير' : 'عضو'}
                              </Badge>
                            </td>
                            <td>
                              <Badge variant={targetUser.status === 'blocked' ? 'red' : 'green'}>
                                {targetUser.status === 'blocked' ? '🚫 محظور' : '✓ نشط'}
                              </Badge>
                            </td>
                            <td>
                              {targetUser.role !== 'super_admin' && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => handleChangeRole(targetUser, 'admin')}
                                    className={`btn-base btn-sm ${targetUser.role === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                                    disabled={targetUser.role === 'admin'}
                                    style={{ padding: '4px 8px' }}
                                  >
                                    مدير
                                  </button>
                                  <button
                                    onClick={() => handleChangeRole(targetUser, 'user')}
                                    className={`btn-base btn-sm ${targetUser.role === 'user' ? 'btn-primary' : 'btn-ghost'}`}
                                    disabled={targetUser.role === 'user'}
                                    style={{ padding: '4px 8px' }}
                                  >
                                    عضو
                                  </button>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {targetUser.role !== 'super_admin' && (
                                <button
                                  onClick={() => handleToggleBlock(targetUser)}
                                  className={`btn-base btn-sm ${targetUser.status === 'blocked' ? 'btn-success' : 'btn-danger'}`}
                                  style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                                >
                                  {targetUser.status === 'blocked' ? 'تفعيل الحساب' : 'حظر الحساب'}
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

            {/* Tab 5: Audit logs */}
            {activeTab === 'logs' && isSuperAdmin && (
              <div className="card-base p-5 anim-scale" style={{ background: 'var(--bg-card)' }}>
                <SectionHeader title="سجل الأحداث التاريخي" subtitle="متابعة جميع العمليات الحساسة التي قام بها المدراء" icon={FileText} />
                <hr className="divider" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto', paddingLeft: 6 }}>
                  {auditLogs.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="السجل فارغ" desc="لا توجد أي عمليات مسجلة في سجل النشاط." />
                  ) : (
                    auditLogs.map(log => (
                      <div
                        key={log.id}
                        className="hover-lift"
                        style={{
                          display:       'flex',
                          justifyContent: 'space-between',
                          alignItems:    'center',
                          padding:       '14px 18px',
                          background:    'var(--bg-input)',
                          border:        '1px solid var(--border-1)',
                          borderRadius:  'var(--radius-md)',
                        }}
                      >
                        <div style={{ textAlign: 'right' }}>
                          <span className="font-semibold text-1" style={{ fontSize: '0.84rem' }}>{log.userName}</span>
                          <span style={{ margin: '0 8px' }}>
                            <Badge variant="blue" size="sm">{log.action}</Badge>
                          </span>
                          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 5 }}>{log.description}</div>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-4)', direction: 'ltr', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
