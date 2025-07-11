// =====================================
// SERVICE WORKER - CACHE DE PWA
// =====================================

const CACHE_NAME = "honda-app-cache-v1";
const urlsToCache = [
  "index.html",
  "styles.css",
  "app.js",
  "html2pdf.bundle.js",
  "img/logo-honda.png",
  "img/icono-pwa.png",
  // Agrega aquí tus imágenes de autos si lo deseas precargar
];

// =============================
// INSTALACIÓN DEL SW
// =============================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// =============================
// ACTIVACIÓN DEL SW (LIMPIAR CACHES VIEJOS)
// =============================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// =============================
// INTERCEPCIÓN DE FETCH - OFFLINE
// =============================
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
