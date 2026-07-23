// Service worker mínimo de Zocial — solo lo necesario para que la app sea
// instalable como PWA (Safari/iOS y Chrome/Android lo exigen). No cachea
// agresivamente para no mostrar contenido viejo de la red social por error.
//
// NOTA: en algún momento este archivo interceptaba también las imágenes
// externas (YouTube/Firebase Storage) para guardarlas en caché. Se quitó esa
// parte porque, en algunos WebView de Android, volver a pedir esas imágenes
// desde DENTRO del service worker fallaba (mostraba "imagen no disponible"
// aunque la foto sí existiera). Ahora esas imágenes se piden directo al
// navegador sin pasar por acá, y la resistencia a fallos se maneja del lado
// de la app con una cadena de URLs alternativas (ver artistCoverUrl en index.html).
const CACHE_NAME = 'zocial-shell-v1';
const SHELL_FILES = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // solo intervenimos en pedidos de nuestro propio dominio (el HTML/JS de la
  // app). Todo lo externo (imágenes de YouTube, Firebase Storage, etc.) pasa
  // de largo sin tocarlo, tal cual lo maneja el navegador por su cuenta.
  let sameOrigin = false;
  try { sameOrigin = new URL(event.request.url).origin === self.location.origin; } catch (err) {}
  if (!sameOrigin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
