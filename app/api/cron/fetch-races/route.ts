import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searches = [
    { location: 'Singapore', distances: ['5K', '10K', 'Half Marathon'] },
    { location: 'London', distances: ['5K', '10K', 'Half Marathon', 'Marathon'] },
    { location: 'Sydney', distances: ['5K', '10K', 'Half Marathon'] },
  ]

  const results = []
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 8)

  for (const search of searches) {
    const races = await fetchRacesFromAI(search.location, search.distances)
    const cacheKey = buildCacheKey(search.location, search.distances)

    const { error } = await supabase
      .from('race_cache')
      .upsert({
        cache_key: cacheKey,
        location: search.location,
        distances: search.distances,
        races: races,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, { onConflict: 'cache_key' })

    console.log('Supabase result for', search.location, ':', error ? error.message : 'success')

    if (error) {
      console.error(`Failed to cache ${search.location}:`, error)
    } else {
      results.push({ location: search.location, count: races.length })
    }
  }

  return NextResponse.json({ success: true, cached: results })
}

function buildCacheKey(location: string, distances: string[]) {
  return `${location.toLowerCase()}:${[...distances].sort().join(',').toLowerCase()}`
}

async function fetchRacesFromAI(location: string, distances: string[]) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Find upcoming running races in ${location} for distances: ${distances.join(', ')} in the next 6 months. Return ONLY a JSON array with fields: name, date, location, distance, description, price, early_bird_deadline, registration_url`
      }]
    })
  })

  const data = await response.json()
  const text = data.content
    .filter((b: { type: string; text?: string }) => b.type === 'text')
    .map((b: { type: string; text?: string }) => b.text ?? '')
    .join('')

  const match = text.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}