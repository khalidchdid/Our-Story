importScripts("./version.js");

const CACHE = "toy-story-v" + self.TOY_STORY_VERSION;

const ASSETS = [
  "./",
  "./index.html",
  "./games.html",
  "./games/pong.html",
  "./games/jumper.html",
  "./games/snake.html",
  "./style.css",
  "./games/pong.js",
  "./games/jumper.js",
  "./games/snake.js",
  "./manifest.webmanifest",
  "./service-worker.js",
  "./version.js",
  "./chat.html",
  "./chat.js",
  "./social.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for app shell (prevents iOS stale-cache pain)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isAppShell =
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/version.js") ||
    url.pathname.endsWith("/chat.html") ||
    url.pathname.endsWith("/chat.js");

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

// === PUSH NOTIFICATIONS ===
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.title || "Our Story";
  const body = data.body || "New message";
  const room = data.room || "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: room ? `room:${room}` : "our-story",
      renotify: true,
      data: { room },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const room = event.notification?.data?.room || "";

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of allClients) {
      if ("focus" in c) {
        c.postMessage({ type: "OPEN_ROOM", room });
        return c.focus();
      }
    }
    // Open chat page; room will be in localStorage anyway
    return self.clients.openWindow("./chat.html");
  })());
});
