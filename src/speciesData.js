// Small built-in lookup so picking a species can suggest a sensible default
// watering interval instead of the person having to guess. Matching is a
// simple case-insensitive substring check against common English and Hindi
// names, so "money plant" or "मनी प्लांट" both match the same entry.
export const SPECIES_SUGGESTIONS = [
  { keys: ["money plant", "pothos", "मनी प्लांट", "epipremnum"], intervalDays: 6 },
  { keys: ["tulsi", "holy basil", "तुलसी"], intervalDays: 2 },
  { keys: ["snake plant", "sansevieria", "स्नेक प्लांट"], intervalDays: 14 },
  { keys: ["cactus", "कैक्टस"], intervalDays: 18 },
  { keys: ["succulent", "सक्युलेंट"], intervalDays: 12 },
  { keys: ["aloe vera", "एलोवेरा", "aloe"], intervalDays: 14 },
  { keys: ["areca palm", "एरेका पाम"], intervalDays: 5 },
  { keys: ["peace lily", "पीस लिली"], intervalDays: 5 },
  { keys: ["spider plant", "स्पाइडर प्लांट"], intervalDays: 6 },
  { keys: ["jade plant", "जेड प्लांट"], intervalDays: 10 },
  { keys: ["rose", "गुलाब"], intervalDays: 3 },
  { keys: ["marigold", "गेंदा"], intervalDays: 2 },
  { keys: ["hibiscus", "गुड़हल"], intervalDays: 2 },
  { keys: ["mint", "पुदीना"], intervalDays: 2 },
  { keys: ["fiddle leaf fig", "फिडल लीफ"], intervalDays: 7 },
  { keys: ["bamboo", "बांस"], intervalDays: 5 },
  { keys: ["ferns", "fern", "फर्न"], intervalDays: 3 },
  { keys: ["orchid", "ऑर्किड"], intervalDays: 7 },
]

// Returns a suggested interval in days for a free-typed species string, or
// null if nothing matches — callers should leave the existing value alone
// in that case rather than overwriting it with a guess.
export function suggestWateringInterval(speciesText) {
  if (!speciesText) return null
  const normalized = speciesText.trim().toLowerCase()
  if (!normalized) return null
  for (const entry of SPECIES_SUGGESTIONS) {
    if (entry.keys.some((k) => normalized.includes(k.toLowerCase()))) {
      return entry.intervalDays
    }
  }
  return null
}
