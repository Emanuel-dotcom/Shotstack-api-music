/* Service worker AceVision — app shell cache-first + cache runtime pentru
   modelul AI de pe CDN, ca aplicația să meargă offline după prima folosire. */
const CACHE = 'acevision-v1';
const SHELL = [
  './', './index.html', './manifest.json', './icon.svg',
  './icon-192.png', './icon-512.png',
  './js/app.js', './js/vision.js', './js/stats.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // doar GET; video-urile locale (blob:) nu trec pe aici
  if (e.request.method !== 'GET') return;
  const isModel = url.hostname.includes('jsdelivr.net') || url.hostname.includes('storage.googleapis.com');
  const isShell = url.origin === location.origin;
  if (!isModel && !isShell) return;

  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
