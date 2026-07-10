import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToContents, incrementContentViews, incrementContentDownloads } from '../firebase/db';
import type { ContentItem } from '../types';
import { Search, Video, Download, Play, Monitor, FileText, Share2, Eye, X, Filter, Inbox } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToContents((list) => {
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    let result = items;
    if (selectedType !== 'all') result = result.filter(item => item.type === selectedType);
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(item =>
        item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
      );
    }
    setFilteredItems(result);
  }, [items, search, selectedType]);

  const handleDownload = async (item: ContentItem) => {
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
    <div className="page-wrapper page-enter" style={{ direction: 'rtl' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">المكتبة الرقمية</h1>
        <p className="body-text" style={{ marginTop: 'var(--space-2)' }}>
          مستودع الفيديوهات، التطبيقات والملفات الرسمية الخاصة بالعمل
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card-base" style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingRight: '40px', fontSize: 'var(--text-sm)' }}
              placeholder="بحث باسم الملف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            {search && (
              <button onClick={() => setSearch('')} className="btn btn-icon btn-sm btn-ghost" style={{
                position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)',
              }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {filterButtons.map(btn => (
              <button
                key={btn.id}
                onClick={() => setSelectedType(btn.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
                  padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 600,
                  height: '36px', borderRadius: 'var(--radius-md)',
                  border: selectedType === btn.id ? 'none' : '1px solid var(--border-color)',
                  background: selectedType === btn.id ? 'var(--accent-blue)' : 'transparent',
                  color: selectedType === btn.id ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all var(--transition-base)',
                }}

              >
                <btn.icon size={14} />
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Inbox size={48} />}
          title={search || selectedType !== 'all' ? 'لا توجد نتائج' : 'المكتبة فارغة'}
          message={search || selectedType !== 'all' ? 'لم يتم العثور على ملفات تطابق معايير البحث.' : 'لم يتم رفع أي ملفات بعد، تحقق لاحقاً.'}
        />
      ) : (
        <div className="grid-cards">
          {filteredItems.map(item => {
            const isVideo = item.type === 'video';
            const colors: Record<string, { bg: string; icon: string; gradient: string }> = {
              video: { bg: 'rgba(59,130,246,0.08)', icon: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(30,64,175,0.15))' },
              app: { bg: 'rgba(245,158,11,0.08)', icon: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(76,29,149,0.15))' },
              other: { bg: 'rgba(6,182,212,0.08)', icon: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(8,79,96,0.15))' },
            };
            const c = colors[item.type] || colors.other;

            return (
              <div key={item.id} id={item.id} className="card-base" style={{
                display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%',
              }}>
                {/* Banner */}
                <div style={{
                  height: '170px', background: c.gradient,
                  borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {isVideo && <LazyVideo src={item.url} />}
                  {isVideo ? (
                    <button onClick={() => handlePlayVideo(item)} style={{
                      background: 'rgba(9,13,22,0.65)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'white', width: '50px', height: '50px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', backdropFilter: 'blur(6px)', zIndex: 2,
                      transition: 'all var(--transition-base)',
                    }} className="content-play-btn">
                      <Play size={20} style={{ marginRight: '-2px', fill: '#fff' }} />
                    </button>
                  ) : (
                    <Download size={40} style={{ opacity: 0.5, zIndex: 1 }} />
                  )}
                  <span style={{
                    position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)',
                    background: 'rgba(9,13,22,0.8)', padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)', fontSize: '10px', fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.06)', color: c.icon, zIndex: 2,
                  }}>
                    {item.type === 'video' ? '🎬 فيديو' : item.type === 'app' ? '📱 تطبيق' : '📎 ملف'}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 'var(--space-3)' }}>
                  <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</h4>
                  <p style={{
                    fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', flexGrow: 1,
                  }}>
                    {item.description || 'لا يوجد وصف متاح.'}
                  </p>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                    borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)',
                  }}>
                    <span>{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} />{item.views || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={12} />{item.downloads || 0}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    {isVideo ? (
                      <button onClick={() => handlePlayVideo(item)} className="btn btn-primary" style={{ flex: 1, height: '36px', fontSize: 'var(--text-sm)' }}>
                        <Play size={14} style={{ fill: '#fff' }} /> عرض الفيديو
                      </button>
                    ) : (
                      <button onClick={() => handleDownload(item)} className="btn btn-primary" style={{ flex: 1, height: '36px', fontSize: 'var(--text-sm)' }}>
                        <Download size={14} /> تنزيل
                      </button>
                    )}
                    <button onClick={() => handleDownload(item)} title="تحميل مباشر" className="btn btn-secondary" style={{ width: '36px', height: '36px', padding: 0, borderRadius: 'var(--radius-md)' }}>
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleShare(item, 'whatsapp')} title="مشاركة واتساب" className="btn btn-icon btn-sm btn-ghost" style={{ color: 'var(--accent-emerald)' }}>
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Lightbox */}
      {activeVideoUrl && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.95)',
          backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-6)',
        }} onClick={() => setActiveVideoUrl(null)}>
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

      <style>{`
        .content-play-btn:hover { transform: scale(1.08); background: rgba(9,13,22,0.85) !important; border-color: rgba(255,255,255,0.25) !important; }
        .lightbox-close-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .filter-btn:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}

