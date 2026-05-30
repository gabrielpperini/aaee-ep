// Service worker base — MVP 3 / A1
//
// Estratégias:
// - Static assets (mesmo origin, /_next/static/*, /icon.png, etc.) → cache-first
// - Navegação (HTML) → network-first, fallback pra última página cacheada → fallback /offline
// - Outras requisições (API, server actions, third-party) → não interceptamos, vai direto pra rede
//
// Push e notificationclick: ver fim do arquivo (MVP 3 / B1).

const VERSION = "v5";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Tolerante a falhas individuais — não bloqueia o install se algum 404
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => undefined),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$/.test(
      url.pathname,
    )
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ??
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação de página (HTML)
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API/RSC/server actions → deixa passar
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================
// Background Sync (MVP 3 / C3)
// ============================================================
// O processamento da fila roda no client (precisa chamar server actions), então
// o SW só nudge os clients abertos quando o navegador dispara o sync.

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-queue") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "sync-queue" });
          }
        }),
    );
  }
});

// ============================================================
// Push (MVP 3 / B1)
// ============================================================
// Payload esperado (JSON): { title, body, url?, tag? }

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // payload não-JSON — usa texto cru como body
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "AAEE Engenharia";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    // Com tag, re-alerta a cada push mesmo repetindo a tag (senão o SO
    // substitui a notificação anterior em silêncio — parece que "não veio").
    renotify: Boolean(payload.tag),
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Foca uma aba já aberta na mesma origin; senão abre nova.
        for (const client of clientList) {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
