// sw.js - offline support. Pages, CSS, JS, JSON: network first (always fresh), cache / offline page as fallback.
// Images and fonts: served from cache and refreshed in the background.
// VERSION is bumped by _tools/build.py whenever files change, so every visitor gets them.
var VERSION = 'tr-2026-10-19-1134';

var CORE = [
    '/', '/index.html', '/despre.html', '/noutati.html', '/calendar.html', '/donatii.html', '/contact.html',
    '/inscriere.html', '/confidentialitate.html', '/offline.html', '/style.css', '/site-data.js', '/lang-init.js',
    '/i18n.js', '/shared.js', '/animations.js', '/calendar.js', '/forms.js', '/spark.js', '/search.js', '/blog.js',
    '/search-index.json', '/logo-tineret.webp', '/logo-tineret-sm.webp', '/spark2.webp', '/spark2-sm.webp',
    '/spark.webp', '/favicon.png', '/fonts/bangers-400-latin.woff2', '/fonts/bangers-400-latin-ext.woff2',
    '/fonts/patrick-hand-400-latin.woff2', '/fonts/patrick-hand-400-latin-ext.woff2',
    '/fonts/baloo-2-800-latin.woff2', '/fonts/baloo-2-800-latin-ext.woff2',
    '/noutati/caravana-povestea-ta-vocea-ta.html'
];

self.addEventListener('install', function (event) {
    event.waitUntil(caches.open(VERSION).then(function (cache) { return cache.addAll(CORE); }));
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

function save(req, res) {
    if (res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
    }
    return res;
}

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Pages, styles, scripts and data change with every update: always ask the network first, so a page
    // never mixes new HTML with an old style.css. The cache is only the offline fallback.
    if (req.mode === 'navigate' || /\.(css|js|json|xml|webmanifest)$/.test(url.pathname)) {
        event.respondWith(
            fetch(req).then(function (res) { return save(req, res); }).catch(function () {
                return caches.match(req, { ignoreSearch: true }).then(function (hit) {
                    if (hit) return hit;
                    return req.mode === 'navigate' ? caches.match('/offline.html') : Response.error();
                });
            })
        );
        return;
    }

    // Images and fonts: from the cache (fast), refreshed in the background.
    event.respondWith(
        caches.match(req).then(function (hit) {
            var network = fetch(req).then(function (res) { return save(req, res); }).catch(function () { return hit || Response.error(); });
            return hit || network;
        })
    );
});
