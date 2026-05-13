export interface Race {
  name: string
  date: string               // YYYY-MM-DD
  location: string
  distance: string           // "5K" | "10K" | "Half Marathon" | "Marathon" | "Ultra" | "Fun Run"
  sub_distances?: string[] | null  // other distances offered at the same event
  description: string        // 2–3 sentences
  price: string              // e.g. "SGD 60" | "Free" | "$45"
  early_bird_deadline: string | null  // YYYY-MM-DD or null
  registration_url: string
}
