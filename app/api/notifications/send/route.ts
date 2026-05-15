import { NextRequest, NextResponse } from 'next/server'
import { notifyFollowers } from '@/lib/notifyFollowers'

// POST /api/notifications/send
// Protected by CRON_SECRET — can be called externally to re-trigger notifications
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { actorId, actorEmail, raceName, raceId, raceSlug, raceDate, raceLocation } = body

  if (!actorId || !actorEmail || !raceName || !raceId || !raceSlug || !raceDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await notifyFollowers({ actorId, actorEmail, raceName, raceId, raceSlug, raceDate, raceLocation: raceLocation ?? '' })
  return NextResponse.json({ ok: true })
}
