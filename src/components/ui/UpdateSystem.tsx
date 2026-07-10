import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { sendNotification } from '../../firebase/db';
import initUpdateSystem from '../../lib/updates';
import type { UpdateInfo } from '../../lib/updates';
import { APP_EVENTS } from '../../constants/events';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UpdateSystemProps {
  config?: {
    checkInterval?: number;
    enableServiceWorker?: boolean;
  };
}

export default function UpdateSystem({ config }: UpdateSystemProps) {
  const { user } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    initUpdateSystem(config);

    const handleUpdateApplied = (event: Event) => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return;

      try {
        sendNotification({
          recipientId: user.uid,
          type: 'system',
          category: 'updates',
          priority: 'normal',
          title: 'Website Updated Successfully',
          body: 'Click to view release notes.',
          link: '/admin/release-notes',
          channel: 'in_app',
          archived: false,
          sentVia: { push: false, email: false },
        });
      } catch {}
    };

    const listener = handleUpdateApplied as EventListener;
    window.addEventListener(APP_EVENTS.UPDATE_APPLIED, listener);
    window.addEventListener('app-update-applied', listener);

    return () => {
      window.removeEventListener(APP_EVENTS.UPDATE_APPLIED, listener);
      window.removeEventListener('app-update-applied', listener);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const stored = sessionStorage.getItem('emf_update_applied');
    if (!stored) return;
    sessionStorage.removeItem('emf_update_applied');

    if (user.role !== 'admin' && user.role !== 'super_admin') return;

    try {
      JSON.parse(stored);
      sendNotification({
        recipientId: user.uid,
        type: 'system',
        category: 'updates',
        priority: 'normal',
        title: 'Website Updated Successfully',
        body: 'Click to view release notes.',
        link: '/admin/release-notes',
        channel: 'in_app',
        archived: false,
        sentVia: { push: false, email: false },
      });
    } catch {}
  }, [user]);

  useEffect(() => {
    if ('BeforeInstallPromptEvent' in window) {
      const handler = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler as EventListener);
    }
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    }
  };

  if (!installPrompt) return null;

  return (
          <div className="animate-fade" style={{
            position: 'fixed',
            bottom: 'var(--space-6)',
            right: 'var(--space-6)',
            left: 'var(--space-6)',
            maxWidth: '400px',
            margin: '0 auto',
            zIndex: 10000,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
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
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>تثبيت كتطبيق</div>
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
  );
}