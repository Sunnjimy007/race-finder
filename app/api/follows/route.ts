import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatDisplayName } from '@/lib/displayName'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthedUser(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const { data: { user } } = await admin.auth.getUser(auth.slice(7))
  return user ?? null
}

// GET /api/follows — current user's following list (with status) + follower count
export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: following }, { count: followerCount }] = await Promise.all([
    admin.from('follows')
      .select('id, following_id, status, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false }),
    admin.from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', user.id)
      .eq('status', 'accepted'),
  ])

  // Enrich with display names
  const enriched = await Promise.all(
    (following ?? []).map(async (f) => {
      const [{ data: profile }, { data: authData }] = await Promise.all([
        admin.from('user_profiles').select('first_name, last_name').eq('user_id', f.following_id).maybeSingle(),
        admin.auth.admin.getUserById(f.following_id),
      ])
      return {
        ...f,
        name: formatDisplayName(profile, authData.user?.email),
      }
    })
  )

  return NextResponse.json({ following: enriched, followerCount: followerCount ?? 0 })
}

// POST /api/follows  { followingId } — sends a follow REQUEST (pending)
export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { followingId } = await request.json()
  if (!followingId || followingId === user.id) {
    return NextResponse.json({ error: 'Invalid followingId' }, { status: 400 })
  }

  // Check if already following / request already sent
  const { data: existing } = await admin
    .from('follows')
    .select('id, status')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, status: existing.status })
  }

  // Get requester's display name
  const [{ data: profile }, { data: authData }] = await Promise.all([
    admin.from('user_profiles').select('first_name, last_name').eq('user_id', user.id).maybeSingle(),
    admin.auth.admin.getUserById(user.id),
  ])
  const actorName = formatDisplayName(profile, authData.user?.email)

  // Create pending follow
  const { data: follow, error } = await admin
    .from('follows')
    .insert({ follower_id: user.id, following_id: followingId, status: 'pending' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the target user
  await admin.from('notifications').insert({
    user_id: followingId,
    type: 'follow_request',
    payload: {
      actor_id: user.id,
      actor_name: actorName,
      follow_id: follow.id,
    },
  })

  return NextResponse.json({ ok: true, status: 'pending' })
}

// DELETE /api/follows  { followingId } — unfollow or cancel request
export async function DELETE(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { followingId } = await request.json()
  if (!followingId) return NextResponse.json({ error: 'followingId required' }, { status: 400 })

  await admin.from('follows').delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId)

  return NextResponse.json({ ok: true })
}
