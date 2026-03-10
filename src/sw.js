// Nombre del cache
const mi_cache = "gastosmart-v1";

// Archivos a cachear
const files = [
    "./",
    "./index.html",
    "./css/styles.css",
    "./js/app.js",
    "./js/categorias.js",
    "./js/gastos.js",
    "./js/graficos.js",
    "./js/storage.js",
    "./pages/offline.html"
];

// Evento de instalación del Service Worker
self.addEventListener("install", (event) => {
    console.log("Service Worker instalado");
    event.waitUntil(
        caches.open(mi_cache)
            .then((cache) => cache.addAll(files))
    );
    self.skipWaiting();
});

// Evento de activación: limpia caches viejos
self.addEventListener("activate", (event) => {
    console.log("Service Worker activado");
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== mi_cache).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Evento de fetch: cache-first, con fallback a red y luego a offline.html
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response;
                return fetch(event.request).catch(() =>
                    caches.match("./pages/offline.html")
                );
            })
    );
});