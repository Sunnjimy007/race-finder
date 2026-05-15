import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// GET /api/follows — current user's following list + follower count
export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: following }, { count: followerCount }] = await Promise.all([
    admin.from('follows').select('following_id, created_at').eq('follower_id', user.id),
    admin.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
  ])

  // Enrich following list with display names (email prefix)
  const enriched = await Promise.all(
    (following ?? []).map(async (f) => {
      const { data } = await admin.auth.admin.getUserById(f.following_id)
      const name = data.user?.email?.split('@')[0] ?? f.following_id.slice(0, 8)
      return { ...f, name }
    })
  )

  return NextResponse.json({ following: enriched, followerCount: followerCount ?? 0 })
}

// POST /api/follows  { followingId }
export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { followingId } = await request.json()
  if (!followingId || followingId === user.id) {
    return NextResponse.json({ error: 'Invalid followingId' }, { status: 400 })
  }

  const { error } = await admin.from('follows').insert({
    follower_id: user.id,
    following_id: followingId,
  })

  // 23505 = unique violation (already following — treat as success)
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/follows  { followingId }
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
