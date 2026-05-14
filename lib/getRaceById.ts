import { createClient } from '@supabase/supabase-js'
import type { Race } from '@/types/race'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate a stable URL-safe ID — TextEncoder handles Unicode (Chinese, accents, etc.)
export function raceToId(race: Race): string {
  const str = `${race.name}|||${race.date}|||${race.location}`
  const bytes = new TextEncoder().encode(str)
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeId(id: string): string {
  const base64 = id.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.split('').map(c => c.charCodeAt(0)))
  return new TextDecoder().decode(bytes)
}

// Decode an ID back to key fields and find the race in the cache
export async function getRaceById(id: string): Promise<Race | null> {
  let name: string, date: string, location: string
  try {
    const decoded = decodeId(id)
    ;[name, date, location] = decoded.split('|||')
  } catch {
    return null
  }

  // Search all cached locations for a matching race
  const { data, error } = await supabase
    .from('race_cache')
    .select('races')

  if (error || !data) return null

  for (const row of data) {
    const race = (row.races as Race[]).find(
      r => r.name === name && r.date === date && r.location === location
    )
    if (race) return race
  }

  return null
}
