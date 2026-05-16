import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────

// Returns a valid access token for the user, refreshing if expired
export async function getValidStravaToken(userId: string): Promise<string | null> {
  const { data: row } = await admin
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!row) return null

  // Token still valid — return it
  if (new Date(row.expires_at) > new Date()) return row.access_token

  // Refresh expired token
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }),
  })

  if (!res.ok) return null

  const data = await res.json()

  await admin.from('strava_tokens').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(data.expires_at * 1000).toISOString(),
  }).eq('user_id', userId)

  return data.access_token
}

// ── DATA FETCHERS ────────────────────────────────────────────────────────────

// Basic athlete profile (name, avatar, city, country, stats summary)
export async function getAthleteProfile(userId: string) {
  const token = await getValidStravaToken(userId)
  if (!token) return null

  const res = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// Last N runs (default 30)
export async function getAthleteActivities(userId: string, perPage = 30) {
  const token = await getValidStravaToken(userId)
  if (!token) return []

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&sport_type=Run`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  return res.json()
}

// All-time totals and PBs for a specific athlete
export async function getAthleteStats(userId: string, athleteId: number) {
  const token = await getValidStravaToken(userId)
  if (!token) return null

  const res = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId}/stats`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  return res.json()
}

// ── INSIGHTS ─────────────────────────────────────────────────────────────────

export interface StravaInsights {
  weeklyKmAvg: number        // average weekly km over last 4 weeks
  longestRunKm: number       // longest single run ever (in km)
  totalRunsLast30Days: number
  preferredDistances: string[] // e.g. ['10K', 'Half Marathon']
  estimatedLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite'
  homeLocation: string | null
  recentPace: string | null  // min/km of last 5 runs average e.g. "5:30"
}

export function parseActivities(activities: any[]): StravaInsights | null {
  if (!activities?.length) return null

  const now = Date.now()
  const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const recentRuns = activities.filter(
    a => new Date(a.start_date).getTime() > fourWeeksAgo
  )
  const last30 = activities.filter(
    a => new Date(a.start_date).getTime() > thirtyDaysAgo
  )

  // Weekly km average (last 4 weeks)
  const weeklyKmAvg =
    recentRuns.reduce((sum, a) => sum + a.distance, 0) / 1000 / 4

  // Longest run ever
  const longestRunKm =
    Math.max(...activities.map(a => a.distance / 1000))

  // Preferred distances — bucket runs by distance
  const buckets: Record<string, number> = {
    '5K': 0, '10K': 0, 'Half Marathon': 0, 'Marathon': 0,
  }
  activities.forEach(a => {
    const km = a.distance / 1000
    if (km >= 3 && km < 7)   buckets['5K']++
    else if (km >= 7 && km < 15)  buckets['10K']++
    else if (km >= 15 && km < 30) buckets['Half Marathon']++
    else if (km >= 30)            buckets['Marathon']++
  })
  const preferredDistances = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .slice(0, 2)
    .map(([dist]) => dist)

  // Estimated fitness level based on weekly volume + longest run
  let estimatedLevel: StravaInsights['estimatedLevel'] = 'Beginner'
  if (weeklyKmAvg >= 60 || longestRunKm >= 42) estimatedLevel = 'Elite'
  else if (weeklyKmAvg >= 40 || longestRunKm >= 30) estimatedLevel = 'Advanced'
  else if (weeklyKmAvg >= 20 || longestRunKm >= 15) estimatedLevel = 'Intermediate'

  // Most frequent city
  const cities = activities.map(a => a.location_city).filter(Boolean)
  const cityCount: Record<string, number> = {}
  cities.forEach(c => { cityCount[c] = (cityCount[c] || 0) + 1 })
  const homeLocation =
    Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Average pace of last 5 runs (seconds/km → "M:SS /km")
  const last5 = [...activities]
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 5)
    .filter(a => a.moving_time && a.distance > 0)

  let recentPace: string | null = null
  if (last5.length) {
    const avgSecsPerKm =
      last5.reduce((sum, a) => sum + a.moving_time / (a.distance / 1000), 0) /
      last5.length
    const mins = Math.floor(avgSecsPerKm / 60)
    const secs = Math.round(avgSecsPerKm % 60)
    recentPace = `${mins}:${secs.toString().padStart(2, '0')} /km`
  }

  return {
    weeklyKmAvg: Math.round(weeklyKmAvg * 10) / 10,
    longestRunKm: Math.round(longestRunKm * 10) / 10,
    totalRunsLast30Days: last30.length,
    preferredDistances,
    estimatedLevel,
    homeLocation,
    recentPace,
  }
}

// ── COMBINED ─────────────────────────────────────────────────────────────────

// Fetch everything in one call — use this for the profile page
export async function getStravaData(userId: string) {
  const [profile, activities] = await Promise.all([
    getAthleteProfile(userId),
    getAthleteActivities(userId, 50),
  ])

  if (!profile) return null

  const stats = await getAthleteStats(userId, profile.id)
  const insights = parseActivities(activities)

  return { profile, activities, stats, insights }
}
