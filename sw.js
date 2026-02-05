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
  "./sw.js",
  "./models/tiny-model.bin",
];
const NAVIGATION_FALLBACK = "./index.html";

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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(NAVIGATION_FALLBACK))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const url = new URL(event.request.url);
          const isSameOrigin = url.origin === self.location.origin;
          const isStatic = ASSETS.some((asset) => url.pathname.endsWith(asset.replace("./", "")));
          if (isSameOrigin && isStatic) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        });
    })
  );
});
