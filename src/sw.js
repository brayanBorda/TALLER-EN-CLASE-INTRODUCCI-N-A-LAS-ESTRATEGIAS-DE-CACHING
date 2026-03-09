// Nombre del cache
const mi_cache = "cache-1"; 

// Archivos a cachear
const files = [ 
    "/",
    "/index.html",
    "/css/styles.css",
    "/js/app.js"
];

// Evento de instalación del Service Worker
self.addEventListener("install", (event) => { 
    console.log("Service Worker instalado");
    event.waitUntil(
        caches.open(mi_cache)
            .then((cache) => {
                return cache.addAll(files);
            })
    );
});

// Evento de activación del Service Worker
self.addEventListener("activate", () => {
    console.log("Service Worker activado");
});

// Evento de fetch para interceptar las solicitudes y responder con el cache
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});