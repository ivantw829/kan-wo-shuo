// 讓「看我說」離線也能開。策略：先給快取、同時背景更新（stale-while-revalidate）。
// 使用情境常在訊號差的地方，所以寧可先秀舊版也不要等網路；改了 index.html 後，使用者會在「下一次」開啟時看到新版。
// 只有在預載清單（PRECACHE）改變時才需要調高 CACHE 版本號。
const CACHE = 'kan-wo-shuo-v2';
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const ok = url.origin === self.location.origin
    || url.hostname === 'fonts.googleapis.com'
    || url.hostname === 'fonts.gstatic.com';
  if (!ok) return;

  const cacheP = caches.open(CACHE);
  const network = cacheP.then((cache) => fetch(req).then((res) => {
    // 字型 CSS 已經加 crossorigin；舊版留下的 opaque（status 0）回應一樣收進快取
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }));
  // 背景更新要等它寫完快取，否則瀏覽器可能提早結束 service worker
  e.waitUntil(network.catch(() => {}));

  e.respondWith(cacheP.then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await network;
    } catch (err) {
      // 離線又沒快取到這個網址（例如帶了不同路徑）：導覽時退回首頁
      if (req.mode === 'navigate') {
        const home = await cache.match('./');
        if (home) return home;
      }
      throw err;
    }
  }));
});
