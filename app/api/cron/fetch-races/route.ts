import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getSourcesForLocation } from '@/data/race-sources'
import type { Race } from '@/types/race'

export const maxDuration = 60

const client = new Anthropic()

// Use a fresh server-side Supabase client (not the browser singleton)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  console.log(`[cron] Starting fetch for: ${location}`)

  try {
    const races = await fetchRacesFromAI(location)
    console.log(`[cron] AI returned ${races.length} races for ${location}`)

    if (races.length === 0) {
      console.warn(`[cron] No races found for ${location} — skipping upsert`)
      return NextResponse.json({ success: false, location, count: 0, reason: 'no races returned' })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 8)

    const { error, data } = await supabase
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
      .select()

    if (error) {
      console.error(`[cron] Supabase error for ${location}:`, JSON.stringify(error))
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    console.log(`[cron] Saved ${races.length} races for ${location}. Row:`, JSON.stringify(data))
    return NextResponse.json({ success: true, location, count: races.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[cron] Exception for ${location}:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchRacesFromAI(location: string): Promise<Race[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const cutoff = new Date(today)
  cutoff.setFullYear(today.getFullYear() + 1)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const trustedSources = getSourcesForLocation(location)
  const sourceHint = trustedSources.length > 0
    ? `\n\nPrioritise these trusted sources first:\n${trustedSources.map(s => `- ${s.name}: ${s.url}`).join('\n')}`
    : ''

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Search for ALL upcoming running races (5K, 10K, Half Marathon, Marathon, Ultra, Fun Run) in ${location}.
Today is ${todayStr}. Only include races between ${todayStr} and ${cutoffStr}.
Every date must be strictly after ${todayStr}.${sourceHint}

Return ONLY a valid JSON array — no markdown, no code fences. Start with [ and end with ].
Each object must have exactly these fields:
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

  const tools = [
    { type: 'web_search_20250305', name: 'web_search' },
  ] as Parameters<typeof client.messages.create>[0]['tools']

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools,
    messages,
  })

  console.log(`[cron] Initial response stop_reason: ${response.stop_reason}`)

  let continuations = 0
  while (response.stop_reason === 'pause_turn' && continuations < 2) {
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools,
      messages,
    })
    continuations++
    console.log(`[cron] Continuation ${continuations} stop_reason: ${response.stop_reason}`)
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )

  if (!textBlock) {
    console.error('[cron] No text block in response. Content types:', response.content.map(b => b.type))
    return []
  }

  console.log(`[cron] Text block preview: ${textBlock.text.slice(0, 200)}`)

  let text = textBlock.text.trim()
  text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (!arrayMatch) {
    console.error('[cron] No JSON array found in response')
    return []
  }

  try {
    const races = JSON.parse(arrayMatch[0])
    if (!Array.isArray(races)) return []
    const todayMidnight = new Date(todayStr + 'T00:00:00')
    return races.filter(
      (r: Race) => r.date && new Date(r.date + 'T00:00:00') >= todayMidnight
    )
  } catch (e) {
    console.error('[cron] JSON parse error:', e)
    return []
  }
}
