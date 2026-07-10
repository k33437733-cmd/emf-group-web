/**
 * Silent update system for EMF Group
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
  estimatedSize?: number;
}

export interface UpdateConfig {
  checkInterval: number;
  enableServiceWorker: boolean;
}

const DEFAULT_CONFIG: UpdateConfig = {
  checkInterval: 5,
  enableServiceWorker: true
};

// Service Worker Registration
let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    swRegistration.addEventListener('updatefound', () => {
      const installing = swRegistration!.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'activated') {
            window.dispatchEvent(new CustomEvent('sw-updated'));
          }
        });
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.dispatchEvent(new CustomEvent('sw-activated'));
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
      const handler = (e: Event) => {
        e.preventDefault();
        window.__deferredPrompt = e;
        resolve(true);
      };
      window.addEventListener('beforeinstallprompt', handler as EventListener);
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
    const currentBuildTime = window.__BUILD_TIME__ || __BUILD_TIME__;

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

export function getStoredNotifications(): UpdateInfo[] {
  try {
    const stored = sessionStorage.getItem('emf_update_applied');
    return stored ? [JSON.parse(stored)] : [];
  } catch {
    return [];
  }
}

let initialized = false;

export function initUpdateSystem(config?: Partial<UpdateConfig>) {
  if (initialized) {
    return window.__UPDATE_SYSTEM!;
  }
  initialized = true;

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (finalConfig.enableServiceWorker) {
    registerServiceWorker().catch(() => {});
  }

  let checkInterval: ReturnType<typeof setInterval> | null = null;

  function startPeriodicChecks() {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(async () => {
      const update = await checkForUpdates();
      if (update) {
        sessionStorage.setItem('emf_update_applied', JSON.stringify(update));
        if (swRegistration) {
          try { swRegistration.update(); } catch {}
        }
        window.dispatchEvent(new CustomEvent('app:update-applied', {
          detail: update
        }));
        window.dispatchEvent(new CustomEvent('app-update-applied', {
          detail: update
        }));
      }
    }, finalConfig.checkInterval * 60 * 1000);
  }

  startPeriodicChecks();

  const instance = {
    stop: () => {
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = null;
    },
    checkNow: async () => await checkForUpdates(),
    getConfig: () => finalConfig,
    getNotifications: getStoredNotifications,
  };

  window.__UPDATE_SYSTEM = instance;
  return instance;
}

// Extend Window interface
declare global {
  interface Window {
    __BUILD_TIME__: number;
    __deferredPrompt?: Event;
    __UPDATE_SYSTEM?: ReturnType<typeof initUpdateSystem>;
  }
}

export default initUpdateSystem;