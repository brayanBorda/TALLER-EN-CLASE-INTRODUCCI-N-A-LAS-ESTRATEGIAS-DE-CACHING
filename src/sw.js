const mi_cache = "gastosmart-v1"; // GastoSmart
// ── CONFIGURACIÓN DE CACHÉS ────────────────────────────────────────
const CACHE_STATIC_NAME   = 'gastosmart-static-v2';   // App Shell (nunca cambia)
const CACHE_DYNAMIC_NAME  = 'gastosmart-dynamic-v2';  // Contenido dinámico
const CACHE_IMMUTABLE_NAME = 'gastosmart-immutable-v2'; // Librerías externas
const MAX_CACHE_ITEMS = 50; // Límite de items en caché dinámico


// ── ARCHIVOS DEL APP SHELL (estrategia CACHE ONLY) 
const STATIC_FILES = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/categorias.js',
    './js/storage.js',
    './js/gastos.js',
    './js/graficos.js',
    './pages/offline.html'
];

const IMMUTABLE_FILES = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];


//EVENTO INSTALL: Precachea App Shell y recursos inmutables
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker - Precacheando App Shell');
    
    event.waitUntil(
        Promise.all([
            // Caché STATIC: archivos críticos del app
            caches.open(CACHE_STATIC_NAME)
                .then(cache => {
                    console.log('[SW] Cacheando archivos estáticos:', STATIC_FILES.length);
                    return cache.addAll(STATIC_FILES);
                }),
            // Caché IMMUTABLE: librerías externas
            caches.open(CACHE_IMMUTABLE_NAME)
                .then(cache => {
                    console.log('[SW] Cacheando recursos inmutables:', IMMUTABLE_FILES.length);
                    return cache.addAll(IMMUTABLE_FILES);
                })
        ])
    );
    
    self.skipWaiting(); // Activa el SW inmediatamente
});

   //EVENTO ACTIVATE: Limpia cachés viejos
   // aaaaaaaaaaaaa

self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker - Limpiando cachés antiguos');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            const cachesValidos = [CACHE_STATIC_NAME, CACHE_DYNAMIC_NAME, CACHE_IMMUTABLE_NAME];
            return Promise.all(
                cacheNames
                    .filter(name => !cachesValidos.includes(name))
                    .map(name => {
                        console.log('[SW] Eliminando caché antigua:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    
    self.clients.claim(); // Toma control de clientes existentes
});

   //FUNCIÓN AUXILIAR: Limpia un caché si excede el límite de items

function limpiarCache(cacheName, maxItems) {
    caches.open(cacheName)
        .then(cache => {
            cache.keys()
                .then(keys => {
                    if (keys.length > maxItems) {
                        console.log(`[SW] Limpiando ${cacheName}: eliminando ${keys[0].url}`);
                        cache.delete(keys[0])
                            .then(() => limpiarCache(cacheName, maxItems));
                    }
                });
        });
}

// 3. EVENTO FETCH: Implementa las 3 estrategias según el tipo de recurso
   
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    /*
    // ── ESTRATEGIA 1: CACHE ONLY
    if (STATIC_FILES.some(f => event.request.url.includes(f.replace('./', '')))) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        console.log('[SW] CACHE ONLY (hit):', event.request.url);
                        return response;
                    }
                    console.warn('[SW] CACHE ONLY (miss):', event.request.url);
                    return new Response('Offline - Recurso no disponible', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
    }
    */
    
    /*
    // ── ESTRATEGIA 2: CACHE WITH NETWORK FALLBACK
    // Para recursos inmutables: busca caché primero, luego red
    else if (event.request.url.includes('cdn.jsdelivr.net')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        console.log('[SW] CACHE WITH NETWORK FALLBACK (cache hit):', event.request.url);
                        return response;
                    }
                    console.log('[SW] CACHE WITH NETWORK FALLBACK (fetching):', event.request.url);
                    
                    return fetch(event.request)
                        .then(newResp => {
                            if (!newResp || newResp.status !== 200) return newResp;
                            
                            caches.open(CACHE_IMMUTABLE_NAME)
                                .then(cache => cache.put(event.request, newResp.clone()));
                            
                            return newResp;
                        })
                        .catch(err => {
                            console.error('[SW] Error en CACHE WITH NETWORK FALLBACK:', err);
                            return caches.match(event.request);
                        });
                })
        );
    }
    
    */
    
    // ── ESTRATEGIA 2: CACHE WITH NETWORK FALLBACK (ACTIVA)
    // Busca en caché primero, si no está → intenta la red
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[SW] CACHE WITH NETWORK FALLBACK (cache hit):', event.request.url);
                    return response;
                }
                console.log('[SW] CACHE WITH NETWORK FALLBACK (fetching from network):', event.request.url);
                
                return fetch(event.request)
                    .then(newResp => {
                        if (!newResp || newResp.status !== 200) return newResp;
                        
                        // Guarda en caché
                        let cacheName = event.request.url.includes('cdn.jsdelivr.net') 
                            ? CACHE_IMMUTABLE_NAME 
                            : CACHE_DYNAMIC_NAME;
                        
                        caches.open(cacheName)
                            .then(cache => {
                                cache.put(event.request, newResp.clone());
                                if (cacheName === CACHE_DYNAMIC_NAME) {
                                    limpiarCache(CACHE_DYNAMIC_NAME, MAX_CACHE_ITEMS);
                                }
                            });
                        
                        return newResp;
                    })
                    .catch(err => {
                        console.log('[SW] CACHE WITH NETWORK FALLBACK (red error, usando caché):', event.request.url);
                        return caches.match(event.request)
                            .then(response => response || new Response('Offline - Recurso no disponible', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            }));
                    });
            })
    );
    
    /*
    // ── ESTRATEGIA 3: NETWORK WITH CACHE FALLBACK
    // Para datos dinámicos: busca red primero, luego caché
    else {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200) {
                        console.log('[SW] NETWORK WITH CACHE FALLBACK (red falló, usando caché):', event.request.url);
                        return caches.match(event.request);
                    }
                    
                    console.log('[SW] NETWORK WITH CACHE FALLBACK (red OK, cacheando):', event.request.url);
                    
                    // Guarda en caché dinámico
                    caches.open(CACHE_DYNAMIC_NAME)
                        .then(cache => {
                            cache.put(event.request, response.clone());
                            limpiarCache(CACHE_DYNAMIC_NAME, MAX_CACHE_ITEMS);
                        });
                    
                    return response;
                })
                .catch(err => {
                    console.log('[SW] NETWORK WITH CACHE FALLBACK (red error, usando caché):', event.request.url, err.message);
                    return caches.match(event.request)
                        .then(response => response || new Response('Offline - No disponible', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        }));
                })
        );
    }
    */
});