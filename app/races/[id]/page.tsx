import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRaceById } from '@/lib/getRaceById'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const race = await getRaceById(id)
  if (!race) return { title: 'Race Not Found' }

  const ogUrl = new URL('/api/og', 'https://racefinder.sanjiv-shah.com')
  ogUrl.searchParams.set('name',     race.name)
  ogUrl.searchParams.set('date',     race.date)
  ogUrl.searchParams.set('distance', race.distance)
  ogUrl.searchParams.set('location', race.location)
  ogUrl.searchParams.set('price',    race.price)

  return {
    title: race.name,
    description: `${race.distance} · ${race.location} · ${race.date} · ${race.price}`,
    openGraph: {
      title: race.name,
      description: `${race.distance} · ${race.location} · ${race.date} · ${race.price}`,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: race.name,
      description: `${race.distance} · ${race.location} · ${race.date} · ${race.price}`,
      images: [ogUrl.toString()],
    },
  }
}

export default async function RacePage({ params }: Props) {
  const { id } = await params
  const race = await getRaceById(id)
  if (!race) notFound()

  const dateFormatted = new Date(race.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: race.name,
    startDate: race.date,
    location: { '@type': 'Place', name: race.location },
    offers: { '@type': 'Offer', price: race.price, url: race.registration_url },
    description: race.description,
  }

  return (
    <div className="px-4 pt-8 max-w-xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-4">
        <span className="bg-[#FF4500] text-white font-condensed font-bold text-sm uppercase tracking-wide px-3 py-1 rounded-full">
          {race.distance}
        </span>
      </div>

      <h1 className="font-condensed text-4xl font-bold text-[#0F172A] dark:text-[#FFFFFC] mb-3 leading-tight">
        {race.name}
      </h1>

      <div className="space-y-2 mb-6 text-[#64748B] dark:text-[#7A8EA6]">
        <p>📅 {dateFormatted}</p>
        <p>📍 {race.location}</p>
        <p>💰 {race.price}</p>
      </div>

      <p className="text-[#0F172A]/70 dark:text-[#FFFFFC]/70 text-base leading-relaxed mb-8">
        {race.description}
      </p>

      <a
        href={race.registration_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-[#FF4500] text-white text-center py-4 rounded-xl font-condensed font-bold text-xl uppercase tracking-wide hover:bg-[#FF7F11] transition-colors"
      >
        Register Now →
      </a>
    </div>
  )
}
