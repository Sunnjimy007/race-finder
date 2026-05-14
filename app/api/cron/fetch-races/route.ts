import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSourcesForLocation } from '@/data/race-sources'
import type { Race } from '@/types/race'

// One location per invocation to stay within Vercel's 60s timeout.
// The GitHub Action calls this endpoint separately for each location.
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location')
  if (!location) {
    return NextResponse.json({ error: 'location query param required' }, { status: 400 })
  }

  console.log(`[cron] Fetching races for ${location}`)

  try {
    const races = await fetchRacesFromAI(location)
    console.log(`[cron] Got ${races.length} races for ${location}`)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 8) // refresh weekly, expire in 8 days

    const { error } = await supabase
      .from('race_cache')
      .upsert(
        {
          cache_key: location.toLowerCase(),
          location,
          races,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'cache_key' }
      )

    if (error) {
      console.error(`[cron] Supabase upsert error for ${location}:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, location, count: races.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[cron] Error for ${location}:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchRacesFromAI(location: string): Promise<Race[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const cutoff = new Date(today)
  cutoff.setMonth(today.getMonth() + 12) // cache covers next 12 months
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const trustedSources = getSourcesForLocation(location)
  const sourceHint = trustedSources.length > 0
    ? `\n\nPrioritise these trusted sources first:\n${trustedSources.map(s => `- ${s.name}: ${s.url}`).join('\n')}`
    : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: 'user',
      content: `Search for ALL upcoming running races in ${location} — all distances (5K, 10K, Half Marathon, Marathon, Ultra, Fun Run).
Today is ${todayStr}. Only include races between ${todayStr} and ${cutoffStr}.
Every date must be strictly after ${todayStr}.${sourceHint}

Return ONLY a valid JSON array. Start with [ and end with ]. Each object must have exactly these fields:
{
  "name": "Full race name",
  "date": "YYYY-MM-DD",
  "location": "City, Country",
  "distance": "5K" or "10K" or "Half Marathon" or "Marathon" or "Ultra" or "Fun Run",
  "sub_distances": ["10K", "5K"] or null,
  "description": "2-3 sentences about the race.",
  "price": "e.g. SGD 60, Free, or Unknown",
  "early_bird_deadline": "YYYY-MM-DD or null",
  "registration_url": "https://..."
}

Return 10-20 real races with real registration links, sorted by date ascending.`,
    },
  ]

  const tools = [{ type: 'web_search_20250305', name: 'web_search' }]

  // Raw fetch so we can loop on pause_turn without pulling in the full SDK
  let response = await callAnthropic(messages, tools)

  // Handle pause_turn — server-side search loop hit its iteration limit
  let continuations = 0
  while (response.stop_reason === 'pause_turn' && continuations < 2) {
    messages.push({ role: 'assistant', content: response.content })
    response = await callAnthropic(messages, tools)
    continuations++
  }

  const text: string = (response.content ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((b: any) => b.type === 'text')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => b.text ?? '')
    .join('')

  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (!arrayMatch) return []

  try {
    const races = JSON.parse(arrayMatch[0])
    if (!Array.isArray(races)) return []
    // Strip past dates
    const todayMidnight = new Date(todayStr + 'T00:00:00')
    return races.filter(
      (r: Race) => r.date && new Date(r.date + 'T00:00:00') >= todayMidnight
    )
  } catch {
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callAnthropic(messages: any[], tools: any[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools,
      messages,
    }),
  })
  return res.json()
}
