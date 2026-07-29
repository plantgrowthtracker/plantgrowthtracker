// App-shell cache for offline PWA support — network-FIRST so a normal
// online visit always gets the latest deployed code; the cache is only
// ever used as a fallback when there's genuinely no connection. (An
// earlier cache-first version of this file caused stale deploys to stick
// around on phones — this fixes that.)
const CACHE_NAME = "pgt-shell-v2"
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
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
