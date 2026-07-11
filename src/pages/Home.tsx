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
      
      {/* Hero Section - Compact */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '55vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px 40px',
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
          zIndex: 2, maxWidth: '750px', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center',
          marginTop: 'calc(var(--navbar-height) + 10px)'
        }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.3px',
            color: 'var(--color-primary)', background: 'rgba(0, 210, 255, 0.08)',
            padding: '6px 18px', borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(0, 210, 255, 0.15)', display: 'inline-block',
            backdropFilter: 'blur(8px)',
          }}>
            مجموعة EMF للحلول البرمجية والتحول الرقمي
          </span>

          <h1 style={{
            fontSize: 'clamp(2.8rem, 7vw, 5rem)', fontWeight: 900,
            lineHeight: 1, margin: '4px 0 0', letterSpacing: '0.5px',
            fontFamily: 'var(--font-en)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', direction: 'ltr',
          }}>
            <span style={{ color: '#ffffff' }}>EM</span>
            <span style={{ 
              background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>F</span>
          </h1>

          <h2 style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 50%, #94A3B8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.3, marginTop: '2px'
          }}>
            نبتكر الحلول البرمجية الذكية ونطور المستقبل الرقمي
          </h2>

          <p style={{
            fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6,
            maxWidth: '580px', margin: '0 auto'
          }}>
            نحن في مجموعة EMF نتخصص في تصميم وتطوير مواقع الويب المتكاملة وتطبيقات الهواتف الذكية بأحدث التقنيات وأقوى أنظمة الحماية.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px', width: '100%', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/content" className="btn btn-primary btn-lg" style={{ gap: '8px' }}>
                استكشف المكتبة الرقمية
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg" style={{ gap: '8px' }}>
                  ابدأ الآن مجاناً
                  <ArrowLeft size={16} />
                </Link>
                <a href="#about" className="btn btn-secondary btn-lg">
                  من نحن
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        
        {/* Services Showcase */}
        <div id="about" style={{ marginBottom: '64px', scrollMarginTop: '80px' }}>
          <div className="grid-cards-3" style={{ gap: 'var(--space-5)' }}>
            <div className="card-base" style={{ padding: '28px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 210, 255, 0.10)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-primary)', marginBottom: '16px'
              }}>
                <Globe size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                تطوير مواقع وأنظمة الويب
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                برمجة مواقع الكترونية فائقة السرعة ومتجاوبة تماماً مع مختلف الشاشات، بالإضافة إلى أنظمة الويب المعقدة وبوابات الإدارة المخصصة.
              </p>
            </div>

            <div className="card-base" style={{ padding: '28px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: 'rgba(108, 99, 255, 0.10)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent)', marginBottom: '16px'
              }}>
                <Smartphone size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                تطوير تطبيقات الهاتف
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                بناء وتطوير تطبيقات هواتف ذكية متكاملة لنظامي iOS & Android بتصاميم عصرية وتجربة مستخدم سلسة.
              </p>
            </div>

            <div className="card-base" style={{ padding: '28px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: 'rgba(22, 199, 132, 0.10)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-success)', marginBottom: '16px'
              }}>
                <Cloud size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                الحلول السحابية وإدارة الملفات
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                توفير بوابات رفع ومشاركة الملفات والتطبيقات للمستخدمين بشكل منظم مع شات تواصل فوري مخصص ومؤمن.
              </p>
            </div>
          </div>
        </div>

        {/* Latest Content Showcase */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                أحدث الإضافات للمكتبة
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                شاهد أحدث الفيديوهات والتطبيقات والملفات المرفوعة للجميع
              </p>
            </div>
            <Link to="/content" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 600, transition: 'opacity 0.2s', opacity: 0.8 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>
              عرض كل المحتوى ←
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="animate-spin-fast" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
            </div>
          ) : latestItems.length === 0 ? (
            <div className="card-base" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              لا يوجد محتوى متوفر حالياً في المكتبة الرقمية.
            </div>
          ) : (
            <div className="grid-cards" style={{ gap: 'var(--space-5)' }}>
              {latestItems.map((item) => (
                <div key={item.id} className="card-base" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <div style={{
                    height: '140px',
                    background: item.type === 'video' 
                      ? 'linear-gradient(135deg, rgba(0, 210, 255, 0.08), rgba(0, 80, 120, 0.2))'
                      : item.type === 'app'
                      ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(60, 40, 140, 0.2))'
                      : 'linear-gradient(135deg, rgba(22, 199, 132, 0.08), rgba(10, 80, 60, 0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                  }}>
                    {item.type === 'video' ? (
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={16} style={{ marginRight: '-2px', color: 'var(--color-primary)' }} />
                      </div>
                    ) : (
                      <Download size={28} style={{ opacity: 0.6, color: 'var(--color-primary)' }} />
                    )}
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(5, 8, 22, 0.75)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: 700, border: '1px solid var(--color-border)', color: 'var(--color-primary)', backdropFilter: 'blur(4px)' }}>
                      {item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'}
                    </span>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '6px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
                      {item.description || 'لا يوجد وصف متاح لهذا العنصر.'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '6px' }}>
                      <span>الحجم: {(item.fileSize / (1024 * 1024)).toFixed(1)} ميجا</span>
                      <span>المشاهدات: {item.views || 0}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      {user ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flexGrow: 1, height: '36px', fontSize: '0.8rem', gap: '6px' }}>
                          <Download size={13} /> تحميل مباشر
                        </a>
                      ) : (
                        <Link to="/login" className="btn btn-secondary" style={{ flexGrow: 1, height: '36px', fontSize: '0.8rem', gap: '6px' }}>
                          <Download size={13} /> سجل دخول للتحميل
                        </Link>
                      )}
                      <button onClick={() => handleShare(item, 'whatsapp')} title="مشاركة عبر واتساب" className="btn btn-secondary btn-icon" style={{ width: '36px', height: '36px' }}>
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
