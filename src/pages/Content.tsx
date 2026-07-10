import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToContents, incrementContentViews, incrementContentDownloads } from '../firebase/db';
import type { ContentItem } from '../types';
import { 
  Search, Video, Download, Play, Monitor, FileText, Share2, Filter, Eye, X
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
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '16px 8px', direction: 'rtl' }} className="animate-fade content-page-wrapper">
      
      {/* Page Title Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>المكتبة الرقمية للمحتوى</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>مستودع الفيديوهات، التطبيقات والملفات الرسمية الخاصة بالعمل</p>
      </div>

      {/* Modern Search and Filters Bar */}
      <div 
        className="glass-card" 
        style={{
          padding: '16px 20px',
          marginBottom: '32px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        {/* Search Input Box */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '40px', background: 'rgba(0,0,0,0.15)', height: '42px', fontSize: '0.88rem' }}
            placeholder="بحث بالاسم أو الوصف للملف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={15} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Filter Pill Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedType('all')}
            className={`btn ${selectedType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.78rem', height: '38px', borderRadius: '10px' }}
          >
            <Filter size={13} />
            <span>الكل</span>
          </button>
          
          <button
            onClick={() => setSelectedType('video')}
            className={`btn ${selectedType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.78rem', height: '38px', borderRadius: '10px' }}
          >
            <Video size={13} />
            <span>الفيديوهات</span>
          </button>

          <button
            onClick={() => setSelectedType('app')}
            className={`btn ${selectedType === 'app' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.78rem', height: '38px', borderRadius: '10px' }}
          >
            <Monitor size={13} />
            <span>التطبيقات</span>
          </button>

          <button
            onClick={() => setSelectedType('other')}
            className={`btn ${selectedType === 'other' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.78rem', height: '38px', borderRadius: '10px' }}
          >
            <FileText size={13} />
            <span>ملفات أخرى</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div 
            className="animate-spin-fast" 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.04)',
              borderTopColor: 'var(--accent-blue)'
            }}
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          لا توجد نتائج تطابق خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid-cards">
          {filteredItems.map(item => {
            const isVideo = item.type === 'video';
            const accentBorderColor = item.type === 'app' 
              ? 'rgba(241, 196, 15, 0.25)' 
              : isVideo 
              ? 'rgba(59, 130, 246, 0.25)'
              : 'rgba(6, 182, 212, 0.25)';

            return (
              <div 
                key={item.id} 
                id={item.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%',
                  overflow: 'hidden',
                  borderTop: `2px solid ${accentBorderColor}`
                }}
              >
                
                {/* Visual Banner Header */}
                <div style={{
                  height: '170px',
                  background: item.type === 'app'
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(76, 29, 149, 0.25) 100%)'
                    : isVideo
                    ? '#05070a'
                    : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 79, 96, 0.25) 100%)',
                  borderRadius: '16px 16px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {isVideo && (
                    <LazyVideo src={item.url} />
                  )}
                  
                  {isVideo ? (
                    <button 
                      onClick={() => handlePlayVideo(item)}
                      style={{
                        background: 'rgba(9, 13, 22, 0.65)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'white',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        transition: 'all 0.2s',
                        zIndex: 2
                      }}
                      className="content-play-btn"
                    >
                      <Play size={20} style={{ marginRight: '-2px', fill: '#fff' }} />
                    </button>
                  ) : (
                    <Download size={40} style={{ opacity: 0.65, zIndex: 1 }} />
                  )}
                  
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(9, 13, 22, 0.85)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.66rem',
                    fontWeight: 'bold',
                    border: '1px solid var(--border-color)',
                    color: item.type === 'app' ? 'var(--accent-gold)' : 'white',
                    zIndex: 2
                  }}>
                    {item.type === 'video' ? 'فيديو 🎬' : item.type === 'app' ? 'تطبيق 📱' : 'ملف 📎'}
                  </span>
                </div>

                {/* Card Information Body */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '10px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{item.title}</h4>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
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
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '12px',
                    marginTop: '8px'
                  }}>
                    <span>المقاس: {(item.fileSize / (1024 * 1024)).toFixed(1)} ميجا</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} />
                        {item.views || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={12} />
                        {item.downloads || 0}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {isVideo ? (
                      <button
                        onClick={() => handlePlayVideo(item)}
                        className="btn btn-primary"
                        style={{ flexGrow: 1, padding: '8px 12px', fontSize: '0.8rem', height: '36px' }}
                      >
                        <Play size={13} style={{ fill: '#fff' }} />
                        <span>عرض الفيديو</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownload(item)}
                        className="btn btn-primary"
                        style={{ flexGrow: 1, padding: '8px 12px', fontSize: '0.8rem', height: '36px' }}
                      >
                        <Download size={13} />
                        <span>تنزيل</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDownload(item)}
                      title="تحميل مباشر للرابط"
                      className="btn btn-secondary"
                      style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '10px' }}
                    >
                      <Download size={13} />
                    </button>

                    <button
                      onClick={() => handleShare(item, 'whatsapp')}
                      title="مشاركة عبر واتساب"
                      className="btn btn-secondary"
                      style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '10px' }}
                    >
                      <Share2 size={13} style={{ color: 'var(--accent-emerald)' }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Lightbox Player Overlay (Portaled) */}
      {activeVideoUrl && createPortal(
        <div style={{
          position: 'fixed', 
          inset: 0,
          background: 'rgba(5, 8, 16, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflow: 'hidden'
        }} onClick={() => setActiveVideoUrl(null)}>
          <div 
            style={{
              width: '100%',
              maxWidth: '850px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }} 
            onClick={(e) => e.stopPropagation()}
            className="animate-scale"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>{activeVideoTitle}</h3>
              <button 
                onClick={() => setActiveVideoUrl(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                className="lightbox-close-btn"
              >
                <X size={15} />
              </button>
            </div>
            
            <div style={{
              background: 'black',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
              maxHeight: '75vh',
              aspectRatio: '16/9',
              display: 'flex',
              border: '1px solid rgba(255,255,255,0.05)'
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
        .content-play-btn:hover {
          transform: scale(1.08);
          background: rgba(9, 13, 22, 0.85) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        .lightbox-close-btn:hover {
          background: rgba(255, 255, 255, 0.12) !important;
        }
        @media (max-width: 768px) {
          .content-page-wrapper {
            padding: 12px 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
