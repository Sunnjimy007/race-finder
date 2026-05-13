import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic()

// Static system prompt — kept separate so cache_control can mark it cacheable.
// Sonnet 4.6 requires ≥2048 tokens to activate caching; this block + tools may
// not hit that threshold today, but the marker costs nothing and kicks in
// automatically if the prompt grows or a larger model is used.
const SYSTEM_PROMPT = `You are a race-finding assistant. Search the web for real, upcoming running races.

Return ONLY a valid JSON array — no markdown, no code fences, no explanation. Start with [ and end with ].

Each object must have exactly these fields:
{
  "name": "Full race name",
  "date": "YYYY-MM-DD",
  "location": "City, Country",
  "distance": "5K" or "10K" or "Half Marathon" or "Marathon" or "Ultra" or "Fun Run" (primary/longest distance),
  "sub_distances": ["10K", "5K"] or null (other distances at the same event, excluding the primary),
  "description": "2-3 sentences about the race, course highlights, and what makes it special.",
  "price": "e.g. SGD 60, Free, $45 USD, or Unknown",
  "early_bird_deadline": "YYYY-MM-DD or null",
  "registration_url": "https://..."
}

Rules:
- Return 5-12 races sorted by date ascending.
- Only include races with future dates.
- Only real races with real registration links — include major city marathons, branded races (Garmin, Salomon, airline-sponsored), and popular local races.
- Never fabricate races or URLs.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { location, distances, timeframe } = body as {
      location: string
      distances: string[]
      timeframe: string
    }

    if (!location?.trim()) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }

    const distanceStr =
      Array.isArray(distances) && distances.length > 0
        ? distances.join(', ')
        : 'any distance'

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const cutoff = new Date(today)
    if (timeframe === 'next 3 months') cutoff.setMonth(today.getMonth() + 3)
    else if (timeframe === 'next 6 months') cutoff.setMonth(today.getMonth() + 6)
    else cutoff.setFullYear(today.getFullYear() + 1)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    // Only dynamic content in the user message — keeps the cacheable prefix stable
    const userPrompt = `Search for ${distanceStr} races in ${location}.
Today is ${todayStr}. Only include races between ${todayStr} and ${cutoffStr}.
Every date must be strictly after ${todayStr}.`

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ]

    const tools = [
      { type: 'web_search_20250305', name: 'web_search' },
    ] as Parameters<typeof client.messages.create>[0]['tools']

    const createParams = {
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: [
        {
          type: 'text' as const,
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      tools,
      messages,
    }

    let response = await client.messages.create(createParams)

    if (process.env.NODE_ENV === 'development') {
      const u = response.usage as Anthropic.Usage & {
        cache_creation_input_tokens?: number
        cache_read_input_tokens?: number
      }
      console.log('[search] tokens:', {
        input: u.input_tokens,
        output: u.output_tokens,
        cache_write: u.cache_creation_input_tokens ?? 0,
        cache_read: u.cache_read_input_tokens ?? 0,
      })
    }

    // Re-send if the server-side search loop hit its iteration limit.
    // Cap at 2 continuations (3 total API calls max) to bound cost.
    let continuations = 0
    while (response.stop_reason === 'pause_turn' && continuations < 2) {
      messages.push({ role: 'assistant', content: response.content })
      response = await client.messages.create({ ...createParams, messages })
      continuations++

      if (process.env.NODE_ENV === 'development') {
        const u = response.usage as Anthropic.Usage & {
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
        }
        console.log(`[search] continuation ${continuations} tokens:`, {
          input: u.input_tokens,
          output: u.output_tokens,
          cache_read: u.cache_read_input_tokens ?? 0,
        })
      }
    }

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
    if (!textBlock) {
      return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
    }

    let races
    try {
      let text = textBlock.text.trim()
      // Strip markdown code fences if present
      text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      // If there's still surrounding prose, extract the first [...] array
      const arrayMatch = text.match(/\[[\s\S]*\]/)
      if (arrayMatch) text = arrayMatch[0]
      races = JSON.parse(text)
      if (!Array.isArray(races)) throw new Error('Response is not an array')
    } catch {
      console.error('JSON parse error. Raw:', textBlock.text.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to parse race data from AI response' },
        { status: 500 }
      )
    }

    // Hard filter: strip any races with past dates
    const todayMidnight = new Date(todayStr + 'T00:00:00')
    races = races.filter((race: { date?: string }) => {
      if (!race.date) return false
      return new Date(race.date + 'T00:00:00') >= todayMidnight
    })

    return NextResponse.json({ races })
  } catch (err) {
    console.error('Search route error:', err)
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
