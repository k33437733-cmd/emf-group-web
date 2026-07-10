import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor, Palette, Shield, User, Bell } from 'lucide-react';

type Tab = 'appearance' | 'profile' | 'security' | 'notifications';

const tabs: { key: Tab; label: string; icon: typeof Sun }[] = [
  { key: 'appearance', label: 'المظهر', icon: Palette },
  { key: 'profile', label: 'الملف الشخصي', icon: User },
  { key: 'security', label: 'الأمان', icon: Shield },
  { key: 'notifications', label: 'الإشعارات', icon: Bell },
];

const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; desc: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'فاتح', desc: 'واجهة مشرقة مناسبة للإضاءة القوية', icon: Sun },
  { value: 'dark', label: 'داكن', desc: 'واجهة مريحة للعين في الإضاءة المنخفضة', icon: Moon },
  { value: 'system', label: 'النظام', desc: 'تطابق إعدادات جهازك تلقائياً', icon: Monitor },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode, appliedTheme, setMode } = useTheme();

  const activeTab: Tab = (searchParams.get('tab') as Tab) || 'appearance';

  const switchTab = (tab: Tab) => {
    setSearchParams(tab === 'appearance' ? {} : { tab });
  };

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 900 }}>
      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0 }}>
          الإعدادات
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          خصص تجربتك وتحكم في إعدادات حسابك
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 'var(--space-1)',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: 0, marginBottom: 'var(--space-8)',
        flexWrap: 'wrap',
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-5)',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 'var(--fw-bold)' : 'var(--fw-medium)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'all var(--transition-fast)',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div>
          {/* Theme selector */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
          }}>
            <h2 style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--text-primary)',
              margin: '0 0 var(--space-1) 0',
            }}>
              المظهر
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              margin: '0 0 var(--space-5) 0',
            }}>
              {mode === 'system'
                ? `يتبع النظام حالياً: ${appliedTheme === 'dark' ? 'داكن' : 'فاتح'}`
                : `الوضع الحالي: ${mode === 'dark' ? 'داكن' : 'فاتح'}`}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
              gap: 'var(--space-4)',
            }}>
              {themeOptions.map(opt => {
                const selected = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-6) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      border: selected
                        ? '2px solid var(--accent-blue)'
                        : '2px solid var(--border-color)',
                      background: selected ? 'var(--sidebar-active)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all var(--transition-base)',
                      boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48,
                      borderRadius: 'var(--radius-full)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selected
                        ? 'var(--accent-blue)'
                        : 'var(--badge-bg)',
                      color: selected ? '#fff' : 'var(--text-secondary)',
                      transition: 'all var(--transition-base)',
                    }}>
                      <opt.icon size={22} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--fw-bold)',
                        color: 'var(--text-primary)',
                      }}>
                        {opt.label}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        marginTop: 'var(--space-1)',
                      }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color scheme preview */}
          <div style={{
            marginTop: 'var(--space-4)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
          }}>
            <h3 style={{
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--text-primary)',
              margin: '0 0 var(--space-4) 0',
            }}>
              معاينة الألوان
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              {['--bg-primary', '--bg-card', '--bg-elevated', '--bg-tertiary'].map(v => (
                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                    background: `var(${v})`,
                    border: '1px solid var(--border-color)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', direction: 'ltr' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder tabs */}
      {activeTab === 'profile' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}>
          <User size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>إعدادات الملف الشخصي</p>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}>
          <Shield size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>إعدادات الأمان</p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}>
          <Bell size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>إعدادات الإشعارات</p>
        </div>
      )}
    </div>
  );
}
