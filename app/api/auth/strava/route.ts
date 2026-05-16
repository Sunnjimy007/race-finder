import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/strava?state=<supabase_access_token>
// Redirects to Strava OAuth — state carries the user's token so the callback can identify them
export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state') ?? ''

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'activity:read_all,profile:read_all',
    state,
  })

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`
  )
}
