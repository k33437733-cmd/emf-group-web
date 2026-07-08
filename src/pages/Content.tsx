import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToContents, incrementContentViews, incrementContentDownloads } from '../firebase/db';
import type { ContentItem } from '../types';
import { 
  Search, Video, Download, Play, Monitor, FileText, Share2, Filter, Eye 
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import LazyVideo from '../components/ui/LazyVideo';

export default function Content() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'app' | 'other'>('all');

  // Modal for video play (Simple overlay lightbox player)
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

  // Apply Search and Filter
  useEffect(() => {
    let result = items;
    
    if (selectedType !== 'all') {
      result = result.filter(item => item.type === selectedType);
    }
    
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(item => 
        item.title.toLowerCase().includes(term) || 
        item.description.toLowerCase().includes(term)
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
      console.error(e);
      showToast('فشل بدء التحميل', 'error');
    }
  };

  const handlePlayVideo = async (item: ContentItem) => {
    try {
      await incrementContentViews(item.id);
      setActiveVideoUrl(item.url);
      setActiveVideoTitle(item.title);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = (item: ContentItem, platform: 'whatsapp' | 'facebook') => {
    const text = `تفضل بمشاهدة وتحميل "${item.title}" من EMF Group:`;
    const url = window.location.origin + `/content#${item.id}`;
    let shareUrl = '';

    if (platform === 'whatsapp') {
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
    } else {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    }
    window.open(shareUrl, '_blank');
    showToast('تم فتح نافذة المشاركة', 'info');
  };

  // Lock body scroll when video overlay is open
  useEffect(() => {
    if (activeVideoUrl) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [activeVideoUrl]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', direction: 'rtl' }} className="animate-fade content-page-wrapper">
      
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>المكتبة الرقمية للمحتوى</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>مستودع الفيديوهات، التطبيقات والملفات الرسمية الخاصة بالعمل</p>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-card" style={{
        padding: '20px',
        marginBottom: '32px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '40px' }}
            placeholder="بحث بالاسم أو الوصف للملف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }} />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedType('all')}
            className={`btn ${selectedType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Filter size={14} />
            الكل
          </button>
          
          <button
            onClick={() => setSelectedType('video')}
            className={`btn ${selectedType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Video size={14} />
            الفيديوهات
          </button>

          <button
            onClick={() => setSelectedType('app')}
            className={`btn ${selectedType === 'app' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Monitor size={14} />
            التطبيقات
          </button>

          <button
            onClick={() => setSelectedType('other')}
            className={`btn ${selectedType === 'other' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <FileText size={14} />
            ملفات أخرى
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>جاري تحميل المكتبة...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          لا توجد نتائج تطابق خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid-cards">
          {filteredItems.map(item => (
            <div key={item.id} id={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Card visual banner */}
              <div style={{
                height: '180px',
                background: item.type === 'app'
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(76, 29, 149, 0.4) 100%)'
                  : 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 79, 96, 0.4) 100%)',
                backgroundColor: item.type === 'video' ? '#000' : 'transparent',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {item.type === 'video' && (
                  <LazyVideo src={item.url} />
                )}
                
                {item.type === 'video' ? (
                  <button 
                    onClick={() => handlePlayVideo(item)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(5px)',
                      transition: 'all 0.2s',
                      zIndex: 1
                    }}
                    className="play-btn"
                  >
                    <Play size={24} style={{ marginRight: '-2px' }} />
                  </button>
                ) : (
                  <Download size={48} style={{ opacity: 0.7, zIndex: 1 }} />
                )}
                
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(10, 15, 29, 0.85)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  border: '1px solid var(--border-color)'
                }}>
                  {item.type === 'video' ? 'فيديو 🎬' : item.type === 'app' ? 'تطبيق 📱' : 'ملف 📎'}
                </span>
              </div>

              {/* Card info */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '10px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.title}</h4>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexGrow: 1
                }}>
                  {item.description || 'لا يوجد وصف متاح.'}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px',
                  marginTop: '10px'
                }}>
                  <span>المقاس: {(item.fileSize / (1024 * 1024)).toFixed(1)} ميجا</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Eye size={12} />
                      {item.views || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Download size={12} />
                      {item.downloads || 0}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {item.type === 'video' ? (
                    <button
                      onClick={() => handlePlayVideo(item)}
                      className="btn btn-primary"
                      style={{ flexGrow: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                    >
                      <Play size={14} />
                      عرض الفيديو
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDownload(item)}
                      className="btn btn-primary"
                      style={{ flexGrow: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                    >
                      <Download size={14} />
                      تنزيل
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDownload(item)}
                    title="تحميل مباشر للرابط"
                    className="btn btn-secondary"
                    style={{ padding: '8px' }}
                  >
                    <Download size={14} />
                  </button>

                  <button
                    onClick={() => handleShare(item, 'whatsapp')}
                    title="مشاركة عبر واتساب"
                    className="btn btn-secondary"
                    style={{ padding: '8px' }}
                  >
                    <Share2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Lightbox Player Overlay — portal to body for perfect centering */}
      {activeVideoUrl && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5, 8, 16, 0.95)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflow: 'hidden'
        }} onClick={() => setActiveVideoUrl(null)}>
          <div style={{
            width: '100%',
            maxWidth: '850px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
              <h3 style={{ fontWeight: 'bold' }}>{activeVideoTitle}</h3>
              <button 
                onClick={() => setActiveVideoUrl(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              background: 'black',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              maxHeight: '80vh',
              aspectRatio: '16/9',
              display: 'flex'
            }}>
              <video 
                src={activeVideoUrl} 
                controls 
                autoPlay 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
      
      <style>{`
        .play-btn:hover {
          transform: scale(1.1);
          background: rgba(255,255,255,0.18) !important;
        }
        @media (max-width: 768px) {
          .content-page-wrapper {
            padding: 20px 16px !important;
          }
          .content-page-wrapper h2 {
            font-size: 1.4rem !important;
          }
        }
      `}</style>
    </div>
  );
}
