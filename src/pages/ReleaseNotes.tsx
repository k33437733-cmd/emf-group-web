import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToReleases, createRelease, deleteRelease } from '../firebase/db';
import { createNotification } from '../firebase/db';
import type { ReleaseNote, ReleaseChange, ChangeType } from '../types';
import {
  Plus, Search, X, Loader2, Trash2, Tag, Calendar,
  User, ArrowUp, ArrowDown, Megaphone,
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';

const CHANGE_TYPE_CONFIG: Record<ChangeType, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Added:       { label: 'إضافة',       color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: '✦' },
  Improved:    { label: 'تحسين',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  icon: '↑' },
  Fixed:       { label: 'إصلاح',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: '✓' },
  Removed:     { label: 'إزالة',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: '✕' },
  Security:    { label: 'أمان',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)',  icon: '🛡' },
  Performance: { label: 'أداء',        color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)',   icon: '⚡' },
};

const CHANGE_TYPES: ChangeType[] = ['Added', 'Improved', 'Fixed', 'Removed', 'Security', 'Performance'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
  return formatDate(iso);
}

export default function ReleaseNotes() {
  const { user } = useAuth();

  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formVersion, setFormVersion] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formChanges, setFormChanges] = useState<ReleaseChange[]>([{ title: '', description: '', type: 'Added' }]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  useEffect(() => {
    const unsub = subscribeToReleases((data) => {
      setReleases(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddChange = () => {
    setFormChanges(prev => [...prev, { title: '', description: '', type: 'Added' }]);
  };

  const handleRemoveChange = (idx: number) => {
    setFormChanges(prev => prev.filter((_, i) => i !== idx));
  };

  const handleChangeField = (idx: number, field: keyof ReleaseChange, value: string) => {
    setFormChanges(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formVersion.trim() || !formTitle.trim() || !formSummary.trim()) return;
    const validChanges = formChanges.filter(c => c.title.trim());
    if (validChanges.length === 0) return;

    setCreating(true);
    try {
      await createRelease({
        version: formVersion.trim(),
        title: formTitle.trim(),
        summary: formSummary.trim(),
        date: new Date().toISOString(),
        author: user.name || user.email || 'مستخدم',
        authorId: user.uid,
        category: formCategory,
        changes: validChanges,
      });

      await createNotification({
        recipientId: user.uid,
        type: 'system',
        category: 'updates',
        priority: 'high',
        title: `تحديث جديد: v${formVersion.trim()}`,
        body: formTitle.trim(),
        link: '/admin/release-notes',
        channel: 'in_app',
      });

      showToast('تم إصدار التحديث بنجاح', 'success');
      setShowCreate(false);
      setFormVersion('');
      setFormTitle('');
      setFormSummary('');
      setFormCategory('general');
      setFormChanges([{ title: '', description: '', type: 'Added' }]);
    } catch {
      showToast('فشل إنشاء الإصدار', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإصدار؟')) return;
    try {
      await deleteRelease(id);
      showToast('تم حذف الإصدار', 'success');
    } catch {
      showToast('فشل حذف الإصدار', 'error');
    }
  };

  useMemo(() => [...new Set(releases.map(r => r.version))], [releases]);

  const filtered = useMemo(() => {
    let list = [...releases];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(r =>
        r.version.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.changes.some(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      );
    }
    if (sortAsc) list.reverse();
    return list;
  }, [releases, searchQuery, sortAsc]);

  if (loading) {
    return (
      <div className="page-wrapper page-enter" style={{ direction: 'rtl' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="page-title">سجل الإصدارات</h1>
          <p className="body-text" style={{ marginTop: 'var(--space-2)' }}>جاري تحميل سجل الإصدارات...</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-base" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="skeleton" style={{ width: '30%', height: '24px', borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton" style={{ width: '60%', height: '18px', borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: 'var(--radius-sm)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper page-enter" style={{ direction: 'rtl' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)',
      }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Megaphone size={28} style={{ color: 'var(--accent-blue)' }} />
            سجل الإصدارات
          </h1>
          <p className="body-text" style={{ marginTop: 'var(--space-2)' }}>
            تتبع جميع تحديثات وتطويرات المنصة
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus size={16} /> إصدار جديد
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        marginBottom: 'var(--space-8)', flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1, minWidth: '220px', maxWidth: '360px',
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          background: 'var(--input-bg)', border: '1px solid var(--input-border)',
          borderRadius: 'var(--radius-md)', padding: '0 var(--space-3)',
          transition: 'border-color 0.2s ease',
        }}>
          <Search size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في الإصدارات..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
              padding: '8px 0', fontFamily: 'inherit',
            }}
            onFocus={e => { (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--accent-blue)'; }}
            onBlur={e => { (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--input-border)'; }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSortAsc(s => !s)}
            className="btn btn-ghost btn-sm"
            style={{ gap: 'var(--space-1)' }}
            title="ترتيب"
          >
            {sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {sortAsc ? 'الأقدم' : 'الأحدث'}
          </button>
        </div>
      </div>

      {/* ── Releases Timeline ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={48} />}
          title={searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد إصدارات بعد'}
          message={searchQuery ? 'حاول تغيير كلمات البحث' : 'سجل الإصدارات سيكون متاحاً هنا عند إصدار أول تحديث'}
          action={isAdmin && !searchQuery ? (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <Plus size={16} /> إصدار جديد
            </button>
          ) : undefined}
        />
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', right: '15px', top: '24px', bottom: '24px',
            width: '2px', background: 'var(--border-color)',
            borderRadius: '1px',
          }} />

          {filtered.map((release, idx) => {
            const grouped = CHANGE_TYPES
              .map(t => ({ type: t, changes: release.changes.filter(c => c.type === t) }))
              .filter(g => g.changes.length > 0);

            return (
              <div
                key={release.id}
                className="anim-fade-up"
                style={{
                  position: 'relative',
                  paddingRight: '44px',
                  paddingBottom: idx < filtered.length - 1 ? 'var(--space-8)' : 'var(--space-4)',
                  animation: `fadeIn 0.4s ease forwards`,
                  animationDelay: `${idx * 0.06}s`,
                  opacity: 0,
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', right: '7px', top: '28px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'var(--bg-card)',
                  border: '2px solid var(--accent-blue)',
                  zIndex: 1,
                }} />

                {/* Card */}
                <div className="card-base" style={{
                  padding: 'var(--space-6)',
                  transition: 'all var(--transition-base)',
                }}>
                  {/* Card header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
                        padding: '4px 12px', borderRadius: 'var(--radius-full)',
                        background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)',
                        fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-en)',
                        direction: 'ltr',
                      }}>
                        <Tag size={12} />
                        {release.version}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                        fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                      }}>
                        <Calendar size={12} />
                        {getRelativeTime(release.date)}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                        fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                      }}>
                        <User size={12} />
                        {release.author}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(release.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-red)', padding: '4px 8px' }}
                          title="حذف الإصدار"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & summary */}
                  <h3 style={{
                    fontSize: 'var(--text-2xl)', fontWeight: 700,
                    color: 'var(--text-primary)', marginBottom: 'var(--space-2)',
                    lineHeight: 'var(--lh-tight)',
                  }}>
                    {release.title}
                  </h3>
                  <p style={{
                    fontSize: 'var(--text-base)', color: 'var(--text-secondary)',
                    lineHeight: 'var(--lh-relaxed)', marginBottom: 'var(--space-6)',
                  }}>
                    {release.summary}
                  </p>

                  {/* Change log sections */}
                  {grouped.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                      {grouped.map(group => {
                        const cfg = CHANGE_TYPE_CONFIG[group.type];
                        return (
                          <div key={group.type}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                              marginBottom: 'var(--space-3)',
                            }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
                                padding: '2px 10px', borderRadius: 'var(--radius-full)',
                                background: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                fontSize: 'var(--text-xs)', fontWeight: 700,
                              }}>
                                {cfg.icon} {cfg.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                              {group.changes.map((change, ci) => (
                                <div
                                  key={ci}
                                  style={{
                                    padding: 'var(--space-3) var(--space-4)',
                                    background: 'var(--badge-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    borderRight: `3px solid ${cfg.color}`,
                                  }}
                                >
                                  <div style={{
                                    fontSize: 'var(--text-sm)', fontWeight: 600,
                                    color: 'var(--text-primary)', marginBottom: change.description ? 'var(--space-1)' : 0,
                                  }}>
                                    {change.title}
                                  </div>
                                  {change.description && (
                                    <div style={{
                                      fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                                      lineHeight: 'var(--lh-relaxed)',
                                    }}>
                                      {change.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Release Modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="modal-content-custom" style={{ maxWidth: 'min(580px, calc(100vw - 32px))', direction: 'rtl' }}>
            <div className="modal-header-custom">
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Megaphone size={18} style={{ color: 'var(--accent-blue)' }} />
                إصدار جديد
              </h3>
              <button onClick={() => setShowCreate(false)} className="modal-close-btn" aria-label="إغلاق">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body-custom" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label className="form-label">رقم الإصدار *</label>
                    <input
                      type="text" className="form-input" required
                      value={formVersion} onChange={e => setFormVersion(e.target.value)}
                      placeholder="مثال: 2.1.0"
                      style={{ fontFamily: 'var(--font-en)', direction: 'ltr' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">التصنيف</label>
                    <select
                      className="form-input"
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      style={{ fontFamily: 'inherit' }}
                    >
                      <option value="general">عام</option>
                      <option value="feature">ميزة جديدة</option>
                      <option value="improvement">تحسين</option>
                      <option value="bugfix">إصلاح أخطاء</option>
                      <option value="security">تحديث أمني</option>
                      <option value="performance">تحسين أداء</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">عنوان الإصدار *</label>
                  <input
                    type="text" className="form-input" required
                    value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="ملخص قصير للإصدار"
                  />
                </div>

                <div>
                  <label className="form-label">الوصف *</label>
                  <textarea
                    className="form-input" required
                    value={formSummary} onChange={e => setFormSummary(e.target.value)}
                    placeholder="شرح تفصيلي للتحديثات في هذا الإصدار..."
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>التغييرات *</label>
                    <button type="button" onClick={handleAddChange} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-blue)' }}>
                      <Plus size={13} /> إضافة تغيير
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {formChanges.map((change, idx) => (
                      <div key={idx} style={{
                        padding: 'var(--space-3)',
                        background: 'var(--badge-bg)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                      }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                          <select
                            value={change.type}
                            onChange={e => handleChangeField(idx, 'type', e.target.value)}
                            style={{
                              background: CHANGE_TYPE_CONFIG[change.type as ChangeType]?.bg || 'transparent',
                              color: CHANGE_TYPE_CONFIG[change.type as ChangeType]?.color || 'var(--text-primary)',
                              border: `1px solid ${CHANGE_TYPE_CONFIG[change.type as ChangeType]?.border || 'var(--border-color)'}`,
                              borderRadius: 'var(--radius-sm)', padding: '4px 8px',
                              fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                            }}
                          >
                            {CHANGE_TYPES.map(t => (
                              <option key={t} value={t}>{CHANGE_TYPE_CONFIG[t].label}</option>
                            ))}
                          </select>
                          {formChanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChange(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', marginRight: 'auto' }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text" className="form-input" required
                          value={change.title} onChange={e => handleChangeField(idx, 'title', e.target.value)}
                          placeholder="عنوان التغيير"
                          style={{ marginBottom: 'var(--space-1)', padding: '6px 10px', fontSize: 'var(--text-sm)' }}
                        />
                        <input
                          type="text" className="form-input"
                          value={change.description} onChange={e => handleChangeField(idx, 'description', e.target.value)}
                          placeholder="وصف إضافي (اختياري)"
                          style={{ padding: '6px 10px', fontSize: 'var(--text-xs)' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary" disabled={creating}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="animate-spin-fast" size={16} /> : 'نشر الإصدار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .anim-fade-up {
          animation: fadeIn 0.4s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
