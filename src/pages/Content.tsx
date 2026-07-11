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
      <div className="content-library-header" style={{ marginBottom: 'var(--space-5)' }}>
        <h1 className="page-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>المكتبة الرقمية</h1>
        <p className="body-text" style={{ marginTop: 'var(--space-1)', maxWidth: '600px', fontSize: 'var(--text-sm)' }}>
          مستودع الفيديوهات، التطبيقات والملفات الرسمية الخاصة بالعمل
        </p>
      </div>

      <div className="content-library-toolbar" role="search" aria-label="بحث في المحتوى">
        <div className="content-library-toolbar__row" style={{ gap: 'var(--space-3)' }}>
          <div className="content-library-toolbar__search">
            <input
              type="text"
              className="search-input"
              placeholder="ابحث باسم الملف أو الوصف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="بحث باسم الملف"
            />
            <Search size={16} className="search-icon" />
            {search && (
              <button onClick={() => setSearch('')} className="search-clear-btn" aria-label="مسح البحث">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="content-library-toolbar__filters" style={{ gap: 'var(--space-2)' }}>
            {filterButtons.map(btn => {
              const Icon = btn.icon;
              const active = selectedType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setSelectedType(btn.id)}
                  aria-pressed={active}
                  className={`filter-chip ${active ? 'active' : ''}`}
                >
                  <Icon size={14} className="filter-chip-icon" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 'var(--space-6)' }}><SkeletonGrid count={6} /></div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Inbox size={48} />}
          title={search || selectedType !== 'all' ? 'لا توجد نتائج' : 'المكتبة فارغة'}
          message={search || selectedType !== 'all' ? 'لم يتم العثور على ملفات تطابق معايير البحث.' : 'لم يتم رفع أي ملفات بعد، تحقق لاحقاً.'}
        />
      ) : (
        <div className="content-library-grid" style={{ marginTop: 'var(--space-5)' }}>
          {filteredItems.map(item => {
            const isVideo = item.type === 'video';
            const colors: Record<string, { bg: string; icon: string; gradient: string }> = {
              video: { bg: 'rgba(0,210,255,0.08)', icon: 'var(--color-primary)', gradient: 'linear-gradient(135deg, rgba(0,210,255,0.10), rgba(0,80,120,0.20))' },
              app: { bg: 'rgba(108,99,255,0.08)', icon: 'var(--color-accent)', gradient: 'linear-gradient(135deg, rgba(108,99,255,0.10), rgba(60,40,140,0.20))' },
              other: { bg: 'rgba(22,199,132,0.08)', icon: 'var(--color-success)', gradient: 'linear-gradient(135deg, rgba(22,199,132,0.10), rgba(10,80,60,0.20))' },
            };
            const c = colors[item.type] || colors.other;

            return (
              <article key={item.id} id={item.id} className="card-base content-card" style={{ animation: `fadeIn 0.3s ease forwards`, animationDelay: `${Math.random() * 0.15}s` }}>
                <div className="content-card__media" style={{ background: c.gradient }}>
                  {isVideo ? (
                    <LazyVideo src={item.url} />
                  ) : (
                    <div className="content-card__media-placeholder">
                      <div className="content-card__media-placeholder-icon">
                        <Download size={18} />
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)' }}>{item.type === 'app' ? 'Application' : 'File'}</span>
                    </div>
                  )}

                  {isVideo && (
                    <div className="content-card__media-overlay">
                      <button onClick={() => handlePlayVideo(item)} className="content-card__play-btn">
                        <Play size={18} style={{ marginRight: '-2px' }} />
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
                      <span className="content-card__meta-pill"><Eye size={11} />{item.views || 0}</span>
                      <span className="content-card__meta-pill"><Download size={11} />{item.downloads || 0}</span>
                    </div>
                  </div>

                  <div className="content-card__actions" style={{ gap: 'var(--space-2)' }}>
                    {isVideo ? (
                      <button onClick={() => handlePlayVideo(item)} className="btn btn-primary content-card__main-action" style={{ height: '38px', fontSize: 'var(--text-xs)', gap: '6px' }}>
                        <Play size={13} /> عرض الفيديو
                      </button>
                    ) : (
                      <button onClick={() => handleDownload(item)} className="btn btn-primary content-card__main-action" disabled={item.downloadProtected && !canUseAdminDownload} style={{ height: '38px', fontSize: 'var(--text-xs)', gap: '6px', opacity: item.downloadProtected && !canUseAdminDownload ? 0.5 : 1 }}>
                        <Download size={13} /> تنزيل
                      </button>
                    )}
                    <button onClick={() => handleDownload(item)} title={item.downloadProtected ? 'محتوى محمي من التنزيل' : 'تحميل مباشر'} className="btn btn-secondary btn-icon content-card__icon-action" disabled={item.downloadProtected && !canUseAdminDownload} style={{ width: '38px', height: '38px', opacity: item.downloadProtected && !canUseAdminDownload ? 0.5 : 1 }}>
                      <Download size={13} />
                    </button>
                    <button onClick={() => handleShare(item, 'whatsapp')} title="مشاركة واتساب" className="btn btn-ghost btn-icon content-card__icon-action" style={{ width: '38px', height: '38px', color: 'var(--color-success)' }}>
                      <Share2 size={13} />
                    </button>
                  </div>

                  {isAdmin && (
                    <div className="content-card__admin-actions" style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', gap: 'var(--space-2)' }}>
                      <button onClick={() => openEditContentModal(item)} className="content-card__admin-btn content-card__admin-btn--edit">
                        <Edit3 size={12} /> تعديل
                      </button>
                      <button onClick={() => handleToggleHideContent(item)} className={`content-card__admin-btn ${item.accessLevel === 'all' ? 'content-card__admin-btn--warn' : 'content-card__admin-btn--danger'}`}>
                        {item.accessLevel === 'all' ? <EyeOff size={12} /> : <Eye size={12} />} {item.accessLevel === 'all' ? 'إخفاء' : 'إظهار'}
                      </button>
                      <button onClick={() => handleToggleDownloadProtection(item)} className={`content-card__admin-btn ${item.downloadProtected ? 'content-card__admin-btn--danger' : 'content-card__admin-btn--success'}`}>
                        <Shield size={12} /> {item.downloadProtected ? 'إلغاء حماية' : 'حماية تنزيل'}
                      </button>
                      <button onClick={() => handleDeleteContent(item)} className="content-card__admin-btn content-card__admin-btn--delete">
                        <Trash2 size={12} /> حذف
                      </button>
                    </div>
                  )}
                  {item.downloadProtected && (
                    <div className="content-card__protected-badge" style={{ fontSize: '0.7rem', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={11} /> هذا المحتوى محمي من التنزيل
                    </div>
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
          backdropFilter: 'blur(12px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(8px, 3vw, 48px)',
        }} onClick={() => setActiveVideoUrl(null)} onKeyDown={(e) => { if (e.key === 'Escape') setActiveVideoUrl(null); }}>
          <div style={{ width: '100%', maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            onClick={(e) => e.stopPropagation()} className="animate-scale">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'white', margin: 0 }}>{activeVideoTitle}</h3>
              <button onClick={() => setActiveVideoUrl(null)} className="modal-close-btn">
                <X size={16} />
              </button>
            </div>
            <div style={{
              background: '#000', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)', aspectRatio: '16/9', maxHeight: 'min(70vh, 80vw)',
              border: '1px solid var(--color-border)',
            }}>
              <video src={activeVideoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {editContentItem && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-content-title" className="modal-overlay" onClick={() => setEditContentItem(null)}>
          <div onClick={(e) => e.stopPropagation()} className="modal-content-custom" style={{ maxWidth: 'min(640px, calc(100vw - 32px))' }}>
            <div className="modal-header-custom">
              <div>
                <h2 id="edit-content-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>تعديل المحتوى</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>قم بتحديث بيانات المحتوى أو استبدال الملف.</p>
              </div>
              <button onClick={() => setEditContentItem(null)} className="modal-close-btn" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditContentSubmit} className="modal-body-custom" style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="edit-title" className="form-label">العنوان</label>
                  <input id="edit-title" type="text" value={editContentForm.title} onChange={(e) => setEditContentForm(prev => ({ ...prev, title: e.target.value }))} required className="form-input" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="edit-type" className="form-label">النوع</label>
                  <select id="edit-type" value={editContentForm.type} onChange={(e) => setEditContentForm(prev => ({ ...prev, type: e.target.value as ContentItem['type'] }))} className="form-input">
                    <option value="video">فيديو</option>
                    <option value="app">تطبيق</option>
                    <option value="other">ملف</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="edit-description" className="form-label">الوصف</label>
                <textarea id="edit-description" rows={3} value={editContentForm.description} onChange={(e) => setEditContentForm(prev => ({ ...prev, description: e.target.value }))} className="form-input" style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="edit-access-level" className="form-label">رؤية المحتوى</label>
                  <select id="edit-access-level" value={editContentForm.accessLevel} onChange={(e) => setEditContentForm(prev => ({ ...prev, accessLevel: e.target.value as ContentItem['accessLevel'] }))} className="form-input">
                    <option value="all">مرئي للجميع</option>
                    <option value="agent">الوكلاء والمدراء</option>
                    <option value="admin">المدراء فقط</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, justifyContent: 'flex-end' }}>
                  <label className="form-label" style={{ display: 'block' }}>حماية التنزيل</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <input id="edit-download-protection" type="checkbox" checked={editContentForm.downloadProtected} onChange={(e) => setEditContentForm(prev => ({ ...prev, downloadProtected: e.target.checked }))} />
                    منع التنزيل
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="edit-file" className="form-label">استبدال الملف (اختياري)</label>
                <input id="edit-file" type="file" onChange={(e) => setEditContentForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))} className="form-input" style={{ padding: '8px 14px' }} />
              </div>

              {editUploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>جاري رفع الملف...</span>
                    <span>{editUploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${editUploadProgress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 200ms ease' }} />
                  </div>
                </div>
              )}

              <div className="modal-footer-custom" style={{ border: 'none', padding: '0', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditContentItem(null)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={editUploading} className="btn btn-primary">
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

