import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/profile?strava=error')
  }

  // Exchange code for tokens
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

  const tokenData = await tokenRes.json()

  // Get current user from Supabase session
  const authHeader = request.headers.get('cookie') || ''
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect('/login?next=/profile')
  }

  // Store tokens in Supabase
  await supabase.from('strava_tokens').upsert({
    user_id: user.id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
    athlete_id: tokenData.athlete.id,
    athlete_name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
    athlete_avatar: tokenData.athlete.profile_medium,
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/profile?strava=connected`
  )
}