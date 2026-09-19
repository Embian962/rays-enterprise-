const ADMIN_CACHE = "rays-admin-shell-v4";
const ADMIN_SHELL = ["/admin", "/admin.html", "/admin.css", "/admin.js", "/admin-access.js", "/api-config.js", "/rays-enterprise-logo-new.jpg", "/admin-manifest.json", "/admin-pwa.js"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(ADMIN_CACHE).then(cache => cache.addAll(ADMIN_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== ADMIN_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(ADMIN_CACHE).then(cache => cache.put("/admin.html", copy)); return response; }).catch(() => caches.match("/admin.html")));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request).then(response => { const copy = response.clone(); caches.open(ADMIN_CACHE).then(cache => cache.put(request, copy)); return response; })));
});