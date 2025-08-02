// =====================================
// SERVICE WORKER - CACHE DE PWA
// =====================================

const CACHE_NAME = "honda-app-cache-august-2";
const urlsToCache = [
  "index.html",
  "css/styles.css",
  "js/app.js",
  "js/html2pdf.bundle.js",
  "img/logo-honda.png",
  "img/icono-pwa.png",
  "pdf/oferta.pdf",
  "pdf/descuentos.pdf",
  "img/guardias.png",
  "json/precios.json",

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
  if (event.request.url.endsWith(".pdf")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            // Guarda nueva versión del PDF en caché
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            // Si está offline o falla la red, usa el caché
            return cache.match(event.request);
          });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

// =============================
// ESCUCHA MENSAJES PARA ACTUALIZACIÓN
// =============================
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
