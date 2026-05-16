import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAthleteActivities, getAthleteStats, parseActivities } from '@/lib/strava'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user } } = await admin.auth.getUser(auth.slice(7))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokenRow } = await admin
    .from('strava_tokens')
    .select('athlete_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Strava not connected' }, { status: 400 })
  }

  const [activities, stravaStats] = await Promise.all([
    getAthleteActivities(user.id, 50),
    getAthleteStats(user.id, tokenRow.athlete_id),
  ])

  const insights = parseActivities(activities)
  const ytdDistanceKm = (stravaStats?.ytd_run_totals?.distance ?? 0) / 1000

  await admin.from('strava_stats').upsert({
    user_id: user.id,
    weekly_km_avg: insights?.weeklyKmAvg ?? 0,
    longest_run_km: insights?.longestRunKm ?? 0,
    total_runs_last_30_days: insights?.totalRunsLast30Days ?? 0,
    preferred_distances: insights?.preferredDistances ?? [],
    estimated_level: insights?.estimatedLevel ?? 'Beginner',
    home_location: insights?.homeLocation ?? null,
    recent_pace: insights?.recentPace ?? null,
    ytd_distance_km: Math.round(ytdDistanceKm * 10) / 10,
    last_synced: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true, insights, ytdDistanceKm })
}
