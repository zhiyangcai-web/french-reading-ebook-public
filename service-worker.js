const CACHE_NAME = "french-reading-ebook-v20260706";

function scopedRequest(path) {
  return new Request(new URL(path, self.registration.scope).toString(), {
    credentials: "same-origin"
  });
}

const ROOT_REQUEST = scopedRequest("./");
const INDEX_REQUEST = scopedRequest("index.html");
const BOOK_REQUEST = scopedRequest("book.json");
const CORE_ASSETS = [ROOT_REQUEST, INDEX_REQUEST, BOOK_REQUEST];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function networkFirstBook(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return fetch(request)
      .then(response => {
        if (response && response.ok) {
          cache.put(BOOK_REQUEST, response.clone());
        }
        return response;
      })
      .catch(() => cache.match(BOOK_REQUEST).then(cached => cached || cache.match(request)));
  });
}

function networkFirstPage(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return fetch(request)
      .then(response => {
        if (response && response.ok) {
          cache.put(INDEX_REQUEST, response.clone());
          cache.put(ROOT_REQUEST, response.clone());
        }
        return response;
      })
      .catch(() => cache.match(INDEX_REQUEST).then(cached => cached || cache.match(ROOT_REQUEST)));
  });
}

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return cache.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      });
    });
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/book.json")) {
    event.respondWith(networkFirstBook(request));
    return;
  }

  if (request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
