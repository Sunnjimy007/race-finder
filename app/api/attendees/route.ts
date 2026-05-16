import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyFollowers } from '@/lib/notifyFollowers'
import { toSlug } from '@/lib/raceSlug'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function avatarFromUserId(userId: string) {
  const clean = userId.replace(/-/g, '')
  const letter = clean[0]?.toUpperCase() ?? '?'
  const COLOURS = ['#FF4500', '#3B82F6', '#00C96B', '#8B5CF6', '#F59E0B', '#EC4899']
  const colour = COLOURS[clean.charCodeAt(0) % COLOURS.length]
  return { letter, colour }
}

// GET /api/attendees?raceId=X
export async function GET(request: NextRequest) {
  const raceId = request.nextUrl.searchParams.get('raceId')
  if (!raceId) return NextResponse.json({ error: 'raceId required' }, { status: 400 })

  let currentUserId: string | null = null
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const { data } = await admin.auth.getUser(auth.slice(7))
    currentUserId = data.user?.id ?? null
  }

  const { data, error } = await admin
    .from('race_attendees')
    .select('user_id')
    .eq('race_id', raceId)
    .eq('status', 'going')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const count = data.length
  const isGoing = currentUserId ? data.some(r => r.user_id === currentUserId) : false
  const avatars = data.slice(0, 3).map(r => avatarFromUserId(r.user_id))

  // When authenticated, return per-attendee data with follow status and display name
  let attendees: { userId: string; letter: string; colour: string; isFollowing: boolean; isPending: boolean; displayName: string }[] | undefined
  if (currentUserId) {
    const attendeeIds = data.map(r => r.user_id).filter(id => id !== currentUserId)
    const [{ data: myFollows }, { data: profiles }] = await Promise.all([
      admin.from('follows')
        .select('following_id, status')
        .eq('follower_id', currentUserId)
        .in('following_id', attendeeIds.length ? attendeeIds : ['none']),
      admin.from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', attendeeIds.length ? attendeeIds : ['none']),
    ])

    const followMap = new Map((myFollows ?? []).map(f => [f.following_id, f.status]))
    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]))

    attendees = data
      .filter(r => r.user_id !== currentUserId)
      .map(r => {
        const profile = profileMap.get(r.user_id)
        const { letter, colour } = avatarFromUserId(r.user_id)
        const avatarLetter = profile?.first_name?.[0]?.toUpperCase() ?? letter
        const displayName = profile?.first_name
          ? (profile.last_name?.[0] ? `${profile.first_name} ${profile.last_name[0]}.` : profile.first_name)
          : null
        return {
          userId: r.user_id,
          letter: avatarLetter,
          colour,
          isFollowing: followMap.get(r.user_id) === 'accepted',
          isPending: followMap.get(r.user_id) === 'pending',
          displayName: displayName ?? `Runner ${r.user_id.slice(0, 4)}`,
        }
      })
  }

  return NextResponse.json({ count, isGoing, avatars, attendees })
}

// POST /api/attendees  { raceId, raceName, raceDate, raceLocation? }  — toggles going status
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authErr } = await admin.auth.getUser(auth.slice(7))
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { raceId, raceName, raceDate, raceLocation } = await request.json()

  const { data: existing } = await admin
    .from('race_attendees')
    .select('id')
    .eq('user_id', user.id)
    .eq('race_id', raceId)
    .eq('status', 'going')
    .maybeSingle()

  if (existing) {
    await admin.from('race_attendees').delete().eq('id', existing.id)
  } else {
    await admin.from('race_attendees').insert({
      user_id: user.id,
      race_id: raceId,
      race_name: raceName,
      race_date: raceDate,
      status: 'going',
    })

    // Fire-and-forget: notify followers when newly going
    if (user.email) {
      notifyFollowers({
        actorId: user.id,
        actorEmail: user.email,
        raceName,
        raceId,
        raceSlug: toSlug(raceName, raceDate),
        raceDate,
        raceLocation: raceLocation ?? '',
      }).catch(console.error)
    }
  }

  const { data: all } = await admin
    .from('race_attendees')
    .select('user_id')
    .eq('race_id', raceId)
    .eq('status', 'going')

  const count = all?.length ?? 0
  const isGoing = !existing
  const avatars = (all ?? []).slice(0, 3).map(r => avatarFromUserId(r.user_id))

  return NextResponse.json({ isGoing, count, avatars })
}
