import { createClient } from '@supabase/supabase-js'
import type { Race } from '@/types/race'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate a stable URL-safe ID for a race
export function raceToId(race: Race): string {
  return Buffer.from(`${race.name}|||${race.date}|||${race.location}`).toString('base64url')
}

// Decode an ID back to key fields and find the race in the cache
export async function getRaceById(id: string): Promise<Race | null> {
  let name: string, date: string, location: string
  try {
    const decoded = Buffer.from(id, 'base64url').toString('utf-8')
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
