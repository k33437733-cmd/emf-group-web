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

  // Scroll reveal observer — stable ref to avoid re-creating on data changes
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

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToContents((items) => {
      // Show only top 6 latest items on home page
      setLatestItems(items.slice(0, 6));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleShare = (item: ContentItem, platform: 'whatsapp' | 'facebook') => {
    const text = `تفضل بمشاهدة وتحميل "${item.title}" من منصة EMF Group:`;
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

  const goldBtnStyle = {
    background: 'var(--gradient-gold)',
    color: '#0a0f1d',
    boxShadow: '0 4px 20px rgba(241, 196, 15, 0.25)',
    border: 'none',
    fontWeight: 700
  };

  return (
    <div className="animate-fade" style={{ direction: 'rtl', width: '100%' }}>
      
      {/* Hero Section with Video Background - Full Width & Height */}
      <div className="hero-container" style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        marginTop: 'calc(-1 * var(--navbar-height))',
        zIndex: 0,
        overflow: 'hidden'
      }}>
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        >
          <source src="/entro/6330779-hd_1920_1080_30fps.mp4" type="video/mp4" />
        </video>

        {/* Navy/Dark Blue Identity Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(11, 26, 48, 0.5) 0%, rgba(7, 12, 24, 0.95) 100%)',
          zIndex: 1
        }} />

        {/* Content container */}
        <div style={{ zIndex: 2, maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', marginTop: 'var(--navbar-height)' }}>
          
          {/* Tag */}
          <span className="reveal" style={{
            fontSize: '0.85rem',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: 'var(--accent-gold)',
            background: 'rgba(241, 196, 15, 0.08)',
            padding: '8px 20px',
            borderRadius: '9999px',
            border: '1px solid rgba(241, 196, 15, 0.25)',
            display: 'inline-block',
            backdropFilter: 'blur(5px)'
          }}>
            مجموعة EMF للحلول البرمجية والتحول الرقمي
          </span>
          
          {/* Big EMF logo type with glow effect and enforced LTR */}
          <h1 className="reveal" style={{
            fontSize: 'clamp(5rem, 12vw, 9rem)',
            fontWeight: 900,
            lineHeight: 0.9,
            margin: '10px 0 0',
            letterSpacing: '2px',
            fontFamily: 'var(--font-en)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            direction: 'ltr',
            position: 'relative'
          }}>
            {/* Glowing Light Behind EMF */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120%',
              height: '120%',
              background: 'radial-gradient(circle, rgba(241, 196, 15, 0.35) 0%, transparent 60%)',
              filter: 'blur(50px)',
              zIndex: -1,
              pointerEvents: 'none'
            }} />

            <span style={{ color: '#ffffff', textShadow: '0 0 35px rgba(255,255,255,0.4)' }}>EM</span>
            <span style={{ 
              background: 'var(--gradient-gold)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 45px rgba(241, 196, 15, 0.3)'
            }}>F</span>
          </h1>

          {/* Subtitle */}
          <h2 className="reveal reveal-delay-1" style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 40%, #e2e8f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
            marginTop: '5px'
          }}>
            نبتكر الحلول البرمجية الذكية ونطور المستقبل الرقمي
          </h2>

          {/* Detailed Paragraph (Web & Mobile app development focus) */}
          <p className="reveal reveal-delay-2" style={{
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '700px',
            margin: '0 auto',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            نحن في مجموعة EMF نتخصص في تصميم وتطوير مواقع الويب المتكاملة وتطبيقات الهواتف الذكية (Android & iOS) بأحدث التقنيات وأقوى أنظمة الحماية، لتمكين الشركات والأفراد من تحقيق تحول رقمي مستدام واستجابة فائقة السرعة لجميع الأنظمة.
          </p>

          {/* Action buttons */}
          <div className="reveal reveal-delay-3" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px', width: '100%', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/content" className="btn" style={{ ...goldBtnStyle, padding: '16px 36px', fontSize: '1.1rem' }}>
                استكشف المكتبة الرقمية
                <ArrowLeft size={18} style={{ marginRight: '8px' }} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn" style={{ ...goldBtnStyle, padding: '16px 36px', fontSize: '1.1rem' }}>
                  ابدأ الآن مجاناً
                  <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                </Link>
                <a href="#about" className="btn btn-secondary" style={{ padding: '16px 36px', fontSize: '1.1rem', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  من نحن
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '60px 24px' }}>
        {/* About & Services Section */}
        <div id="about" style={{ marginBottom: '80px', scrollMarginTop: '100px' }} className="grid-cards">
          
          {/* Web development card */}
          <div className="glass-card reveal" style={{ padding: '36px', borderTop: '2px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              marginBottom: '24px'
            }}>
              <Globe size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '14px', fontWeight: 'bold', color: 'white' }}>تطوير مواقع وأنظمة الويب</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              برمجة مواقع الكترونية فائقة السرعة ومتجاوبة تماماً مع مختلف الشاشات، بالإضافة إلى أنظمة الويب المعقدة وبوابات الإدارة المخصصة لرفع كفاءة أعمالك.
            </p>
          </div>

          {/* Mobile development card */}
          <div className="glass-card reveal reveal-delay-1" style={{ padding: '36px', borderTop: '2px solid rgba(241, 196, 15, 0.15)' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(241, 196, 15, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
              marginBottom: '24px'
            }}>
              <Smartphone size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '14px', fontWeight: 'bold', color: 'white' }}>تطوير تطبيقات الهاتف</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              بناء وتطوير تطبيقات هواتف ذكية متكاملة لنظامي iOS & Android بتصاميم عصرية وتجربة مستخدم سلسة تحقق طموحاتك التجارية.
            </p>
          </div>

          {/* Cloud & Integration card */}
          <div className="glass-card reveal reveal-delay-2" style={{ padding: '36px', borderTop: '2px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(6, 182, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              marginBottom: '24px'
            }}>
              <Cloud size={26} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '14px', fontWeight: 'bold', color: 'white' }}>الحلول السحابية وإدارة الملفات</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              توفير بوابات رفع ومشاركة الملفات والتطبيقات للمستخدمين بشكل منظم مع شات تواصل فوري مخصص ومؤمن لإدارة التفاعل اللحظي بكفاءة.
            </p>
          </div>
        </div>

        {/* Latest Content Showcase */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }} className="reveal-left">
            <div>
              <h2 style={{ fontSize: '1.7rem', fontWeight: 800 }}>أحدث الإضافات للمكتبة</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>شاهد أحدث الفيديوهات والتطبيقات والملفات المرفوعة للجميع</p>
            </div>
            <Link to="/content" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              عرض كل المحتوى ←
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>جاري تحميل المكتبة...</span>
            </div>
          ) : latestItems.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              لا يوجد محتوى متوفر حالياً في المكتبة. يرجى التواصل مع المدير للرفع.
            </div>
          ) : (
            <div className="grid-cards">
              {latestItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`glass-card reveal reveal-delay-${(index % 3) + 1}`} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    borderTop: item.type === 'app' ? '2px solid rgba(241, 196, 15, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Visual Header */}
                  <div style={{
                    height: '160px',
                    background: item.type === 'video' 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 58, 138, 0.3) 100%)'
                      : item.type === 'app'
                      ? 'linear-gradient(135deg, rgba(241, 196, 15, 0.12) 0%, rgba(180, 83, 9, 0.25) 100%)'
                      : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 79, 96, 0.3) 100%)',
                    borderRadius: '16px 16px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    position: 'relative'
                  }}>
                    {item.type === 'video' ? <Play size={40} style={{ opacity: 0.8 }} /> : <Download size={40} style={{ opacity: 0.8 }} />}
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(10, 15, 29, 0.85)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      border: '1px solid var(--border-color)',
                      color: item.type === 'app' ? 'var(--accent-gold)' : 'white'
                    }}>
                      {item.type === 'video' ? 'فيديو 🎬' : item.type === 'app' ? 'تطبيق 📱' : 'ملف 📎'}
                    </span>
                  </div>

                  {/* Content body */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '8px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'white' }}>{item.title}</h4>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
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
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '12px',
                      marginTop: '10px'
                    }}>
                      <span>الحجم: {(item.fileSize / (1024 * 1024)).toFixed(1)} ميجا</span>
                      <span>المشاهدات: {item.views || 0}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {user ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ ...goldBtnStyle, flexGrow: 1, padding: '8px 12px', fontSize: '0.85rem', boxShadow: 'none' }}
                        >
                          <Download size={14} />
                          تحميل
                        </a>
                      ) : (
                        <Link
                          to="/login"
                          className="btn"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', flexGrow: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                        >
                          <Download size={14} />
                          سجل دخول للتحميل
                        </Link>
                      )}
                      
                      {/* Share Dropdowns */}
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
        </div>
      </div>
    </div>
  );
}
