import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatDisplayName } from '@/lib/displayName'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/people — all users with profiles, enriched with follow status
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(auth.slice(7))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all profiles except own
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .neq('user_id', user.id)
    .not('first_name', 'eq', '')
    .order('first_name')

  if (!profiles?.length) return NextResponse.json({ people: [] })

  // Fetch all follow relationships involving current user
  const { data: myFollows } = await admin
    .from('follows')
    .select('id, follower_id, following_id, status')
    .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)

  // Build lookup maps
  const outgoing = new Map<string, { status: string; id: string }>()
  const incoming = new Map<string, { status: string; id: string }>()
  for (const f of myFollows ?? []) {
    if (f.follower_id === user.id) {
      outgoing.set(f.following_id, { status: f.status, id: f.id })
    } else {
      incoming.set(f.follower_id, { status: f.status, id: f.id })
    }
  }

  const people = profiles.map(p => {
    const out = outgoing.get(p.user_id)
    const inc = incoming.get(p.user_id)

    let followStatus: 'none' | 'following' | 'pending_outgoing' | 'pending_incoming' = 'none'
    let followId: string | undefined

    if (out?.status === 'accepted') {
      followStatus = 'following'
    } else if (out?.status === 'pending') {
      followStatus = 'pending_outgoing'
    } else if (inc?.status === 'pending') {
      followStatus = 'pending_incoming'
      followId = inc.id
    }

    return {
      userId: p.user_id,
      displayName: formatDisplayName(p),
      followStatus,
      followId,
    }
  })

  return NextResponse.json({ people })
}
