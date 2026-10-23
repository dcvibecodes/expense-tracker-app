const CACHE_NAME = "spend-less-v5";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/fonts/fraunces-latin-var.woff2",
  "/fonts/outfit-latin-var.woff2"
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Don't skipWaiting automatically — wait for user to approve update
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Listen for SKIP_WAITING message from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache token-authenticated requests or token management responses
  const hasAuth = (() => {
    try {
      return !!event.request.headers.get("Authorization");
    } catch {
      return false;
    }
  })();
  const isTokenRoute = url.pathname.startsWith("/api/tokens");

  // API requests: network-first
  if (url.pathname.startsWith("/api/")) {
    // Token traffic is network-only: never serve from cache, never store.
    if (hasAuth || isTokenRoute) {
      event.respondWith(
        fetch(event.request).catch(() => {
          return new Response(JSON.stringify({ error: "You're offline. Connect to the internet to make changes." }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        })
      );
      return;
    }
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: "You're offline. Connect to the internet to make changes." }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        })
    );
    return;
  }

  // Static assets: network-first
event.respondWith(
  fetch(event.request)
    .then((response) => {
      if (response.ok && event.request.method === "GET" && !hasAuth) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    })
    .catch(() => caches.match(event.request))
);
});
