// Minimal app-shell cache so the app can be installed as a PWA and reopen
// even with a flaky connection. Data itself (Supabase calls) always goes to
// the network — this only caches the static shell (HTML/JS/CSS/logo).
const CACHE_NAME = "pgt-shell-v1"
const SHELL_URLS = ["/", "/manifest.json", "/logo.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  // Never cache API/data calls — only same-origin static assets.
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
