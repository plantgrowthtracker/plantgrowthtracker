// Uses Open-Meteo (open-meteo.com) — free, no API key required — to check
// recent rainfall for the person's saved location, so the dashboard can
// hint "it rained recently, this plant may not need water yet" instead of
// blindly following the watering interval.

const LOCATION_KEY = "pgt-location" // { lat, lon, label }

export function getSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLocation(location) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
}

export function clearLocation() {
  localStorage.removeItem(LOCATION_KEY)
}

// Returns total millimetres of rain over the last 3 days (today + previous 2),
// or null if the lookup failed or no location is saved.
export async function getRecentRainfallMm(location) {
  if (!location) return null
  try {
    const { lat, lon } = location
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&past_days=3&forecast_days=1&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const sums = data?.daily?.precipitation_sum
    if (!Array.isArray(sums)) return null
    return sums.reduce((total, mm) => total + (mm || 0), 0)
  } catch {
    return null
  }
}

// A simple threshold — more than 5mm of rain in the last 3 days is treated
// as "probably enough natural water for now" for typical potted plants.
export const RAIN_SKIP_THRESHOLD_MM = 5
