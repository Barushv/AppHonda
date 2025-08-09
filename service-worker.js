// =====================================
// SERVICE WORKER - CACHE DE PWA
// =====================================

const CACHE_NAME = "honda-app-cache-cliente";
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
    // Para PDFs, intenta primero obtener la versión nueva del servidor
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Actualiza la caché con la nueva versión
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, usa la versión cacheada
          return caches.match(event.request);
        })
    );
  } else {
    // Para todo lo demás, usa caché primero
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// =============================
// ESCUCHA MENSAJES PARA ACTUALIZACIÓN
// =============================
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.action === "skipWaiting") {
    self.skipWaiting();
  }
});

