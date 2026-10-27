/* Soft-offline SW: network-first for player docs/APIs; cache-first for static. */

const SHELL_CACHE = "cvo-shell-v1";
const API_CACHE = "cvo-api-v1";
const STATIC_CACHE = "cvo-static-v1";
const ALL_CACHES = [SHELL_CACHE, API_CACHE, STATIC_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("cvo-") && !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data !== "CLEAR_OFFLINE_CACHES") return;
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("cvo-")).map((key) => caches.delete(key))
      );
    })()
  );
});

/**
 * Player document paths we may serve offline (last successful HTML/RSC).
 * Excludes admin writes and payments.
 */
function isPlayerDocPath(pathname) {
  if (pathname === "/") return true;
  if (pathname === "/matches" || pathname === "/videos" || pathname === "/jornadas" || pathname === "/stats") {
    return true;
  }
  if (/^\/matches\/[^/]+$/.test(pathname) && !pathname.startsWith("/matches/edit") && pathname !== "/matches/create") {
    return true;
  }
  return false;
}

function isCacheableApiPath(pathname) {
  if (pathname === "/api/matches" || pathname === "/api/videos" || pathname === "/api/seasons") {
    return true;
  }
  if (pathname === "/api/stats" || pathname === "/api/stats/competitive") return true;
  if (/^\/api\/matches\/[^/]+$/.test(pathname)) return true;
  return false;
}

function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (url.pathname.startsWith("/api/payments")) return true;
  if (url.pathname.startsWith("/login")) return true;
  return false;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline-miss");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (shouldBypass(request, url)) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isCacheableApiPath(url.pathname)) {
    event.respondWith(
      networkFirst(request, API_CACHE).catch(
        () => new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Document navigations and App Router RSC/data GETs to player routes.
  const isNavigate = request.mode === "navigate";
  const isSameOriginGet = request.method === "GET";
  if (isSameOriginGet && isPlayerDocPath(url.pathname) && (isNavigate || request.headers.get("RSC") === "1" || request.headers.get("Next-Router-Prefetch") != null || request.headers.get("Next-Router-State-Tree") != null)) {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        if (isNavigate) {
          return new Response("Sin conexión. Vuelve a intentarlo cuando tengas red.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return Response.error();
      })
    );
  }
});
