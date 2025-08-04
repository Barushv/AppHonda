const CACHE_NAME = "honda-app-cache-v5"; // ⚠️ Incrementar en cada deploy

const urlsToCache = [
  "index.html",
  "css/styles.css",
  "js/app.js",
  "js/html2pdf.bundle.js",
  "img/logo-honda.png",
  "img/icono-pwa.png",
  "img/guardias.png",
  "json/precios.json",
];

// Precaching
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

// Limpiar caché vieja
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
});

// Manejo de fetch
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.endsWith(".pdf")) {
    // Siempre intenta desde red primero
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request));
      })
    );
  } else {
    // Para todo lo demás: cache primero
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
});

// Forzar activación del nuevo SW
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

