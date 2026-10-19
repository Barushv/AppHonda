// =====================================
// SERVICE WORKER - HondaGo
// =====================================

// ¡CAMBIA este nombre cada vez que publiques cambios! (dispara el aviso "Nueva versión")
const CACHE_NAME = "HondaGo-v3-2026-10-19";
const CDN_CACHE = "HondaGo-cdn-v1";
const DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname) || /^192\.168\./.test(self.location.hostname);

const APP_SHELL = [
  "./",
  "index.html",
  "precios.html",
  "gestion-hgo.html",
  "manifest.json",
  "css/styles.css",
  "js/app.js",
  "js/firebase.js",
  "js/ui.js",
  "js/config.js",
  "js/catalogo.js",
  "js/vehiculos.js",
  "js/financiamiento.js",
  "js/financiamiento-data.js",
  "js/leads.js",
  "js/leads-store.js",
  "js/agenda.js",
  "js/pwa.js",
  "js/precios.js",
  "js/gestion.js",
  "js/tarjeta.js",
  "js/vendor/qrcode.min.js",
  "img/asesor.webp",
  "json/precios.json",
  "img/logo-honda.webp",
  "img/icon-192.png",
  "img/icon-512.png",
  "img/city.webp",
  "img/civic.webp",
  "img/accord.webp",
  "img/brv.webp",
  "img/hrv.webp",
  "img/crv.webp",
  "img/pilot.webp",
  "img/odyssey.webp",
  "img/prelude.webp",
];

// Librerías externas que sí se guardan para funcionar sin conexión
const CDN_HOSTS = ["www.gstatic.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  // Queda en espera hasta que el usuario toque "Actualizar"
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== CDN_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.action === "skipWaiting") self.skipWaiting();
});

async function networkFirst(req) {
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res.ok) (await caches.open(CACHE_NAME)).put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req, { ignoreSearch: true });
  return cached || fetch(req);
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CDN_CACHE);
  const cached = await cache.match(req);
  const red = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || red;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // En local (pruebas) y para el catálogo base: red primero, así siempre se ve lo último
    if (DEV || url.pathname.endsWith("/json/precios.json")) return event.respondWith(networkFirst(req));
    return event.respondWith(cacheFirst(req));
  }

  // Firebase (Firestore/Auth) y Drive van directo a la red: no se interceptan
  if (CDN_HOSTS.includes(url.hostname) && !url.pathname.includes("/__/")) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
