/* オフライン対応：本体は先にキャッシュ、フォントは初回に取得して保存 */
var CACHE = 'vital-sim-v20';
var CORE = ['./', './index.html', './remote.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // ページ本体は常に最新を優先（通信できないときだけ保存分を使う）
  if (req.mode === 'navigate' || /\.html?$/.test(new URL(req.url).pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (h) { return h || caches.match('./index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;   // キャッシュがあればすぐ表示し、裏で更新
  }));
});
