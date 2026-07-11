import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToContents } from '../firebase/db';
import type { ContentItem } from '../types';
import { 
  Globe, Smartphone, Cloud, Download, ArrowLeft, Play, Share2 
} from 'lucide-react';
import { showToast } from '../components/ui/Toast';

export default function Home() {
  const { user } = useAuth();
  const [latestItems, setLatestItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => el.classList.add('active'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    revealElements.forEach((el) => observer.observe(el));
    return () => { observer.disconnect(); };
  }, [latestItems]);

  const canViewRestricted = !!user && ['agent', 'admin', 'super_admin'].includes(user.role);
  const canViewAdminOnly = !!user && ['admin', 'super_admin'].includes(user.role);

  useEffect(() => {
    const unsub = subscribeToContents((items) => {
      const visibleItems = items.filter(item => {
        const level = item.accessLevel || 'all';
        if (level === 'all') return true;
        if (level === 'agent') return canViewRestricted;
        if (level === 'admin') return canViewAdminOnly;
        return false;
      });
      setLatestItems(visibleItems.slice(0, 6));
      setLoading(false);
    });
    return () => unsub();
  }, [canViewRestricted, canViewAdminOnly]);

  const handleShare = (item: ContentItem, platform: 'whatsapp' | 'facebook') => {
    const text = `تفضل بمشاهدة وتحميل "${item.title}" من منصة EMF Group:`;
    const url = window.location.origin + `/content#${item.id}`;
    const shareUrl = platform === 'whatsapp'
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    showToast('تم فتح نافذة المشاركة', 'info');
  };

  return (
    <div className="animate-fade" style={{ direction: 'rtl', width: '100%', background: 'var(--bg-primary)' }}>
      
      {/* Hero Section */}
      <div className="home-hero" style={{
        position: 'relative',
        width: '100%',
        minHeight: 'clamp(40vh, 55vh, 70vh)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(35px, 6vw, 60px) clamp(12px, 3vw, 20px) clamp(20px, 4vw, 40px)',
        marginTop: 'calc(-1 * var(--navbar-height))',
        overflow: 'hidden'
      }}>
        <video autoPlay loop muted playsInline style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0, pointerEvents: 'none', opacity: 0.4
        }}>
          <source src="/entro/6330779-hd_1920_1080_30fps.mp4" type="video/mp4" />
        </video>

        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'radial-gradient(circle, rgba(5, 8, 22, 0.3) 0%, rgba(5, 8, 22, 0.92) 80%)',
          zIndex: 1
        }} />

        <div style={{ 
          zIndex: 2, maxWidth: 'min(750px, calc(100vw - 24px))', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 16px)', textAlign: 'center',
          marginTop: 'calc(var(--navbar-height) + 10px)'
        }}>
          <span className="home-hero-badge" style={{
            fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', fontWeight: 600,
            color: 'var(--color-primary)', background: 'rgba(0, 210, 255, 0.08)',
            padding: 'clamp(4px, 1vw, 6px) clamp(12px, 2vw, 18px)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(0, 210, 255, 0.15)', display: 'inline-block',
            backdropFilter: 'blur(8px)',
          }}>
            مجموعة EMF للحلول البرمجية والتحول الرقمي
          </span>

          <h1 style={{
            fontSize: 'clamp(1.8rem, 7vw, 5rem)', fontWeight: 900,
            lineHeight: 1, margin: '4px 0 0',
            fontFamily: 'var(--font-en)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', direction: 'ltr', flexWrap: 'wrap',
          }}>
            <span style={{ color: '#ffffff' }}>EM</span>
            <span style={{ 
              background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>F</span>
          </h1>

          <h2 style={{
            fontSize: 'clamp(0.95rem, 2.5vw, 1.6rem)', fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 50%, #94A3B8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.3, marginTop: '2px',
            maxWidth: '90vw',
          }}>
            نبتكر الحلول البرمجية الذكية ونطور المستقبل الرقمي
          </h2>

          <p style={{
            fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)', color: 'var(--text-secondary)',
            lineHeight: 1.6, maxWidth: 'min(580px, calc(100vw - 32px))', margin: '0 auto',
            padding: '0 8px',
          }}>
            نحن في مجموعة EMF نتخصص في تصميم وتطوير مواقع الويب المتكاملة وتطبيقات الهواتف الذكية بأحدث التقنيات وأقوى أنظمة الحماية.
          </p>

          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', justifyContent: 'center', marginTop: '8px', width: '100%', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/content" className="btn btn-primary" style={{ gap: '8px', height: 'clamp(40px, 5vw, 48px)', fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)', padding: '0 clamp(16px, 3vw, 24px)' }}>
                استكشف المكتبة الرقمية
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary" style={{ gap: '8px', height: 'clamp(40px, 5vw, 48px)', fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)', padding: '0 clamp(16px, 3vw, 24px)' }}>
                  ابدأ الآن مجاناً
                  <ArrowLeft size={16} />
                </Link>
                <a href="#about" className="btn btn-secondary" style={{ height: 'clamp(40px, 5vw, 48px)', fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)', padding: '0 clamp(16px, 3vw, 24px)' }}>
                  من نحن
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1200px, calc(100vw - 16px))', margin: '0 auto', padding: 'clamp(24px, 5vw, 48px) clamp(12px, 3vw, 24px)' }}>
        
        {/* Services Showcase */}
        <div id="about" style={{ marginBottom: 'clamp(32px, 6vw, 64px)', scrollMarginTop: '80px' }}>
          <div className="grid-cards-3" style={{ gap: 'clamp(12px, 2vw, 20px)' }}>
            {([
              { icon: Globe, color: 'var(--color-primary)', bg: 'rgba(0, 210, 255, 0.10)', title: 'تطوير مواقع وأنظمة الويب', desc: 'برمجة مواقع الكترونية فائقة السرعة ومتجاوبة تماماً مع مختلف الشاشات، بالإضافة إلى أنظمة الويب المعقدة وبوابات الإدارة المخصصة.' },
              { icon: Smartphone, color: 'var(--color-accent)', bg: 'rgba(108, 99, 255, 0.10)', title: 'تطوير تطبيقات الهاتف', desc: 'بناء وتطوير تطبيقات هواتف ذكية متكاملة لنظامي iOS & Android بتصاميم عصرية وتجربة مستخدم سلسة.' },
              { icon: Cloud, color: 'var(--color-success)', bg: 'rgba(22, 199, 132, 0.10)', title: 'الحلول السحابية وإدارة الملفات', desc: 'توفير بوابات رفع ومشاركة الملفات والتطبيقات للمستخدمين بشكل منظم مع شات تواصل فوري مخصص ومؤمن.' },
            ]).map((svc, i) => (
              <div key={i} className="card-base" style={{ padding: 'clamp(20px, 3vw, 28px)' }}>
                <div style={{
                  width: 'clamp(36px, 4vw, 44px)', height: 'clamp(36px, 4vw, 44px)',
                  borderRadius: 'var(--radius-md)',
                  background: svc.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: svc.color, marginBottom: 'clamp(12px, 2vw, 16px)'
                }}>
                  <svc.icon size={20} />
                </div>
                <h3 style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', marginBottom: 'clamp(6px, 1vw, 8px)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {svc.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 1.5vw, 0.85rem)', lineHeight: 1.7 }}>
                  {svc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Content Showcase */}
        <div style={{ marginBottom: 'clamp(24px, 4vw, 40px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'clamp(16px, 3vw, 24px)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                أحدث الإضافات للمكتبة
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.78rem, 1.5vw, 0.82rem)' }}>
                شاهد أحدث الفيديوهات والتطبيقات والملفات المرفوعة للجميع
              </p>
            </div>
            <Link to="/content" className="view-all-link">
              عرض كل المحتوى ←
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'clamp(30px, 6vw, 60px)' }}>
              <div className="animate-spin-fast" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
            </div>
          ) : latestItems.length === 0 ? (
            <div className="card-base" style={{ padding: 'clamp(24px, 4vw, 40px) 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'clamp(0.82rem, 1.5vw, 0.9rem)' }}>
              لا يوجد محتوى متوفر حالياً في المكتبة الرقمية.
            </div>
          ) : (
            <div className="grid-cards" style={{ gap: 'clamp(12px, 2vw, 20px)' }}>
              {latestItems.map((item) => (
                <div key={item.id} className="card-base" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <div className="home-card-media" style={{
                    aspectRatio: '16 / 9',
                    background: item.type === 'video' 
                      ? 'linear-gradient(135deg, rgba(0, 210, 255, 0.08), rgba(0, 80, 120, 0.2))'
                      : item.type === 'app'
                      ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(60, 40, 140, 0.2))'
                      : 'linear-gradient(135deg, rgba(22, 199, 132, 0.08), rgba(10, 80, 60, 0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                  }}>
                    {item.type === 'video' ? (
                      <div style={{ width: 'clamp(36px, 4vw, 42px)', height: 'clamp(36px, 4vw, 42px)', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={16} style={{ marginRight: '-2px', color: 'var(--color-primary)' }} />
                      </div>
                    ) : (
                      <Download size={24} style={{ opacity: 0.6, color: 'var(--color-primary)', width: 'clamp(24px, 3vw, 28px)', height: 'clamp(24px, 3vw, 28px)' }} />
                    )}
                    <span className="home-card-badge" style={{
                      position: 'absolute', top: 'clamp(6px, 1vw, 10px)', right: 'clamp(6px, 1vw, 10px)',
                      background: 'rgba(5, 8, 22, 0.75)', padding: 'clamp(2px, 0.5vw, 3px) clamp(6px, 1vw, 8px)',
                      borderRadius: 'var(--radius-sm)', fontSize: 'clamp(0.6rem, 1vw, 0.65rem)',
                      fontWeight: 700, border: '1px solid var(--color-border)',
                      color: 'var(--color-primary)', backdropFilter: 'blur(4px)',
                    }}>
                      {item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'}
                    </span>
                  </div>

                  <div style={{ padding: 'clamp(12px, 2vw, 16px)', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '6px' }}>
                    <h4 style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</h4>
                    <p className="home-card-desc" style={{
                      color: 'var(--text-secondary)', fontSize: 'clamp(0.75rem, 1.5vw, 0.8rem)',
                      lineHeight: 1.5, display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1,
                    }}>
                      {item.description || 'لا يوجد وصف متاح لهذا العنصر.'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'clamp(0.65rem, 1.2vw, 0.7rem)', color: 'var(--text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 'clamp(8px, 1.5vw, 10px)', marginTop: '6px' }}>
                      <span>الحجم: {(item.fileSize / (1024 * 1024)).toFixed(1)} ميجا</span>
                      <span>المشاهدات: {item.views || 0}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: 'clamp(8px, 1.5vw, 10px)' }}>
                      {user ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flexGrow: 1, height: 'clamp(32px, 4vw, 36px)', fontSize: 'clamp(0.75rem, 1.5vw, 0.8rem)', gap: '6px' }}>
                          <Download size={13} /> تحميل مباشر
                        </a>
                      ) : (
                        <Link to="/login" className="btn btn-secondary" style={{ flexGrow: 1, height: 'clamp(32px, 4vw, 36px)', fontSize: 'clamp(0.75rem, 1.5vw, 0.8rem)', gap: '6px' }}>
                          <Download size={13} /> سجل دخول للتحميل
                        </Link>
                      )}
                      <button onClick={() => handleShare(item, 'whatsapp')} title="مشاركة عبر واتساب" className="btn btn-secondary btn-icon" style={{ width: 'clamp(32px, 4vw, 36px)', height: 'clamp(32px, 4vw, 36px)' }}>
                        <Share2 size={13} style={{ color: 'var(--color-success)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
