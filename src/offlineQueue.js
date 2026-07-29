// Offline logging is scoped to watering/pesticide entries WITHOUT photos —
// a photo needs an actual upload, which can't happen with no connection.
// Queued actions live in localStorage as plain JSON, so they survive a
// closed tab/browser restart until they're synced.

const QUEUE_KEY = 'pgt-offline-queue'

export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// Adds an action to the queue and returns the queued item (with a tempId so
// the UI can show it optimistically until it's synced).
export function enqueue(action) {
  const queue = getQueue()
  const item = { ...action, tempId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
  queue.push(item)
  saveQueue(queue)
  return item
}

export function removeFromQueue(tempId) {
  saveQueue(getQueue().filter((item) => item.tempId !== tempId))
}

export function queueLength() {
  return getQueue().length
}

// Tries to send every queued action through the given createEntry function.
// Successfully-sent items are removed from the queue; anything that fails
// (still offline, or a real error) stays queued for the next attempt.
// Returns the list of {tempId, realEntry} pairs that succeeded, so the
// caller can swap optimistic temp entries for the real saved ones.
export async function syncQueue(createEntryFn) {
  const queue = getQueue()
  if (queue.length === 0) return []

  const synced = []
  const stillQueued = []

  for (const item of queue) {
    try {
      const realEntry = await createEntryFn(item)
      synced.push({ tempId: item.tempId, realEntry })
    } catch {
      stillQueued.push(item)
    }
  }

  saveQueue(stillQueued)
  return synced
}
