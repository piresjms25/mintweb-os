/* MintWeb OS service worker — offline support (cache-first for app shell, network for everything else) */
const CACHE = 'mintweb-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png',
  'js/icons.js', 'js/util.js', 'js/vfs.js', 'js/ai.js', 'js/wm.js', 'js/os.js', 'js/main.js',
  ...['files', 'terminal', 'editor', 'assistant', 'settings', 'browser', 'software', 'monitor', 'calculator', 'viewer', 'welcome'].map(a => `js/apps/${a}.js`)];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
