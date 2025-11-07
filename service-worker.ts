const CACHE_NAME = 'geonotes-ai-cache-v2';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    '/constants.ts',
    '/supabaseClient.ts',
    '/hooks/useGeolocation.ts',
    '/hooks/useDebounce.ts',
    '/hooks/useTheme.ts',
    '/utils/geolocation.ts',
    '/utils/db.ts',
    '/services/geminiService.ts',
    '/components/CategoryFilter.tsx',
    '/components/CategoryPill.tsx',
    '/components/ErrorToast.tsx',
    '/components/Header.tsx',
    '/components/Icons.tsx',
    '/components/MapView.tsx',
    '/components/NoteCard.tsx',
    '/components/NoteForm.tsx',
    '/components/NotificationPermissionBanner.tsx',
    '/components/UndoToast.tsx'
];


self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

self.addEventListener('fetch', (event: any) => {
    if (event.request.url.includes('supabase.co')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});


self.addEventListener('activate', (event: any) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('message', (event: any) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data.payload;
        event.waitUntil(
            (self as any).registration.showNotification(title, {
                body: body,
                icon: '/vite.svg',
                tag: tag
            })
        );
    }
});

self.addEventListener('notificationclick', (event: any) => {
  console.log('On notification click: ', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow('/');
      }
    })
  );
});