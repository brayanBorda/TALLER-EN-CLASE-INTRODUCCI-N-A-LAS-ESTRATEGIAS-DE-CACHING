const mi_cache = "gastosmart-v1"; // GastoSmart

const files = [
    "./",
    "./index.html",
    "./css/styles.css",
    "./js/categorias.js",
    "./js/storage.js",
    "./js/gastos.js",
    "./js/graficos.js",
    "./js/app.js",
    "./pages/offline.html",
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
];

// Se encarga de instalar el Service Worker, cachear los archivos y limpiar caches antiguos
self.addEventListener("install", (event) => {
    console.log("Service Worker instalado");
    event.waitUntil(
        caches.open(mi_cache)
            .then((cache) => cache.addAll(files))
    );
    self.skipWaiting();
});

// Se encarga de activar el Service Worker y limpiar caches antiguos
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

// Se encarga de interceptar las solicitudes, responder con cache o hacer fetch y cachear la respuesta
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response;
                return fetch(event.request)
                    .then(fetchResponse => {
                        if (!fetchResponse || fetchResponse.status !== 200) {
                            return fetchResponse;
                        }
                        const responseToCache = fetchResponse.clone();
                        caches.open(mi_cache).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                        return fetchResponse;
                    })
                    .catch(() => caches.match("./pages/offline.html"));
            })
    );
});