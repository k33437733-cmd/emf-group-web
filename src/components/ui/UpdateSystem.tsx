import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Download, RefreshCw, Bell, Settings, 
  X, Check, Clock, Shield, Zap, Package 
} from 'lucide-react';
import initUpdateSystem from '../../lib/updates';
import type { 
  UpdateInfo, UpdateNotification, UpdateType, UpdatePriority 
} from '../../lib/updates';
import type { ToastType } from './Toast';
import { showToast } from './Toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UpdateSystemProps {
  config?: {
    checkInterval?: number;
    showDelayedBanner?: boolean;
    autoReloadOnCritical?: boolean;
    notifyUserOnMinor?: boolean;
    enableServiceWorker?: boolean;
  };
}

export default function UpdateSystem({ config }: UpdateSystemProps) {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [notifications, setNotifications] = useState<UpdateNotification[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  const updateSystem = React.useRef<ReturnType<typeof initUpdateSystem> | null>(null);

  useEffect(() => {
    // Initialize update system
    updateSystem.current = initUpdateSystem(config);
    
    // Listen for custom update events
    const handleUpdateAvailable = (event: CustomEvent<UpdateInfo>) => {
      setUpdateAvailable(event.detail);
      setShowBanner(true);
      
      // Show toast notification
      const priority = event.detail.priority;
      const type = event.detail.type;
      
      let toastType: ToastType = 'info';
      if (priority === 'critical') toastType = 'error';
      else if (priority === 'high') toastType = 'warning';
      else if (type === 'major') toastType = 'success';
      
      showToast(`تحديث ${getTypeArabic(type)} متاح!`, toastType);
    };
    
    window.addEventListener('app-update-available', handleUpdateAvailable as EventListener);
    
    // Load stored notifications
    setNotifications(updateSystem.current.getNotifications());
    
    // Check for PWA install prompt
    if ('BeforeInstallPromptEvent' in window) {
      const handler = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler as EventListener);
    }
    
    // Check for updates immediately on mount
    updateSystem.current.checkNow().then((update: UpdateInfo | null) => {
      if (update) {
        setUpdateAvailable(update);
        setShowBanner(true);
      }
    });
    
    return () => {
      window.removeEventListener('app-update-available', handleUpdateAvailable as EventListener);
      if (updateSystem.current) updateSystem.current.stop();
    };
  }, []);

  const handleReload = () => {
    if (updateAvailable?.priority === 'critical' && config?.autoReloadOnCritical !== false) {
      // Auto-reload for critical updates
      setIsReloading(true);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      // Manual reload with confirmation
      if (window.confirm(`هل تريد تحديث التطبيق الآن؟\n\n${updateAvailable?.changelog}`)) {
        setIsReloading(true);
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('تم تثبيت التطبيق بنجاح!', 'success');
        setInstallPrompt(null);
      }
    }
  };

  const handleDismiss = (id: string) => {
    if (updateSystem.current) {
      updateSystem.current.markAsRead(id);
      setNotifications(updateSystem.current.getNotifications());
    }
  };

  const handleClearAll = () => {
    if (updateSystem.current) {
      updateSystem.current.clearNotifications();
      setNotifications([]);
      showToast('تم مسح جميع الإشعارات', 'info');
    }
  };

  const getPriorityColor = (priority: UpdatePriority): string => {
    const colors: Record<UpdatePriority, string> = {
      critical: 'var(--accent-red)',
      high: 'var(--accent-amber)',
      normal: 'var(--accent-blue)',
      low: 'var(--accent-emerald)'
    };
    return colors[priority];
  };

  const getTypeIcon = (type: UpdateType): React.ReactNode => {
    const icons: Record<UpdateType, React.ReactNode> = {
      patch: <RefreshCw size={14} />,
      minor: <Zap size={14} />,
      major: <Shield size={14} />,
      content: <Package size={14} />,
      system: <Settings size={14} />
    };
    return icons[type];
  };

  const getTypeArabic = (type: UpdateType): string => {
    const arabic: Record<UpdateType, string> = {
      patch: 'تحسينات',
      minor: 'ثانوي',
      major: 'رئيسي',
      content: 'محتوى',
      system: 'نظام'
    };
    return arabic[type];
  };

  const getPriorityArabic = (priority: UpdatePriority): string => {
    const arabic: Record<UpdatePriority, string> = {
      critical: 'حرج',
      high: 'عالي',
      normal: 'عادي',
      low: 'منخفض'
    };
    return arabic[priority];
  };

  // Don't show anything if no update
  if (!showBanner && !showPanel && notifications.length === 0 && !installPrompt) {
    return null;
  }

  return (
    <>
      {/* Install PWA Banner */}
      {installPrompt && (
        <div className="animate-fade" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          left: '24px',
          maxWidth: '400px',
          margin: '0 auto',
          zIndex: 10000,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '10px',
            borderRadius: '12px',
            color: 'var(--accent-blue)'
          }}>
            <Download size={20} />
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>تثبيت كتطبيق 📱</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              تثبيت EMF Group على جهازك لتجربة أسرع
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleInstall}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              تثبيت
            </button>
            <button 
              onClick={() => setInstallPrompt(null)}
              className="btn btn-secondary"
              style={{ padding: '8px' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Update Banner */}
      {showBanner && updateAvailable && (
        <div className="animate-fade" style={{
          position: 'fixed',
          top: 'var(--navbar-height)',
          left: 0,
          right: 0,
          zIndex: 9999,
          background: updateAvailable.priority === 'critical' 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.3) 100%)'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 58, 138, 0.3) 100%)',
          borderBottom: `1px solid ${getPriorityColor(updateAvailable.priority)}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          direction: 'rtl'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            {updateAvailable.priority === 'critical' ? (
              <AlertTriangle size={20} style={{ color: getPriorityColor(updateAvailable.priority) }} />
            ) : (
              getTypeIcon(updateAvailable.type)
            )}
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                تحديث {getTypeArabic(updateAvailable.type)} ({getPriorityArabic(updateAvailable.priority)})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {updateAvailable.changelog}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button 
              onClick={handleReload}
              disabled={isReloading}
              className="btn btn-primary"
              style={{ 
                padding: '8px 16px',
                fontSize: '0.8rem',
                background: updateAvailable.priority === 'critical' ? 'var(--gradient-danger)' : undefined
              }}
            >
              {isReloading ? (
                <>
                  <RefreshCw size={14} className="animate-spin-fast" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  تحديث الآن
                </>
              )}
            </button>
            <button 
              onClick={() => setShowBanner(false)}
              className="btn btn-secondary"
              style={{ padding: '8px' }}
            >
              <Clock size={14} />
            </button>
            <button 
              onClick={() => setShowPanel(true)}
              className="btn btn-secondary"
              style={{ padding: '8px' }}
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showPanel && (
        <div className="animate-scale" style={{
          position: 'fixed',
          top: 'calc(var(--navbar-height) + 20px)',
          left: '20px',
          right: '20px',
          maxWidth: '500px',
          margin: '0 auto',
          zIndex: 10000,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ fontWeight: 'bold', fontSize: '1rem' }}>مركز التحديثات</h3>
            </div>
            <button 
              onClick={() => setShowPanel(false)}
              className="btn btn-secondary"
              style={{ padding: '6px' }}
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Update Status */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: updateAvailable ? getPriorityColor(updateAvailable.priority) : '#10b981'
                }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {updateAvailable ? 'تحديث متاح' : 'أحدث إصدار'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {updateAvailable ? updateAvailable.version : 'مستقر'}
              </span>
            </div>
          </div>
          
          {/* Notifications List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>الإشعارات السابقة</span>
              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-blue)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  مسح الكل
                </button>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                لا توجد إشعارات سابقة
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: notif.read ? 0.7 : 1
                }}>
                  <div style={{
                    padding: '6px',
                    background: `rgba(${notif.read ? '59, 130, 246, 0.1' : '59, 130, 246, 0.2'})`,
                    borderRadius: '8px',
                    color: 'var(--accent-blue)'
                  }}>
                    {getTypeIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: notif.read ? '500' : 'bold' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(notif.timestamp).toLocaleString('ar-EG')}
                    </div>
                  </div>
                  {!notif.read && (
                    <button 
                      onClick={() => handleDismiss(notif.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-emerald)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="تمت القراءة"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => {
                if (updateSystem.current) {
                  updateSystem.current.checkNow().then((update: UpdateInfo | null) => {
                    if (update) {
                      setUpdateAvailable(update);
                      setShowBanner(true);
                      showToast('تم التحقق من التحديثات', 'success');
                    } else {
                      showToast('أنت تستخدم أحدث إصدار', 'info');
                    }
                  });
                }
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} />
              التحقق الآن
            </button>
            {updateAvailable && (
              <button 
                onClick={handleReload}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                <RefreshCw size={14} />
                تحديث التطبيق
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Notification Badge */}
      {notifications.filter(n => !n.read).length > 0 && !showPanel && (
        <button 
          onClick={() => setShowPanel(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 9998,
            background: 'var(--gradient-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease'
          }}
          className="animate-pulse"
        >
          <Bell size={20} />
          {notifications.filter(n => !n.read).length > 0 && (
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'var(--accent-red)',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      )}
      
      {/* Overlay for panel */}
      {showPanel && (
        <div 
          onClick={() => setShowPanel(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
    </>
  );
}