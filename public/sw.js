/**
 * Service Worker لنظام التحديثات المتقدم
 * استراتيجية التخزين المؤقت:
 * - الملفات الثابتة (index.html, version.json, manifest.json): Cache First
 * - أصول Vite ذات الأسماء المميزة (assets/): Cache First (لا تنتهي صلاحيتها)
 * - كل شيء آخر: Network First
 */

const CACHE_NAME = 'emf-group-v2';
const STATIC_PATHS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/version.json',
  '/manifest.json'
];

// Install — تخزين الملفات الثابتة مسبقاً
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_PATHS))
  );
  // لا نستدعي skipWaiting() هنا — ننتظر إشارة من الصفحة
});

// Activate — تنظيف الكاشات القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — استراتيجية ذكية حسب نوع المورد
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // تجاهل طلبات Firebase/Supabase (تدار بواسطة SDK)
  if (
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  // أصول Vite ذات الأسماء المميزة (تحتوي على hash) — Cache First
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        }))
    );
    return;
  }

  // الملفات الثابتة — Cache First
  if (STATIC_PATHS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }

  // كل شيء آخر — Network First مع fallback إلى cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// الإشعارات الفورية (Push)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'EMF Group', {
      body: data.message || '',
      icon: '/favicon.svg',
      badge: '/icons.svg',
      tag: data.tag || 'notification',
      data: { url: data.url || '/' },
      actions: [
        { action: 'view', title: 'عرض' },
        { action: 'dismiss', title: 'تجاهل' }
      ]
    });
  } catch {
    // تجاهل الإشعارات غير الصالحة
  }
});

// النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// استقبال أوامر من الصفحة الرئيسية
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
