/**
 * نظام التحديثات المتقدم لـ EMF Group
 */

export type UpdateType = 'patch' | 'minor' | 'major' | 'content' | 'system';
export type UpdatePriority = 'low' | 'normal' | 'high' | 'critical';

export interface UpdateInfo {
  version: string;
  buildTime: number;
  type: UpdateType;
  priority: UpdatePriority;
  changelog: string;
  hash?: string;
  requiresReload: boolean;
  estimatedSize?: number; // بالكيلوبايت
}

export interface UpdateNotification {
  id: string;
  title: string;
  message: string;
  type: UpdateType;
  priority: UpdatePriority;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface UpdateConfig {
  checkInterval: number; // دقيقة
  showDelayedBanner: boolean;
  autoReloadOnCritical: boolean;
  notifyUserOnMinor: boolean;
  enableServiceWorker: boolean;
}

const DEFAULT_CONFIG: UpdateConfig = {
  checkInterval: 5, // كل 5 دقائق
  showDelayedBanner: true,
  autoReloadOnCritical: true,
  notifyUserOnMinor: false,
  enableServiceWorker: true
};

// Service Worker Registration
export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] Registered:', registration.scope);

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'activated') {
            window.dispatchEvent(new CustomEvent('sw-updated'));
          }
        });
      }
    });

    return true;
  } catch (error) {
    console.warn('[SW] Registration failed:', error);
    return false;
  }
}

// Progressive Web App Install
export function showInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    if ('BeforeInstallPromptEvent' in window) {
      const handler = (e: any) => {
        e.preventDefault();
        window.deferredPrompt = e;
        resolve(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
    } else {
      resolve(false);
    }
  });
}

// Check for updates with cache-busting
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch('/version.json?t=' + Date.now(), {
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const currentBuildTime = (window as any).__BUILD_TIME__ || __BUILD_TIME__;

    if (data.time && data.time > currentBuildTime) {
      return {
        version: data.version || String(data.time),
        buildTime: data.time,
        type: 'patch',
        priority: data.critical ? 'critical' : 'normal',
        changelog: data.changelog || 'تحديثات جديدة متاحة',
        requiresReload: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Store update notifications in localStorage
export function storeUpdateNotification(update: UpdateInfo): UpdateNotification {
  const notification: UpdateNotification = {
    id: `update_${Date.now()}`,
    title: getUpdateTitle(update.type),
    message: update.changelog,
    type: update.type,
    priority: update.priority,
    timestamp: Date.now(),
    read: false,
    actionUrl: '/changelog',
    actionLabel: 'عرض التفاصيل'
  };
  
  const notifications = getStoredNotifications();
  notifications.unshift(notification);
  localStorage.setItem('app_updates', JSON.stringify(notifications.slice(0, 20))); // Keep last 20
  
  return notification;
}

// Get stored notifications
export function getStoredNotifications(): UpdateNotification[] {
  try {
    const stored = localStorage.getItem('app_updates');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Mark notification as read
export function markNotificationAsRead(id: string): void {
  const notifications = getStoredNotifications();
  const updated = notifications.map(n => 
    n.id === id ? { ...n, read: true } : n
  );
  localStorage.setItem('app_updates', JSON.stringify(updated));
}

// Clear all notifications
export function clearAllNotifications(): void {
  localStorage.removeItem('app_updates');
}

// Get update title based on type
function getUpdateTitle(type: UpdateType): string {
  const titles: Record<UpdateType, string> = {
    patch: 'تحديث تحسينات 🛠️',
    minor: 'إصدار جديد ✨',
    major: 'تحديث رئيسي 🚀',
    content: 'محتوى جديد 📦',
    system: 'تحديث النظام 🔄'
  };
  return titles[type] || 'تحديث متاح';
}

// Initialize update system
export function initUpdateSystem(config?: Partial<UpdateConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Register service worker if enabled
  if (finalConfig.enableServiceWorker) {
    registerServiceWorker().catch(() => {
      console.warn('Service worker disabled');
    });
  }
  
  // Schedule periodic checks
  let checkInterval: ReturnType<typeof setInterval> | null = null;
  
  function startPeriodicChecks() {
    if (checkInterval) clearInterval(checkInterval);
    
    checkInterval = setInterval(async () => {
      const update = await checkForUpdates();
      if (update) {
        storeUpdateNotification(update);
        // Notify UI via custom event
        window.dispatchEvent(new CustomEvent('app-update-available', {
          detail: update
        }));
      }
    }, finalConfig.checkInterval * 60 * 1000);
  }
  
  startPeriodicChecks();
  
  return {
    stop: () => {
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = null;
    },
    checkNow: async () => await checkForUpdates(),
    getConfig: () => finalConfig,
    getNotifications: getStoredNotifications,
    markAsRead: markNotificationAsRead,
    clearNotifications: clearAllNotifications
  };
}

// Extend Window interface
declare global {
  interface Window {
    deferredPrompt?: any;
    __UPDATE_SYSTEM?: ReturnType<typeof initUpdateSystem>;
  }
}

export default initUpdateSystem;