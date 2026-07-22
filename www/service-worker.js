// Service worker mínimo de Zocial — solo lo necesario para que la app sea
// instalable como PWA (Safari/iOS y Chrome/Android lo exigen). No cachea
// agresivamente para no mostrar contenido viejo de la red social por error.
const CACHE_NAME = 'zocial-shell-v1';
const SHELL_FILES = ['./index.html', './manifest.json'];

// caché aparte solo para imágenes (fotos de artista, miniaturas de YouTube,
// fotos subidas a Firebase Storage). Estas casi nunca cambian una vez creadas,
// así que SÍ conviene guardarlas en el celular — es justo la "memoria" que
// hace que la pestaña de música no vuelva a descargar todo cada vez que se abre
const IMAGE_CACHE_NAME = 'zocial-images-v1';
const IMAGE_HOST_PATTERNS = [
  'img.youtube.com',
  'i.ytimg.com',
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  'firebasestorage.googleapis.com',
  'firebasestorage.app',
];

function isImageRequest(request) {
  if (request.destination === 'image') return true;
  try {
    const url = new URL(request.url);
    return IMAGE_HOST_PATTERNS.some((host) => url.hostname.includes(host));
  } catch (e) {
    return false;
  }
}

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
        keys
          .filter((k) => k !== CACHE_NAME && k !== IMAGE_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // ---- imágenes: se muestra al instante lo que ya está guardado en el celular,
  // y de fondo se pide una copia nueva por si acaso cambió. Todo envuelto en
  // try/catch: si la API de caché falla en este WebView (pasa en algunos
  // equipos Android), la imagen igual se pide directo a la red — nunca se
  // rompe por culpa de la caché ----
  if (isImageRequest(event.request)) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(IMAGE_CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) {
            // ya la teníamos guardada: se devuelve al instante y, de fondo,
            // se intenta traer una versión más nueva para la próxima vez
            fetch(event.request)
              .then((resp) => {
                if (resp && resp.ok) cache.put(event.request, resp.clone()).catch(() => {});
              })
              .catch(() => {});
            return cached;
          }
          const response = await fetch(event.request);
          if (response && response.ok) {
            cache.put(event.request, response.clone()).catch(() => {});
          }
          return response;
        } catch (err) {
          // la caché falló por lo que sea — no importa, se pide directo a la red
          return fetch(event.request);
        }
      })()
    );
    return;
  }

  // ---- todo lo demás (HTML, contenido social, etc.): "red primero, respaldo en
  // caché" — así siempre se ve lo más reciente cuando hay internet, y no se
  // rompe del todo si se pierde la señal ----
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
