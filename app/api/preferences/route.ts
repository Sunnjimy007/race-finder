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

// GET /api/preferences
export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? { email_friend_going: true, in_app_notifications: true })
}

// PUT /api/preferences  { email_friend_going?, in_app_notifications? }
export async function PUT(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await admin
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      email_friend_going: body.email_friend_going ?? true,
      in_app_notifications: body.in_app_notifications ?? true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
