import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAnalytics, type ActivityEvent } from '../hooks/useAnalytics';
import { useI18n } from '../context/I18nContext';
import {
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
  Loader2, Inbox, ClipboardList, Download, Clock, Activity,
  TrendingUp, PieChart, UserPlus, Upload, Settings, Bell,
  FileDown, CheckSquare, Square, X
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import ContributionHeatmap from '../components/analytics/ContributionHeatmap';
import {
  ResponsiveContainer,
  AreaChart, Area,
  Pie, Cell, XAxis, YAxis, Tooltip, PieChart as RePieChart
} from 'recharts';

// Mini sparkline for dashboard KPI cards
function MiniSparkline({ data, color }: { data: number[], color: string }) {
  const points = data && data.length > 0 ? data : [10, 15, 8, 20, 14, 25, 18, 30];
  const chartData = points.map((val, idx) => ({ idx, val }));
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} fill={`url(#sparkGrad-${color})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Count up animation hook/component for dashboard KPI values
function CountUp({ value }: { value: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;
    const duration = 800; // ms
    const increment = Math.max(1, Math.floor(end / (duration / 16)));
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCurrent(end);
        clearInterval(timer);
      } else {
        setCurrent(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{current.toLocaleString()}</span>;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const { t, rtl } = useI18n();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<'stats' | 'upload' | 'content' | 'users' | 'logs'>('stats');
  const [activityFilter, setActivityFilter] = useState<'الكل' | 'تسجيلات' | 'محتوى' | 'نظام'>('الكل');
  
  // Members Table states
  const [membersSearch, setMembersSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersSort, setMembersSort] = useState<{ field: 'name' | 'email' | 'createdAt', desc: boolean }>({ field: 'name', desc: false });

  // Floating Actions Panel state
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Upload file state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState<'video' | 'app' | 'other'>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal display states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ name: '', email: '', role: 'user' as UserRole });

  const isSuperAdmin = user && user.role === 'super_admin';
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Filtered timeline based on segment tab
  const filteredActivity = useMemo(() => {
    return analytics.timeline.filter((event: any) => {
      if (activityFilter === 'الكل') return true;
      if (activityFilter === 'تسجيلات') return event.type === 'register';
      if (activityFilter === 'محتوى') return event.type.startsWith('upload') || event.type === 'delete';
      if (activityFilter === 'نظام') return ['project', 'ticket', 'chat'].includes(event.type);
      return true;
    });
  }, [analytics.timeline, activityFilter]);

  // Members lists query filter / search / sort
  const processedMembers = useMemo(() => {
    let result = [...usersList];
    if (membersSearch.trim()) {
      const q = membersSearch.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    // Sorting
    result.sort((a, b) => {
      const valA = membersSort.field === 'createdAt' ? a.createdAt || '' : a[membersSort.field] || '';
      const valB = membersSort.field === 'createdAt' ? b.createdAt || '' : b[membersSort.field] || '';
      return membersSort.desc
        ? valB.localeCompare(valA)
        : valA.localeCompare(valB);
    });
    return result;
  }, [usersList, membersSearch, membersSort]);

  // Pagination bounds
  const paginatedMembers = useMemo(() => {
    const startIdx = (membersPage - 1) * 10;
    return processedMembers.slice(startIdx, startIdx + 10);
  }, [processedMembers, membersPage]);

  const totalMembersPages = Math.ceil(processedMembers.length / 10) || 1;

  // Sync listener for custom triggers from Command Palette
  useEffect(() => {
    const handleOpenAddMember = () => {
      setShowAddMemberModal(true);
    };
    window.addEventListener('open-add-member', handleOpenAddMember);
    return () => window.removeEventListener('open-add-member', handleOpenAddMember);
  }, []);

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
    let contentUnsub = () => {};
    let usersUnsub = () => {};
    let logsUnsub = () => {};

    if (isAdmin) {
      contentUnsub = subscribeToContents((list) => setContents(list));
    }
    if (isSuperAdmin) {
      usersUnsub = subscribeToUsers((list) => setUsersList(list));
      logsUnsub = subscribeToAuditLogs((list) => setAuditLogs(list));
    }
    return () => {
      contentUnsub();
      usersUnsub();
      logsUnsub();
    };
  }, [user, isAdmin, isSuperAdmin]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim() || !user) {
      showToast(t('warningToast'), 'warning');
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
      showToast(t('successToast'), 'success');
      setUploadTitle(''); setUploadDesc(''); setSelectedFile(null);
      setActiveTab('content');
    } catch (err) {
      console.error(err);
      showToast(t('errorToast'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteContent = async (item: ContentItem) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteFileFromStorage(item.url);
      await deleteContentItem(item.id, item.title, user!.uid, user!.name);
      showToast(t('successToast'), 'success');
    } catch (e) {
      showToast(t('errorToast'), 'error');
    }
  };

  const handleChangeRole = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!user) return;
    try {
      await updateUserRole(targetUser.uid, newRole, user.uid, user.name);
      showToast(t('successToast'), 'success');
    } catch (e) {
      showToast(t('errorToast'), 'error');
    }
  };

  const handleToggleBlock = async (targetUser: UserProfile) => {
    if (!user) return;
    const newStatus: UserStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
    try {
      await updateUserStatus(targetUser.uid, newStatus, user.uid, user.name);
      showToast(t('successToast'), 'success');
    } catch (e) {
      showToast(t('errorToast'), 'error');
    }
  };

  // Bulk Actions
  const handleSelectAllMembers = () => {
    if (selectedMembers.length === paginatedMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(paginatedMembers.map(m => m.uid));
    }
  };

  const handleToggleSelectMember = (uid: string) => {
    setSelectedMembers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  // CSV Export utility
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Name,Email,Role,Status,Joined\n';
    processedMembers.forEach(m => {
      csvContent += `"${m.name}","${m.email}","${m.role}","${m.status}","${m.createdAt || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMF_Members_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('successToast'), 'success');
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.name || !newMemberForm.email) return;
    showToast(t('successToast'), 'success');
    setShowAddMemberModal(false);
    setNewMemberForm({ name: '', email: '', role: 'user' });
  };

  const tabs = [
    { id: 'stats' as const, key: 'dashboard', icon: BarChart3, adminOnly: false },
    { id: 'upload' as const, key: 'uploadContent', icon: FolderPlus, adminOnly: true },
    { id: 'content' as const, key: 'content', icon: Video, adminOnly: true },
    { id: 'users' as const, key: 'users', icon: Users, adminOnly: 'super' as const },
    { id: 'logs' as const, key: 'logs', icon: FileText, adminOnly: 'super' as const },
  ];

  const visibleTabs = tabs.filter(t => {
    if (t.adminOnly === 'super') return isSuperAdmin;
    if (t.adminOnly) return isAdmin;
    return true;
  });

  if (authLoading || analytics.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin-fast" size={24} style={{ marginRight: 8, marginLeft: 8 }} />
        <span>{t('loadingDashboard')}</span>
      </div>
    );
  }

  const todayEvents = analytics.timeline.filter((event: ActivityEvent) => {
    const ts = new Date(event.timestamp).getTime();
    return ts >= Date.now() - 24 * 60 * 60 * 1000;
  }).length;

  const storageUsedGB = Math.round((analytics.storage.used / (1024 * 1024 * 1024)) * 10) / 10;
  const storageTotalGB = Math.round((analytics.storage.total / (1024 * 1024 * 1024)) * 10) / 10;
  const storagePercent = storageTotalGB ? Math.round((storageUsedGB / storageTotalGB) * 100) : 0;

  const statValues: Array<{ key: string; val: number; trend: number; sparklineColor: string; icon: any; trendLabel: string; suffix?: string; prefix?: string; sparklineData: number[] }> = [
    { key: 'membersCount', val: analytics.kpiCards[0]?.value ?? 0, trend: analytics.kpiCards[0]?.trend ?? 0, sparklineColor: 'var(--accent-indigo)', icon: Users, trendLabel: t('vsLastMonth'), sparklineData: analytics.membersGrowth.slice(-8).map(item => item.value) },
    { key: 'storageCapacity', val: storageUsedGB, trend: storagePercent, sparklineColor: 'var(--accent-amber)', icon: PieChart, suffix: ' GB', trendLabel: `${storagePercent}% ${t('usedOf')} ${storageTotalGB} GB`, sparklineData: analytics.contentUploads.slice(-8).map(item => item.videos + item.apps + item.files) },
    { key: 'activeToday', val: todayEvents, trend: todayEvents, sparklineColor: 'var(--accent-emerald)', icon: Activity, prefix: '+', trendLabel: t('todayActivity'), sparklineData: analytics.timeline.slice(0, 8).map((_, idx) => idx + 1) },
    { key: 'growthRate', val: analytics.viewsAnalytics.growth, trend: analytics.viewsAnalytics.growth, sparklineColor: 'var(--accent-purple)', icon: TrendingUp, suffix: '%', trendLabel: t('growthTrend'), sparklineData: analytics.viewsAnalytics.daily.slice(-8).map(item => item.value) },
  ];

  return (
    <div className="animate-fade dashboard-page" style={{ direction: rtl ? 'rtl' : 'ltr', padding: '32px 16px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* 4 Cards Hero Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {statValues.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="hero-card-wrap">
              <div className="card-base" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t(stat.key)}</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: `${stat.sparklineColor}15`, color: stat.sparklineColor }}>
                    <Icon size={18} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {stat.prefix}
                    <CountUp value={stat.val} />
                    {stat.suffix}
                  </div>
                  {/* Mini Sparkline charts */}
                  <MiniSparkline data={stat.sparklineData} color={stat.sparklineColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '32px' }}>
        
        {/* Navigation Tabs Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                  padding: '12px 16px',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'nowrap',
                  transition: 'all 200ms ease',
                }}
              >
                <Icon size={16} />
                <span>{t(tab.key)}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Stats & Overview (Two-column main layout) */}
        {activeTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            
            {/* Left Column (60% width target) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flexGrow: 2 }}>
              {/* Activity feed list */}
              <div className="card-base" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', flexDirection: rtl ? 'row' : 'row-reverse' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{t('recentActivity')}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('liveMonitor')}</span>
                  </div>
                  
                  {/* Filter segments tab */}
                  <div style={{ display: 'flex', background: 'var(--badge-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px', gap: '2px' }}>
                    {(['الكل', 'تسجيلات', 'محتوى', 'نظام'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActivityFilter(tab)}
                        style={{
                          background: activityFilter === tab ? 'var(--bg-elevated)' : 'transparent',
                          border: 'none',
                          boxShadow: activityFilter === tab ? 'var(--shadow-sm)' : 'none',
                          color: activityFilter === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontSize: '0.74rem',
                          fontWeight: activityFilter === tab ? 600 : 400,
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {tab === 'الكل' ? (rtl ? 'الكل' : 'All') :
                         tab === 'تسجيلات' ? (rtl ? 'تسجيلات' : 'Logins') :
                         tab === 'محتوى' ? (rtl ? 'المحتوى' : 'Content') :
                         (rtl ? 'النظام' : 'System')}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredActivity.slice(0, 5).map((act, idx) => {
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: '16px', borderBottom: idx < 4 ? '1px solid var(--border-light)' : 'none', paddingBottom: '12px', flexDirection: rtl ? 'row' : 'row' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 'var(--text-xs)' }}>
                          {act.user?.charAt(0) || 'U'}
                        </div>
                        <div style={{ flex: 1, textAlign: rtl ? 'right' : 'left' }}>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{act.user}</span>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{act.description}</p>
                        </div>
                        <div style={{ textAlign: rtl ? 'left' : 'right', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>{rtl ? 'منذ ساعة' : '1 hr ago'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredActivity.length === 0 && (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      <Inbox size={24} style={{ marginBottom: '8px' }} />
                      <p style={{ margin: 0 }}>{t('noMembersFound')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (40% width target) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flexGrow: 1 }}>
              
              {/* Member Growth Area Chart */}
              <div className="card-base" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', textAlign: rtl ? 'right' : 'left' }}>{t('memberGrowthChart')}</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '16px', textAlign: rtl ? 'right' : 'left' }}>{t('dailySignups')}</span>
                
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={analytics.membersGrowth} margin={{ left: rtl ? -30 : -30, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-indigo)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => v ? v.slice(5) : ''} axisLine={false} tickLine={false} />
                    <YAxis orientation={rtl ? 'right' : 'left'} tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: 'var(--radius-sm)' }} />
                    <Area type="monotone" dataKey="value" stroke="var(--accent-indigo)" strokeWidth={2} fill="url(#indigoGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Storage distribution Donut Chart */}
              <div className="card-base" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textAlign: rtl ? 'right' : 'left' }}>{t('storageDistChart')}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={[
                            { name: t('videos'), value: analytics.storage.videos / (1024 * 1024 * 1024), color: 'var(--accent-indigo)' },
                            { name: t('apps'), value: analytics.storage.apps / (1024 * 1024 * 1024), color: 'var(--accent-emerald)' },
                            { name: t('files'), value: analytics.storage.files / (1024 * 1024 * 1024), color: 'var(--accent-amber)' },
                          ]}
                          dataKey="value"
                          innerRadius={38}
                          outerRadius={50}
                          paddingAngle={4}
                        >
                          <Cell fill="var(--accent-indigo)" />
                          <Cell fill="var(--accent-emerald)" />
                          <Cell fill="var(--accent-amber)" />
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', pointerEvents: 'none' }}>
                      <span>45.2 GB</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>of 50GB</span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{t('videos')}: {Math.round((analytics.storage.videos / (1024 * 1024 * 1024)) * 10) / 10} GB</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{t('apps')}: {Math.round((analytics.storage.apps / (1024 * 1024 * 1024)) * 10) / 10} GB</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{t('files')}: {Math.round((analytics.storage.files / (1024 * 1024 * 1024)) * 10) / 10} GB</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contribution Activity Heatmap */}
              <div className="card-base" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', textAlign: rtl ? 'right' : 'left' }}>{t('activityHeatmap')}</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', textAlign: rtl ? 'right' : 'left' }}>{t('heatmapSubtitle')}</span>
                <ContributionHeatmap events={analytics.timeline} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Upload Content Manager */}
        {activeTab === 'upload' && isAdmin && (
          <div className="card-base animate-scale" style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexDirection: rtl ? 'row' : 'row' }}>
              <Upload size={18} style={{ color: 'var(--accent-indigo)' }} />
              <span>{t('uploadContent')}</span>
            </h3>
            
            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="upload-title" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {rtl ? 'عنوان المحتوى' : 'Title'}
                </label>
                <input
                  id="upload-title"
                  type="text"
                  placeholder={rtl ? 'مثال: إعدادات كاميرات المراقبة DVR' : 'e.g. Security Camera Guide'}
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label htmlFor="upload-desc" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {rtl ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  id="upload-desc"
                  rows={4}
                  placeholder={rtl ? 'اكتب معلومات إضافية للمساعدة...' : 'Write brief description...'}
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label htmlFor="upload-type" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {rtl ? 'النوع' : 'Type'}
                  </label>
                  <select
                    id="upload-type"
                    value={uploadType}
                    onChange={e => setUploadType(e.target.value as 'video' | 'app' | 'other')}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="video">{rtl ? '🎥 فيديو تعليمي' : '🎥 Training Video'}</option>
                    <option value="app">{rtl ? '📱 تطبيق مسجل' : '📱 Desktop/Mobile App'}</option>
                    <option value="other">{rtl ? '📎 ملف إضافي' : '📎 Other Document'}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="upload-file" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {rtl ? 'اختر ملف' : 'Choose File'}
                  </label>
                  <input
                    id="upload-file"
                    type="file"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              {uploading && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>{rtl ? 'جاري رفع الملف...' : 'Uploading file...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent-indigo)', transition: 'width 200ms ease' }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                style={{
                  marginTop: '16px',
                  alignSelf: 'flex-start',
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {uploading ? <Loader2 className="animate-spin-fast" size={16} /> : <Plus size={16} />}
                <span>{t('publishContent')}</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Digital Library content list manager */}
        {activeTab === 'content' && isAdmin && (
          <div className="card-base animate-scale" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>{t('content')}</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: rtl ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '12px 16px' }}>{rtl ? 'اسم الملف' : 'Filename'}</th>
                    <th style={{ padding: '12px 16px' }}>{rtl ? 'النوع' : 'Type'}</th>
                    <th style={{ padding: '12px 16px' }}>{rtl ? 'المشاهدات' : 'Views'}</th>
                    <th style={{ padding: '12px 16px' }}>{rtl ? 'التنزيلات' : 'Downloads'}</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {contents.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '16px' }}>{item.title}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          background: item.type === 'video' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: item.type === 'video' ? 'var(--accent-purple)' : 'var(--accent-emerald)',
                        }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>{item.views || 0}</td>
                      <td style={{ padding: '16px' }}>{item.downloads || 0}</td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteContent(item)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}
                          title="حذف"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Users Administration Table */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="card-base animate-scale" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
            
            {/* Table actions bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', flexDirection: rtl ? 'row' : 'row-reverse' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{t('memberList')}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('memberListSubtitle')}</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder={t('searchLabel')}
                  value={membersSearch}
                  onChange={e => { setMembersSearch(e.target.value); setMembersPage(1); }}
                  style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: 'var(--text-sm)', minWidth: '200px' }}
                />
                
                <button
                  onClick={exportToCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--badge-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-sm)' }}
                >
                  <FileDown size={14} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: rtl ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '12px 16px', width: '40px' }}>
                      <button onClick={handleSelectAllMembers} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {selectedMembers.length === paginatedMembers.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => setMembersSort({ field: 'name', desc: membersSort.field === 'name' ? !membersSort.desc : false })}>
                      {t('name')} {membersSort.field === 'name' && (membersSort.desc ? '↓' : '↑')}
                    </th>
                    <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => setMembersSort({ field: 'email', desc: membersSort.field === 'email' ? !membersSort.desc : false })}>
                      {t('email')} {membersSort.field === 'email' && (membersSort.desc ? '↓' : '↑')}
                    </th>
                    <th style={{ padding: '12px 16px' }}>{t('role')}</th>
                    <th style={{ padding: '12px 16px' }}>{t('status')}</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((member) => {
                    const isSelected = selectedMembers.includes(member.uid);
                    return (
                      <tr key={member.uid} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: isSelected ? 'var(--sidebar-active)' : 'transparent' }}>
                        <td style={{ padding: '16px' }}>
                          <button onClick={() => handleToggleSelectMember(member.uid)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {isSelected ? <CheckSquare size={16} style={{ color: 'var(--accent-indigo)' }} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 600 }}>{member.name}</td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{member.email}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                            background: member.role === 'super_admin' ? 'rgba(245, 158, 11, 0.12)' : member.role === 'admin' ? 'rgba(79, 70, 229, 0.12)' : 'var(--badge-bg)',
                            color: member.role === 'super_admin' ? 'var(--accent-amber)' : member.role === 'admin' ? 'var(--accent-indigo)' : 'var(--text-secondary)'
                          }}>
                            {member.role === 'super_admin' ? t('roleSuperAdmin') : member.role === 'admin' ? t('roleAdmin') : t('roleUser')}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                            background: member.status === 'blocked' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: member.status === 'blocked' ? 'var(--accent-red)' : 'var(--accent-emerald)'
                          }}>
                            {member.status === 'blocked' ? t('blockedStatus') : t('activeStatus')}
                          </span>
                        </td>
                        <td style={{ padding: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {member.role !== 'super_admin' && (
                            <>
                              <button
                                onClick={() => handleChangeRole(member, member.role === 'admin' ? 'user' : 'admin')}
                                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                {t('changeRole')}
                              </button>
                              <button
                                onClick={() => handleToggleBlock(member)}
                                style={{
                                  background: member.status === 'blocked' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                  border: 'none',
                                  color: member.status === 'blocked' ? 'var(--accent-emerald)' : 'var(--accent-red)',
                                  padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                                }}
                              >
                                {member.status === 'blocked' ? t('unblockUser') : t('blockUser')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {processedMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <Inbox size={32} style={{ marginBottom: '12px' }} />
                        <p style={{ margin: 0 }}>{t('noMembersFound')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            {processedMembers.length > 10 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flexDirection: rtl ? 'row' : 'row' }}>
                <span>
                  {t('showing')
                    .replace('{start}', String((membersPage - 1) * 10 + 1))
                    .replace('{end}', String(Math.min(membersPage * 10, processedMembers.length)))
                    .replace('{total}', String(processedMembers.length))}
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={membersPage === 1}
                    onClick={() => setMembersPage(p => p - 1)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: membersPage === 1 ? 0.5 : 1 }}
                  >
                    {rtl ? 'السابق' : 'Previous'}
                  </button>
                  <button
                    disabled={membersPage === totalMembersPages}
                    onClick={() => setMembersPage(p => p + 1)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: membersPage === totalMembersPages ? 0.5 : 1 }}
                  >
                    {rtl ? 'التالي' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Audit logs list */}
        {activeTab === 'logs' && isSuperAdmin && (
          <div className="card-base animate-scale" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>
              {t('logs')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
              {auditLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--badge-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', flexDirection: rtl ? 'row' : 'row' }}>
                  <div style={{ textAlign: rtl ? 'right' : 'left' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.userName}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', fontSize: '0.68rem', margin: '0 8px' }}>
                      {log.action}
                    </span>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{log.description}</p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    {new Date(log.createdAt).toLocaleString(rtl ? 'ar-EG' : 'en-US')}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <ClipboardList size={32} style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0 }}>{t('noMembersFound')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Panel (bottom-right) */}
      <div style={{ position: 'fixed', bottom: '32px', right: rtl ? 'auto' : '32px', left: rtl ? '32px' : 'auto', zIndex: 100 }}>
        {showQuickActions && (
          <div className="glass-card animate-scale" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', marginBottom: '12px', minWidth: '160px' }}>
            <button onClick={() => { setShowQuickActions(false); setShowAddMemberModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', textAlign: rtl ? 'right' : 'left' }}>
              <UserPlus size={14} style={{ color: 'var(--accent-indigo)' }} />
              <span>{t('addMemberBtn')}</span>
            </button>
            <button onClick={() => { setShowQuickActions(false); exportToCSV(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', textAlign: rtl ? 'right' : 'left' }}>
              <Download size={14} style={{ color: 'var(--accent-emerald)' }} />
              <span>{t('bulkImport')}</span>
            </button>
            <button onClick={() => { setShowQuickActions(false); showToast(t('successToast'), 'success'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', textAlign: rtl ? 'right' : 'left' }}>
              <Bell size={14} style={{ color: 'var(--accent-amber)' }} />
              <span>{t('sendNotification')}</span>
            </button>
            <button onClick={() => { setShowQuickActions(false); navigate('/settings'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', textAlign: rtl ? 'right' : 'left' }}>
              <Settings size={14} style={{ color: 'var(--text-secondary)' }} />
              <span>{t('quickSettings')}</span>
            </button>
          </div>
        )}
        
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-xl)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 200ms ease',
            transform: showQuickActions ? 'rotate(45deg)' : 'none',
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            background: 'rgba(2, 6, 23, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            direction: rtl ? 'rtl' : 'ltr',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddMemberModal(false); }}
        >
          <div className="glass-card animate-scale" style={{ background: 'var(--bg-elevated)', width: '100%', maxWidth: '440px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-hover)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexDirection: rtl ? 'row' : 'row-reverse' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('addMemberBtn')}</h3>
              <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddMemberSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textAlign: rtl ? 'right' : 'left' }}>{t('name')}</label>
                <input
                  type="text"
                  value={newMemberForm.name}
                  onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textAlign: rtl ? 'right' : 'left' }}>{t('email')}</label>
                <input
                  type="email"
                  value={newMemberForm.email}
                  onChange={e => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textAlign: rtl ? 'right' : 'left' }}>{t('role')}</label>
                <select
                  value={newMemberForm.role}
                  onChange={e => setNewMemberForm({ ...newMemberForm, role: e.target.value as UserRole })}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="user">{t('roleUser')}</option>
                  <option value="admin">{t('roleAdmin')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: rtl ? 'flex-start' : 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {rtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', background: 'var(--gradient-primary)', border: 'none', color: 'white', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {rtl ? 'إضافة العضو' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
