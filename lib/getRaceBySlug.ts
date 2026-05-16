import { createClient } from '@supabase/supabase-js'
import { toSlug } from '@/lib/raceSlug'
import type { Race } from '@/types/race'

// Service role bypasses RLS — this only runs server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getRaceBySlug(slug: string): Promise<Race | null> {
  const { data } = await supabase.from('race_cache').select('races')
  if (!data) return null
  for (const row of data) {
    const races = row.races
    if (!Array.isArray(races)) continue
    const match = (races as Race[]).find(r => toSlug(r.name, r.date) === slug)
    if (match) return match
  }
  return null
}
