/*
 * Offline-Speicher.
 *
 * Alles wird zuerst aus dem Netz geholt und nur bei fehlender Verbindung aus
 * dem Speicher. Früher kamen Grafiken und Klänge zuerst aus dem Speicher -
 * dann blieben ausgetauschte Spielfiguren oder Blöcke in der installierten
 * App einfach alt, bis jemand den Speicher von Hand leerte. Der normale
 * HTTP-Cache des Browsers sorgt trotzdem dafür, dass nichts unnötig doppelt
 * geladen wird.
 *
 * Firebase-Anfragen fasst der Service Worker nicht an - die brauchen Verbindung.
 */

const VERSION = "labyrinth-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase und Co. nie abfangen

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await fetch(request);
        if (res.ok) void cache.put(request, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(request);
        if (hit) return hit;
        const shell = await cache.match("./");
        if (shell) return shell;
        throw err;
      }
    })(),
  );
});
