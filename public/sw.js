// Static cache version — يجب رفعها يدويًا (v1 -> v2 -> ...) مع كل إصدار جديد.
// تحذير: لا تستخدم Date.now() أو أي قيمة تتغيّر وقت التشغيل هنا. الـService
// Worker يُعاد تشغيله (restart) من المتصفح دوريًا بدون المرور بدورة
// install/activate الكاملة، وحينها يُعاد تنفيذ هذا الكود من جديد — فإذا كانت
// القيمة ديناميكية سيُنشأ اسم Cache مختلف في كل مرة، ويتراكم عدد لا نهائي من
// الكاشات القديمة لأن تنظيف الكاشات القديمة يحدث فقط داخل activate (لا يحدث
// عند مجرد إعادة تشغيل الـworker)، بالإضافة لظهور رسالة "تحديث متاح" بلا داعٍ.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `alababak-pwa-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache.startsWith('alababak-pwa-') && cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Notify clients that a new version is available
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATE_AVAILABLE', version: CACHE_VERSION });
        });
      });
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  try {
    const url = new URL(event.request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

    const isHtmlRequest =
      event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html');

    if (isHtmlRequest) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cached) => {
              return cached || caches.match('/index.html');
            });
          })
      );
    } else {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache).catch(() => {});
                });
              }
              return response;
            })
            .catch(() => {
              // لا يوجد رد مخزّن ولا اتصال بالشبكة لهذا المورد — أعِد رفض الطلب بهدوء
              // بدل ترك Promise غير معالج (كان هذا سبب: "Uncaught (in promise) TypeError: Failed to fetch")
              return new Response('', { status: 504, statusText: 'Offline' });
            });
        })
      );
    }
  } catch {
    return;
  }
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ===== إشعارات Web Push الحقيقية =====
// يستقبل الحمولة (payload) اللي بترسلها Edge Function اسمها send-push
// (انظر supabase/functions/send-push و fix_05_push_notifications.sql)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'على بابك', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'على بابك';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/notifications' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
