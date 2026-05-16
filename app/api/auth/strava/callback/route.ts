import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://racefinder.sanjiv-shah.com'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state') // user's Supabase access token passed via state

  if (!code) {
    return NextResponse.redirect(`${BASE}/profile?strava=error`)
  }

  // Identify the user from the state token
  const { data: { user } } = await admin.auth.getUser(state ?? '')
  if (!user) {
    return NextResponse.redirect(`${BASE}/profile?strava=error&reason=auth`)
  }

  // Exchange code for Strava tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${BASE}/profile?strava=error`)
  }

  const tokenData = await tokenRes.json()

  await admin.from('strava_tokens').upsert({
    user_id: user.id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
    athlete_id: tokenData.athlete?.id,
    athlete_name: `${tokenData.athlete?.firstname ?? ''} ${tokenData.athlete?.lastname ?? ''}`.trim(),
    athlete_avatar: tokenData.athlete?.profile_medium ?? null,
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${BASE}/profile?strava=connected`)
}
