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
  }, [latestItems]); // Trigger overlay triggers when items load

  const canViewRestricted = !!user && ['agent', 'admin', 'super_admin'].includes(user.role);
  const canViewAdminOnly = !!user && ['admin', 'super_admin'].includes(user.role);

  useEffect(() => {
    const unsub = subscribeToContents((items) => {
      const visibleItems = items.filter(item => {
        if (item.accessLevel === 'all') return true;
        if (item.accessLevel === 'agent') return canViewRestricted;
        if (item.accessLevel === 'admin') return canViewAdminOnly;
        return false;
      });
      // Show only top 6 latest items on home page
      setLatestItems(visibleItems.slice(0, 6));
      setLoading(false);
    });
    return () => unsub();
  }, [canViewRestricted, canViewAdminOnly]);

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
    color: '#090d16',
    boxShadow: '0 6px 22px rgba(241, 196, 15, 0.25)',
    border: 'none',
    fontWeight: 700
  };

  return (
    <div className="animate-fade" style={{ direction: 'rtl', width: '100%', background: 'var(--bg-primary)' }}>
      
      {/* Hero Section with Video Background */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          marginTop: 'calc(-1 * var(--navbar-height))',
          zIndex: 0,
          overflow: 'hidden'
        }}
      >
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
            pointerEvents: 'none',
            opacity: 0.65
          }}
        >
          <source src="/entro/6330779-hd_1920_1080_30fps.mp4" type="video/mp4" />
        </video>

        {/* Overlay Gradients */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(9, 13, 22, 0.4) 0%, rgba(9, 13, 22, 0.95) 90%)',
          zIndex: 1
        }} />

        {/* Content container */}
        <div 
          style={{ 
            zIndex: 2, 
            maxWidth: '850px', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '24px', 
            textAlign: 'center', 
            marginTop: 'calc(var(--navbar-height) + 20px)' 
          }}
        >
          
          {/* Tag */}
          <span 
            className="reveal active" 
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'var(--accent-gold)',
              background: 'rgba(241, 196, 15, 0.08)',
              padding: '8px 22px',
              borderRadius: '9999px',
              border: '1px solid rgba(241, 196, 15, 0.2)',
              display: 'inline-block',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            مجموعة EMF للحلول البرمجية والتحول الرقمي
          </span>
          
          {/* Glowing Brand Type */}
          <h1 
            className="reveal active" 
            style={{
              fontSize: 'clamp(4.2rem, 11vw, 8.5rem)',
              fontWeight: 900,
              lineHeight: 0.95,
              margin: '10px 0 0',
              letterSpacing: '1px',
              fontFamily: 'var(--font-en)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              direction: 'ltr',
              position: 'relative'
            }}
          >
            {/* Glowing Light Behind logo */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle, rgba(241, 196, 15, 0.25) 0%, transparent 60%)',
              filter: 'blur(40px)',
              zIndex: -1,
              pointerEvents: 'none'
            }} />

            <span style={{ color: '#ffffff', textShadow: '0 0 30px rgba(255,255,255,0.35)' }}>EM</span>
            <span style={{ 
              background: 'var(--gradient-gold)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(241, 196, 15, 0.25)'
            }}>F</span>
          </h1>

          {/* Subtitle */}
          <h2 
            className="reveal reveal-delay-1 active" 
            style={{
              fontSize: 'clamp(1.45rem, 3.5vw, 2.2rem)',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 40%, #d1d5db 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginTop: '5px',
              lineHeight: 1.3
            }}
          >
            نبتكر الحلول البرمجية الذكية ونطور المستقبل الرقمي
          </h2>

          {/* Paragraph */}
          <p 
            className="reveal reveal-delay-2 active" 
            style={{
              fontSize: '0.98rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
              maxWidth: '680px',
              margin: '0 auto',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)'
            }}
          >
            نحن في مجموعة EMF نتخصص في تصميم وتطوير مواقع الويب المتكاملة وتطبيقات الهواتف الذكية (Android & iOS) بأحدث التقنيات وأقوى أنظمة الحماية، لتمكين الشركات والأفراد من تحقيق تحول رقمي مستدام واستجابة فائقة السرعة لجميع الأنظمة.
          </p>

          {/* CTA Buttons */}
          <div 
            className="reveal reveal-delay-3 active" 
            style={{ 
              display: 'flex', 
              gap: '16px', 
              justifyContent: 'center', 
              marginTop: '16px', 
              width: '100%', 
              flexWrap: 'wrap' 
            }}
          >
            {user ? (
              <Link to="/content" className="btn" style={{ ...goldBtnStyle, padding: '15px 36px', fontSize: '1rem' }}>
                استكشف المكتبة الرقمية
                <ArrowLeft size={16} style={{ marginRight: '6px' }} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn" style={{ ...goldBtnStyle, padding: '15px 36px', fontSize: '1rem' }}>
                  ابدأ الآن مجاناً
                  <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                </Link>
                <a 
                  href="#about" 
                  className="btn btn-secondary" 
                  style={{ 
                    padding: '15px 36px', 
                    fontSize: '1rem', 
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-color)' 
                  }}
                >
                  من نحن
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '80px 24px' }}>
        
        {/* Services Showcase */}
        <div id="about" style={{ marginBottom: '90px', scrollMarginTop: '100px' }} className="grid-cards">
          
          {/* Card 1: Web Development */}
          <div 
            className="glass-card reveal active" 
            style={{ 
              padding: '36px', 
              borderTop: '2px solid rgba(59, 130, 246, 0.2)' 
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              marginBottom: '20px'
            }}>
              <Globe size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              تطوير مواقع وأنظمة الويب
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.7 }}>
              برمجة مواقع الكترونية فائقة السرعة ومتجاوبة تماماً مع مختلف الشاشات، بالإضافة إلى أنظمة الويب المعقدة وبوابات الإدارة المخصصة لرفع كفاءة أعمالك.
            </p>
          </div>

          {/* Card 2: Mobile App Development */}
          <div 
            className="glass-card reveal reveal-delay-1 active" 
            style={{ 
              padding: '36px', 
              borderTop: '2px solid rgba(241, 196, 15, 0.3)' 
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(241, 196, 15, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
              marginBottom: '20px'
            }}>
              <Smartphone size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              تطوير تطبيقات الهاتف
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.7 }}>
              بناء وتطوير تطبيقات هواتف ذكية متكاملة لنظامي iOS & Android بتصاميم عصرية وتجربة مستخدم سلسة تحقق طموحاتك التجارية.
            </p>
          </div>

          {/* Card 3: Cloud Systems */}
          <div 
            className="glass-card reveal reveal-delay-2 active" 
            style={{ 
              padding: '36px', 
              borderTop: '2px solid rgba(6, 182, 212, 0.2)' 
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              marginBottom: '20px'
            }}>
              <Cloud size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              الحلول السحابية وإدارة الملفات
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.7 }}>
              توفير بوابات رفع ومشاركة الملفات والتطبيقات للمستخدمين بشكل منظم مع شات تواصل فوري مخصص ومؤمن لإدارة التفاعل اللحظي بكفاءة.
            </p>
          </div>
        </div>

        {/* Latest Content Showcase */}
        <div style={{ marginBottom: '40px' }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-end', 
              marginBottom: '32px',
              flexWrap: 'wrap',
              gap: '12px'
            }} 
            className="reveal-left active"
          >
            <div>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                أحدث الإضافات للمكتبة
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                شاهد أحدث الفيديوهات والتطبيقات والملفات المرفوعة للجميع
              </p>
            </div>
            <Link 
              to="/content" 
              style={{ 
                color: 'var(--accent-gold)', 
                textDecoration: 'none', 
                fontSize: '0.84rem', 
                fontWeight: 600,
                transition: 'opacity 0.2s',
              }}
              className="hover-opacity-btn"
            >
              عرض كل المحتوى ←
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div 
                className="animate-spin-fast" 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.04)',
                  borderTopColor: 'var(--accent-gold)'
                }}
              />
            </div>
          ) : latestItems.length === 0 ? (
            <div 
              className="glass-card" 
              style={{ 
                padding: '50px 20px', 
                textAlign: 'center', 
                color: 'var(--text-secondary)', 
                fontSize: '0.9rem' 
              }}
            >
              لا يوجد محتوى متوفر حالياً في المكتبة الرقمية.
            </div>
          ) : (
            <div className="grid-cards">
              {latestItems.map((item) => {
                const accentColor = item.type === 'video' 
                  ? 'rgba(59, 130, 246, 0.2)' 
                  : item.type === 'app'
                  ? 'rgba(241, 196, 15, 0.2)'
                  : 'rgba(6, 182, 212, 0.2)';
                
                return (
                  <div 
                    key={item.id} 
                    className="glass-card" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      height: '100%',
                      overflow: 'hidden',
                      borderTop: `2px solid ${accentColor}`
                    }}
                  >
                    {/* Visual Banner Area */}
                    <div 
                      style={{
                        height: '150px',
                        background: item.type === 'video' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 58, 138, 0.25) 100%)'
                          : item.type === 'app'
                          ? 'linear-gradient(135deg, rgba(241, 196, 15, 0.06) 0%, rgba(180, 83, 9, 0.2) 100%)'
                          : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 79, 96, 0.25) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        position: 'relative'
                      }}
                    >
                      {item.type === 'video' ? (
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Play size={18} style={{ marginRight: '-2px' }} />
                        </div>
                      ) : (
                        <Download size={32} style={{ opacity: 0.7 }} />
                      )}
                      
                      <span 
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(9, 13, 22, 0.85)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.68rem',
                          fontWeight: 'bold',
                          border: '1px solid var(--border-color)',
                          color: item.type === 'app' ? 'var(--accent-gold)' : 'white'
                        }}
                      >
                        {item.type === 'video' ? 'فيديو' : item.type === 'app' ? 'تطبيق' : 'ملف'}
                      </span>
                    </div>

                    {/* Content Body */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '8px' }}>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {item.title}
                      </h4>
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
                        {item.description || 'لا يوجد وصف متاح لهذا العنصر.'}
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '12px',
                        marginTop: '8px'
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
                            style={{ ...goldBtnStyle, flexGrow: 1, padding: '8px 12px', fontSize: '0.8rem', boxShadow: 'none' }}
                          >
                            <Download size={14} />
                            تحميل مباشر
                          </a>
                        ) : (
                          <Link
                            to="/login"
                            className="btn"
                            style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid var(--border-color)', 
                              flexGrow: 1, 
                              padding: '8px 12px', 
                              fontSize: '0.8rem' 
                            }}
                          >
                            <Download size={14} />
                            سجل دخول للتحميل
                          </Link>
                        )}
                        
                        <button
                          onClick={() => handleShare(item, 'whatsapp')}
                          title="مشاركة عبر واتساب"
                          className="btn btn-secondary"
                          style={{ padding: '8px', borderRadius: '10px' }}
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
        </div>
      </div>
      
      <style>{`
        .hover-opacity-btn:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
