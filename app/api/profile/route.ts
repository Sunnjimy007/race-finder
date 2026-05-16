import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const { data: { user } } = await admin.auth.getUser(auth.slice(7))
  return user ?? null
}

// GET /api/profile — own profile
export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? { first_name: '', last_name: '' })
}

// PUT /api/profile  { first_name, last_name }
export async function PUT(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { first_name, last_name } = await request.json()
  if (!first_name?.trim()) {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      first_name: first_name.trim(),
      last_name: (last_name ?? '').trim(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
