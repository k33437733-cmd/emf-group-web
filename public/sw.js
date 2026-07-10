// ─── EMF Group — Production Service Worker ──────────────────────────
// Cache strategy: Network-first for everything, cache-first for static assets.
// Offline support for static assets only.

var CACHE_NAME = 'emf-cache-v1';
var STATIC_ASSETS = /\.(js|css|svg|woff2?|ttf|eot|png|jpg|jpeg|gif|ico|webp|avif)$/;
var SKIP_PATTERNS = [
  /\/__\w+/,
  /firestore/,
  /firebase/,
  /firebasestorage/,
  /google-analytics/,
  /googlesyndication/,
  /googleapis\.com/,
];

function shouldCache(request) {
  if (request.method !== 'GET') return false;
  var url = request.url;
  for (var i = 0; i < SKIP_PATTERNS.length; i++) {
    if (SKIP_PATTERNS[i].test(url)) return false;
  }
  return true;
}

function shouldServeOffline(request) {
  return STATIC_ASSETS.test(request.url);
}

async function networkFirst(request) {
  try {
    var response = await fetch(request);
    if (response.ok && response.status !== 206 && shouldCache(request)) {
      var cache = await caches.open(CACHE_NAME);
      try { cache.put(request, response.clone()); } catch (e) { /* ignore */ }
    }
    return response;
  } catch (err) {
    var cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  var cached = await caches.match(request);
  if (cached) return cached;
  try {
    var response = await fetch(request);
    if (response.ok && response.status !== 206) {
      var cache = await caches.open(CACHE_NAME);
      try { cache.put(request, response.clone()); } catch (e) { /* ignore */ }
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    (async function() {
      var keys = await caches.keys();
      await Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })(),
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (!shouldCache(request)) {
    event.respondWith(fetch(request)['catch'](function() { return new Response('Offline', { status: 503 }); }));
    return;
  }

  if (shouldServeOffline(request)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
