const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const MODEL_CACHE = "model-cache";
const ASSETS = [
  "./",
  "./index.html",
  "./src/main.js",
  "./src/styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./models/tiny-model.bin",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, MODEL_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const isStatic = ASSETS.some((asset) => event.request.url.endsWith(asset.replace("./", "")));
          if (isStatic) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
