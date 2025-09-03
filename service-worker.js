// =====================================
// SERVICE WORKER - HondaGo
// =====================================

// ¡CAMBIA este nombre cada vez que publiques cambios importantes!
const CACHE_NAME = "hondago-cache-v7.1";

// Archivos base a precachear
const urlsToCache = [
  "index.html",
  "css/styles.css",
  "js/app.js",
  "js/html2pdf.bundle.js",
  "img/logo-honda.png",
  "img/icono-pwa.png",
  "img/guardias.png",
  "pdf/oferta.pdf",
  "pdf/descuentos.pdf",
  "json/precios.json",
];

// ---------- Helpers ----------
async function networkFirst(req) {
  try {
    const res = await fetch(req, { cache: "no-store" });
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  return cached || fetch(req);
}

// ---------- Instalación ----------
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(urlsToCache)));
  // Opcional: instala y queda en 'waiting' hasta que la página pida skipWaiting
  //self.skipWaiting(); // si quieres activar siempre de inmediato, descomenta
});

// ---------- Activación ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
      );
      await self.clients.claim(); // <-- toma control inmediato
    })()
  );
});

// ---------- Mensajes desde la página ----------
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// ---------- Fetch ----------
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  // PDFs: RED PRIMERO -> si hay internet, baja el nuevo y lo guarda
  if (/\/pdf\/[^\/]+\.pdf(\?.*)?$/.test(path)) {
    event.respondWith(
      (async () => {
        try {
          // cache-bypass a nivel HTTP cache del navegador
          const req = new Request(event.request.url, { cache: "reload" });
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          // guardamos bajo la request original (con/ sin query)
          cache.put(event.request, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // precios.json: red primero
  if (path.endsWith("/json/precios.json")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Resto: caché primero
  event.respondWith(cacheFirst(event.request));
});
