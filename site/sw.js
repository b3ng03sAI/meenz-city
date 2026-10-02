// Service Worker für die GitHub-Pages-Version: alles einmal pro Release laden, danach offline spielbar.
// __BUILD__ ändert sich mit jedem Build → neuer Worker, alter Cache wird gelöscht.
const CACHE = 'meenz-__BUILD__';
const FILES = __FILES__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('meenz-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './' : req;
  e.respondWith(caches.open(CACHE).then(c => c.match(key, { ignoreSearch: true })
    .then(hit => hit || fetch(req).then(res => {
      if (res.ok && req.mode !== 'navigate') c.put(req, res.clone());
      return res;
    }))));
});
