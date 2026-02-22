const CACHE_NAME = 'aetheros-v1';
const ASSETS_TO_CACHE = [
    '/models/robotic building.glb',
    '/models/farming lab.glb',
    '/models/polymer.glb',
    '/textures/planet/daymap.jpg',
    '/textures/planet/normal.jpg',
    '/textures/planet/specular.jpg',
    '/textures/planet/clouds.jpg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only cache local assets and Poly Haven textures
    if (ASSETS_TO_CACHE.includes(url.pathname) || url.hostname === 'dl.polyhaven.org') {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
    }
});
