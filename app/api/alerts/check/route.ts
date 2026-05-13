import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import type { Race } from '@/types/race'

const resend = new Resend(process.env.RESEND_API_KEY)

// Map from the UI toggle label to the race distance string returned by the AI
const DIST_MAP: Record<string, string> = {
  '5K': '5K',
  '10K': '10K',
  'Half': 'Half Marathon',
  'Full': 'Marathon',
  'Ultra': 'Ultra',
  'Fun Run': 'Fun Run',
}

function raceMatchesAlert(race: Race, alertDistances: string[]): boolean {
  return alertDistances.some(d => DIST_MAP[d] === race.distance)
}

function buildEmail(race: Race): string {
  const dateFormatted = new Date(race.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="background:#FF4500;padding:24px 28px;">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Race Alert</p>
      <h1 style="margin:8px 0 0;color:white;font-size:26px;line-height:1.2;">${race.name}</h1>
    </div>
    <div style="padding:28px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#64748B;font-size:13px;width:90px;">📅 Date</td><td style="padding:8px 0;color:#0F172A;font-size:14px;font-weight:600;">${dateFormatted}</td></tr>
        <tr><td style="padding:8px 0;color:#64748B;font-size:13px;">📍 Location</td><td style="padding:8px 0;color:#0F172A;font-size:14px;">${race.location}</td></tr>
        <tr><td style="padding:8px 0;color:#64748B;font-size:13px;">🏃 Distance</td><td style="padding:8px 0;color:#0F172A;font-size:14px;">${race.distance}${race.sub_distances?.length ? ' · ' + race.sub_distances.join(' · ') : ''}</td></tr>
        <tr><td style="padding:8px 0;color:#64748B;font-size:13px;">💰 Price</td><td style="padding:8px 0;color:#0F172A;font-size:14px;">${race.price}</td></tr>
      </table>
      ${race.description ? `<p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px;">${race.description}</p>` : ''}
      <a href="${race.registration_url}" style="display:inline-block;background:#FF4500;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
        Register Now →
      </a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E2E8F0;">
      <p style="margin:0;color:#94A3B8;font-size:12px;">You're receiving this because you set up a race alert on RaceFinder. Race details are AI-sourced — verify on the official website before registering.</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  // Use the user's JWT so RLS applies — we only ever see their own alerts
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { location, races } = await request.json() as { location: string; races: Race[] }

  // Fetch this user's active alerts for the searched location
  const { data: alerts } = await supabase
    .from('race_alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('location', location)
    .eq('is_active', true)

  if (!alerts?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const alert of alerts) {
    const matching = races.filter(r => raceMatchesAlert(r, alert.distances as string[]))

    for (const race of matching) {
      // Skip if this race has already been emailed for this alert (dedup via UNIQUE constraint)
      const { data: existing } = await supabase
        .from('alert_sent_log')
        .select('id')
        .eq('alert_id', alert.id)
        .eq('race_name', race.name)
        .eq('race_date', race.date)
        .maybeSingle()

      if (existing) continue

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: alert.email,
          subject: `🏃 Race alert: ${race.name} — ${race.date}`,
          html: buildEmail(race),
        })

        await supabase.from('alert_sent_log').insert({
          alert_id: alert.id,
          race_name: race.name,
          race_date: race.date,
        })

        sent++
      } catch (e) {
        console.error('Alert email failed:', e)
      }
    }
  }

  return NextResponse.json({ sent })
}
