import { useState, useEffect } from 'react';

type NetworkStatus = 'online' | 'offline';

export function useNetworkStatus(): { status: NetworkStatus; isOnline: boolean } {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const go = () => setOnline(true);
    const goOff = () => setOnline(false);
    window.addEventListener('online', go);
    window.addEventListener('offline', goOff);
    return () => {
      window.removeEventListener('online', go);
      window.removeEventListener('offline', goOff);
    };
  }, []);

  return { status: online ? 'online' : 'offline', isOnline: online };
}
