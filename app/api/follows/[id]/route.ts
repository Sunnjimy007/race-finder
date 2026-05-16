import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatDisplayName } from '@/lib/displayName'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/follows/[id]  { action: 'accept' | 'decline' }
// Called by the person being followed (following_id) to accept or decline a request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await admin.auth.getUser(auth.slice(7))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: followId } = await params
  const { action } = await request.json()

  // Fetch the follow row — verify it targets the current user
  const { data: follow } = await admin
    .from('follows')
    .select('id, follower_id, following_id, status')
    .eq('id', followId)
    .eq('following_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!follow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  if (action === 'decline') {
    await admin.from('follows').delete().eq('id', followId)
    return NextResponse.json({ ok: true, action: 'declined' })
  }

  if (action === 'accept') {
    // Accept the original request
    await admin.from('follows').update({ status: 'accepted' }).eq('id', followId)

    // Create the mutual follow (B → A)
    await admin.from('follows').upsert({
      follower_id: user.id,
      following_id: follow.follower_id,
      status: 'accepted',
    }, { onConflict: 'follower_id,following_id' })

    // Notify the requester that their request was accepted
    const { data: acceptorProfile } = await admin
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: acceptorAuth } = await admin.auth.admin.getUserById(user.id)
    const acceptorName = formatDisplayName(acceptorProfile, acceptorAuth.user?.email)

    await admin.from('notifications').insert({
      user_id: follow.follower_id,
      type: 'follow_accepted',
      payload: {
        actor_id: user.id,
        actor_name: acceptorName,
      },
    })

    // Mark the original follow_request notification as read
    await admin.from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('type', 'follow_request')
      .contains('payload', { follow_id: followId })

    return NextResponse.json({ ok: true, action: 'accepted' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
