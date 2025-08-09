const CACHE = 'commute-modular-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './core/planner.js',
  './core/calendars.js',
  './core/url-templates.js',
  './data/timetable.json',
  './data/label-maps.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then(cached => cached || fetch(evt.request))
  );
});