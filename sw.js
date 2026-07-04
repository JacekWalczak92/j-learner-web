// ============================================================================
//  sw.js — service worker J-Learnera (PWA).
//
//  Strategia:
//   • Shell aplikacji (HTML, JS, CSS, ikony) jest precache'owany przy instalacji
//     — aplikacja otwiera się offline i działa jako zainstalowana PWA.
//   • Nawigacja (wejście na stronę): network-first z fallbackiem do cache —
//     zawsze świeża wersja gdy jest sieć, działający shell gdy jej nie ma.
//   • Zasoby statyczne (?v= w URL): cache-first — wersjonowanie w nazwie pliku
//     gwarantuje świeżość po podbiciu wersji.
//   • Żądania do Supabase (inna domena) NIE są przechwytywane — auth i dane
//     zawsze idą prosto do sieci.
//
//  UWAGA przy wydaniu nowej wersji: podbij VERSION razem z ?v= w index.html.
// ============================================================================

const VERSION = "11";
const CACHE_NAME = "jl-shell-v" + VERSION;

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css?v=" + VERSION,
  "./assets/app.js?v=" + VERSION,
  "./assets/parsers.js?v=" + VERSION,
  "./assets/supabase.js?v=" + VERSION,
  "./assets/config.js?v=" + VERSION,
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase i inne domeny — bez SW

  // Nawigacja: świeży index z sieci, offline'owy fallback z cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Zasoby: cache-first (wersjonowane przez ?v=), z douzupełnianiem cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      });
    })
  );
});
