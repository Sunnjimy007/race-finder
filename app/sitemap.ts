import { createClient } from '@supabase/supabase-js'
import { raceToId } from '@/lib/getRaceById'
import type { Race } from '@/types/race'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE = 'https://racefinder.sanjiv-shah.com'

export default async function sitemap() {
  const { data } = await supabase
    .from('race_cache')
    .select('races, fetched_at')

  const raceUrls = (data ?? []).flatMap(row =>
    (row.races as Race[]).map(race => ({
      url: `${BASE}/races/${raceToId(race)}`,
      lastModified: new Date(row.fetched_at),
    }))
  )

  return [
    { url: BASE, lastModified: new Date() },
    { url: `${BASE}/saved`, lastModified: new Date() },
    { url: `${BASE}/alerts`, lastModified: new Date() },
    ...raceUrls,
  ]
}
