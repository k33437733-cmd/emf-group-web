import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToContents, incrementContentViews, incrementContentDownloads, updateContentItem, deleteContentItem } from '../firebase/db';
import { uploadFile, deleteFileFromStorage } from '../firebase/storage';
import type { ContentItem } from '../types';
import { Search, Video, Download, Play, Monitor, FileText, Share2, Eye, X, Filter, Inbox, Edit3, EyeOff, Shield, Trash2 } from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import LazyVideo from '../components/ui/LazyVideo';
import { SkeletonGrid } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function Content() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'app' | 'other'>('all');

  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('');
  const [editContentItem, setEditContentItem] = useState<ContentItem | null>(null);
  const [editContentForm, setEditContentForm] = useState({
    title: '',
    description: '',
    type: 'video' as ContentItem['type'],
    accessLevel: 'all' as ContentItem['accessLevel'],
    downloadProtected: false,
    file: null as File | null,
  });
  const [editUploading, setEditUploading] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);

  const canUseAdminDownload = !!user && ['admin', 'super_admin'].includes(user.role);
  const isAdmin = !!user && (user.role === 'admin' || user.role === 'super_admin');

  useEffect(() => {
    const unsub = subscribeToContents((list) => {
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = [...items];
    if (selectedType !== 'all') result = result.filter(item => item.type === selectedType);
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(item =>
        (item.title || '').toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term)
      );
    }
    setFilteredItems(result);
  }, [items, search, selectedType]);

  const handleDownload = async (item: ContentItem) => {
    if (item.downloadProtected && !canUseAdminDownload) {
      showToast('هذا المحتوى محمي من التنزيل.', 'warning');
      return;
    }

    try {
      await incrementContentDownloads(item.id);
      window.open(item.url, '_blank');
      showToast('بدأ تحميل الملف المختار...', 'success');
    } catch (e) {
      showToast('فشل بدء التحميل', 'error');
    }
  };

  const handlePlayVideo = async (item: ContentItem) => {
    try {
      await incrementContentViews(item.id);
      setActiveVideoUrl(item.url);
      setActiveVideoTitle(item.title);
    } catch (e) { /* ignore */ }
  };

  const openEditContentModal = (item: ContentItem) => {
    setEditContentItem(item);
    setEditContentForm({
      title: item.title,
      description: item.description,
      type: item.type,
      accessLevel: item.accessLevel,
      downloadProtected: item.downloadProtected || false,
      file: null,
    });
  };

  const handleEditContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContentItem || !user) return;

    setEditUploading(true);
    setEditUploadProgress(0);

    try {
      const updates: Partial<ContentItem> = {
        title: editContentForm.title.trim(),
        description: editContentForm.description.trim(),
        type: editContentForm.type,
        accessLevel: editContentForm.accessLevel,
        downloadProtected: editContentForm.downloadProtected,
      };

      if (editContentForm.file) {
        const downloadUrl = await uploadFile(editContentForm.file, editContentForm.type, (progress) => setEditUploadProgress(progress));
        updates.url = downloadUrl;
        updates.fileName = editContentForm.file.name;
        updates.fileSize = editContentForm.file.size;
        updates.fileType = editContentForm.file.name.split('.').pop() || '';
      }

      await updateContentItem(editContentItem.id, updates, user.uid, user.name);
      showToast('تم حفظ التغييرات بنجاح', 'success');
      setEditContentItem(null);
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ المحتوى', 'error');
    } finally {
      setEditUploading(false);
      setEditUploadProgress(0);
    }
  };

  const handleToggleHideContent = async (item: ContentItem) => {
    if (!user) return;
    try {
      await updateContentItem(item.id, { accessLevel: item.accessLevel === 'all' ? 'admin' : 'all' }, user.uid, user.name);
      showToast(item.accessLevel === 'all' ? 'تم إخفاء المحتوى عن المستخدمين العاديين' : 'تم إظهار المحتوى مرة أخرى', 'success');
    } catch (err) {
      showToast('فشل تحديث حالة الرؤية', 'error');
    }
  };

  const handleToggleDownloadProtection = async (item: ContentItem) => {
    if (!user) return;
    try {
      await updateContentItem(item.id, { downloadProtected: !item.downloadProtected }, user.uid, user.name);
      showToast(item.downloadProtected ? 'تم إزالة حماية التنزيل' : 'تم تفعيل حماية التنزيل', 'success');
    } catch (err) {
      showToast('فشل تحديث حماية التنزيل', 'error');
    }
  };

  const handleDeleteContent = async (item: ContentItem) => {
    if (!user || !window.confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;
    try {
      await deleteFileFromStorage(item.url);
      await deleteContentItem(item.id, item.title, user.uid, user.name);
      showToast('تم حذف المحتوى بنجاح', 'success');
    } catch (err) {
      console.error(err);
      showToast('فشل حذف المحتوى', 'error');
    }
  };

  const handleShare = (item: ContentItem, platform: 'whatsapp' | 'facebook') => {
    const text = `تفضل بمشاهدة وتحميل "${item.title}" من EMF Group:`;
    const url = window.location.origin + `/content#${item.id}`;
    const shareUrl = platform === 'whatsapp'
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    showToast('تم فتح نافذة المشاركة', 'info');
  };

  useEffect(() => {
    if (activeVideoUrl) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [activeVideoUrl]);

  const filterButtons = [
    { id: 'all' as const, label: 'الكل', icon: Filter },
    { id: 'video' as const, label: 'الفيديوهات', icon: Video },
    { id: 'app' as const, label: 'التطبيقات', icon: Monitor },
    { id: 'other' as const, label: 'ملفات أخرى', icon: FileText },
  ];

  return (
    <div className="page-wrapper page-enter content-library-shell" style={{ direction: 'rtl' }}>
      <div className="content-library-header">
        <h1 className="page-title">المكتبة الرقمية</h1>
        <p className="body-text" style={{ marginTop: 'var(--space-2)', maxWidth: '720px' }}>
          مستودع الفيديوهات، التطبيقات والملفات الرسمية الخاصة بالعمل مع تجربة تصفح حديثة وسريعة
        </p>
      </div>

      <div className="content-library-toolbar" role="search" aria-label="بحث في المحتوى">
        <div className="content-library-toolbar__row">
          <div className="content-library-toolbar__search">
            <input
              type="text"
              className="form-input"
              style={{ paddingRight: '40px', fontSize: 'var(--text-sm)' }}
              placeholder="بحث باسم الملف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="بحث باسم الملف"
            />
            <Search size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            {search && (
              <button onClick={() => setSearch('')} className="btn btn-icon btn-sm btn-ghost" style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="content-library-toolbar__filters">
            {filterButtons.map(btn => {
              const Icon = btn.icon;
              const active = selectedType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setSelectedType(btn.id)}
                  aria-pressed={active}
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '40px' }}
                >
                  <Icon size={14} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Inbox size={48} />}
          title={search || selectedType !== 'all' ? 'لا توجد نتائج' : 'المكتبة فارغة'}
          message={search || selectedType !== 'all' ? 'لم يتم العثور على ملفات تطابق معايير البحث.' : 'لم يتم رفع أي ملفات بعد، تحقق لاحقاً.'}
        />
      ) : (
        <div className="content-library-grid">
          {filteredItems.map(item => {
            const isVideo = item.type === 'video';
            const colors: Record<string, { bg: string; icon: string; gradient: string }> = {
              video: { bg: 'rgba(59,130,246,0.08)', icon: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(30,64,175,0.24))' },
              app: { bg: 'rgba(245,158,11,0.08)', icon: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(76,29,149,0.24))' },
              other: { bg: 'rgba(6,182,212,0.08)', icon: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(8,79,96,0.24))' },
            };
            const c = colors[item.type] || colors.other;

            return (
              <article key={item.id} id={item.id} className="card-base content-card">
                <div className="content-card__media" style={{ background: c.gradient }}>
                  {isVideo ? (
                    <LazyVideo src={item.url} />
                  ) : (
                    <div className="content-card__media-placeholder">
                      <div className="content-card__media-placeholder-icon">
                        <Download size={20} />
                      </div>
                      <span>{item.type === 'app' ? 'Application' : 'File'}</span>
                    </div>
                  )}

                  {isVideo && (
                    <div className="content-card__media-overlay">
                      <button onClick={() => handlePlayVideo(item)} className="content-card__play-btn">
                        <Play size={20} style={{ marginRight: '-2px', fill: '#fff' }} />
                      </button>
                    </div>
                  )}

                  <span className="content-card__type-badge" style={{ color: c.icon }}>
                    {item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'}
                  </span>
                </div>

                <div className="content-card__body">
                  <div className="content-card__header">
                    <h4 className="content-card__title">{item.title}</h4>
                    <p className="content-card__description">
                      {item.description || 'لا يوجد وصف متاح.'}
                    </p>
                  </div>

                  <div className="content-card__meta">
                    <span>{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                    <div className="content-card__meta-stats">
                      <span className="content-card__meta-pill"><Eye size={12} />{item.views || 0}</span>
                      <span className="content-card__meta-pill"><Download size={12} />{item.downloads || 0}</span>
                    </div>
                  </div>

                  <div className="content-card__actions">
                    {isVideo ? (
                      <button onClick={() => handlePlayVideo(item)} className="btn btn-primary content-card__main-action">
                        <Play size={14} style={{ fill: '#fff' }} /> عرض الفيديو
                      </button>
                    ) : (
                      <button onClick={() => handleDownload(item)} className="btn btn-primary content-card__main-action" disabled={item.downloadProtected && !canUseAdminDownload} style={{ opacity: item.downloadProtected && !canUseAdminDownload ? 0.55 : 1 }}>
                        <Download size={14} /> تنزيل
                      </button>
                    )}
                    <button onClick={() => handleDownload(item)} title={item.downloadProtected ? 'محتوى محمي من التنزيل' : 'تحميل مباشر'} className="btn btn-secondary btn-icon content-card__icon-action" disabled={item.downloadProtected && !canUseAdminDownload} style={{ opacity: item.downloadProtected && !canUseAdminDownload ? 0.55 : 1 }}>
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleShare(item, 'whatsapp')} title="مشاركة واتساب" className="btn btn-ghost btn-icon content-card__icon-action content-card__icon-action--share">
                      <Share2 size={14} />
                    </button>
                  </div>

                  {isAdmin && (
                    <div className="content-card__admin-actions">
                      <button onClick={() => openEditContentModal(item)} className="content-card__admin-btn content-card__admin-btn--edit">
                        <Edit3 size={14} /> تعديل
                      </button>
                      <button onClick={() => handleToggleHideContent(item)} className={`content-card__admin-btn ${item.accessLevel === 'all' ? 'content-card__admin-btn--warn' : 'content-card__admin-btn--danger'}`}>
                        {item.accessLevel === 'all' ? <EyeOff size={14} /> : <Eye size={14} />} {item.accessLevel === 'all' ? 'إخفاء' : 'إظهار'}
                      </button>
                      <button onClick={() => handleToggleDownloadProtection(item)} className={`content-card__admin-btn ${item.downloadProtected ? 'content-card__admin-btn--danger' : 'content-card__admin-btn--success'}`}>
                        <Shield size={14} /> {item.downloadProtected ? 'إلغاء حماية' : 'حماية تنزيل'}
                      </button>
                      <button onClick={() => handleDeleteContent(item)} className="content-card__admin-btn content-card__admin-btn--delete">
                        <Trash2 size={14} /> حذف
                      </button>
                    </div>
                  )}
                  {item.downloadProtected && (
                    <div className="content-card__protected-badge">هذا المحتوى محمي من التنزيل</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Video Lightbox */}
      {activeVideoUrl && createPortal(
        <div role="dialog" aria-modal="true" aria-label="مشغل الفيديو" style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-6)',
        }} onClick={() => setActiveVideoUrl(null)} onKeyDown={(e) => { if (e.key === 'Escape') setActiveVideoUrl(null); }}>
          <div style={{ width: '100%', maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            onClick={(e) => e.stopPropagation()} className="animate-scale">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'white', margin: 0 }}>{activeVideoTitle}</h3>
              <button onClick={() => setActiveVideoUrl(null)} className="modal-close-btn" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'white' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{
              background: '#000', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)', aspectRatio: '16/9',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <video src={activeVideoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        </div>,
        document.body
      )}


        {editContentItem && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-content-title"
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(9, 13, 22, 0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
            }}
            onClick={() => setEditContentItem(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '640px', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', padding: '24px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h2 id="edit-content-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>تعديل المحتوى</h2>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>قم بتحديث بيانات المحتوى أو استبدال الملف.</p>
                </div>
                <button
                  onClick={() => setEditContentItem(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditContentSubmit} style={{ display: 'grid', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label htmlFor="edit-title" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>العنوان</label>
                    <input
                      id="edit-title"
                      type="text"
                      value={editContentForm.title}
                      onChange={(e) => setEditContentForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-type" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>النوع</label>
                    <select
                      id="edit-type"
                      value={editContentForm.type}
                      onChange={(e) => setEditContentForm(prev => ({ ...prev, type: e.target.value as ContentItem['type'] }))}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="video">فيديو</option>
                      <option value="app">تطبيق</option>
                      <option value="other">ملف</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-description" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>الوصف</label>
                  <textarea
                    id="edit-description"
                    rows={4}
                    value={editContentForm.description}
                    onChange={(e) => setEditContentForm(prev => ({ ...prev, description: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label htmlFor="edit-access-level" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>رؤية المحتوى</label>
                    <select
                      id="edit-access-level"
                      value={editContentForm.accessLevel}
                      onChange={(e) => setEditContentForm(prev => ({ ...prev, accessLevel: e.target.value as ContentItem['accessLevel'] }))}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="all">مرئي للجميع</option>
                      <option value="agent">الوكلاء والمدراء</option>
                      <option value="admin">المدراء فقط</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <label htmlFor="edit-download-protection" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>حماية التنزيل</label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', cursor: 'pointer' }}>
                      <input
                        id="edit-download-protection"
                        type="checkbox"
                        checked={editContentForm.downloadProtected}
                        onChange={(e) => setEditContentForm(prev => ({ ...prev, downloadProtected: e.target.checked }))}
                      />
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>منع التنزيل</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-file" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>استبدال الملف</label>
                  <input
                    id="edit-file"
                    type="file"
                    onChange={(e) => setEditContentForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  />
                </div>

                {editUploading && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>جاري رفع الملف...</span>
                      <span>{editUploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${editUploadProgress}%`, height: '100%', background: 'var(--accent-indigo)', transition: 'width 200ms ease' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setEditContentItem(null)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '10px 18px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={editUploading}
                    style={{ background: 'var(--gradient-primary)', border: 'none', color: 'white', padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  >
                    {editUploading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

