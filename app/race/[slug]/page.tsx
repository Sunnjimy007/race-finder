import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRaceBySlug } from '@/lib/getRaceBySlug'
import { toSlug } from '@/lib/raceSlug'
import { raceToId } from '@/lib/getRaceById'
import GoingButton from '@/components/GoingButton'
import AttendeesList from '@/components/AttendeesList'
import CopyBtn from './CopyBtn'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const race = await getRaceBySlug(slug)
  if (!race) return { title: 'Race Not Found' }

  const ogUrl = new URL('/api/og', 'https://racefinder.sanjiv-shah.com')
  ogUrl.searchParams.set('name',     race.name)
  ogUrl.searchParams.set('date',     race.date)
  ogUrl.searchParams.set('distance', race.distance)
  ogUrl.searchParams.set('location', race.location)
  ogUrl.searchParams.set('price',    race.price)

  const canonical = `https://racefinder.sanjiv-shah.com/race/${toSlug(race.name, race.date)}`

  return {
    title: race.name,
    description: `${race.distance} · ${race.location} · ${race.date} · ${race.price}`,
    alternates: { canonical },
    openGraph: {
      title: race.name,
      description: `${race.distance} · ${race.location} · ${race.date} · ${race.price}`,
      url: canonical,
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

export default async function RaceSlugPage({ params }: Props) {
  const { slug } = await params
  const race = await getRaceBySlug(slug)
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

  const shareUrl = `https://racefinder.sanjiv-shah.com/race/${toSlug(race.name, race.date)}`

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060F1A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back link */}
      <div className="max-w-xl mx-auto px-4 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#64748B] dark:text-[#7A8EA6] hover:text-[#FF4500] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Races
        </Link>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4 pb-16">
        <article className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-2xl overflow-hidden shadow-sm">

          {/* Orange accent bar */}
          <div className="h-1.5 bg-[#FF4500]" />

          <div className="p-6">
            {/* Distance pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-[#FF4500] text-white font-condensed font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full shadow-sm shadow-[#FF4500]/30">
                {race.distance}
              </span>
              {race.sub_distances?.map(d => (
                <span key={d} className="bg-[#FF4500]/10 dark:bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30 font-condensed font-semibold text-xs uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                  {d}
                </span>
              ))}
            </div>

            {/* Race name */}
            <h1 className="font-condensed text-3xl font-bold text-[#0F172A] dark:text-[#FFFFFC] leading-tight mb-5">
              {race.name}
            </h1>

            {/* Details */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-[#64748B] dark:text-[#7A8EA6]">
                <svg className="w-4 h-4 flex-shrink-0 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">{dateFormatted}</span>
              </div>
              <div className="flex items-center gap-3 text-[#64748B] dark:text-[#7A8EA6]">
                <svg className="w-4 h-4 flex-shrink-0 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{race.location}</span>
              </div>
              <div className="flex items-center gap-3 text-[#64748B] dark:text-[#7A8EA6]">
                <svg className="w-4 h-4 flex-shrink-0 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-condensed font-bold text-lg text-[#0F172A] dark:text-[#FFFFFC]">{race.price}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-[#0F172A]/70 dark:text-[#FFFFFC]/70 text-sm leading-relaxed mb-6">
              {race.description}
            </p>

            {/* Going / attendees */}
            <div className="mb-5 border border-[#E2E8F0] dark:border-[#1D3A58] rounded-xl p-4">
              <GoingButton
                raceId={raceToId(race)}
                raceName={race.name}
                raceDate={race.date}
                raceLocation={race.location}
              />
              <AttendeesList raceId={raceToId(race)} />
            </div>

            {/* Share link row */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-[#F1F5F9] dark:bg-[#0A1929] rounded-lg border border-[#CBD5E1] dark:border-[#1D3A58]">
              <svg className="w-4 h-4 flex-shrink-0 text-[#64748B] dark:text-[#7A8EA6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs text-[#64748B] dark:text-[#7A8EA6] truncate flex-1 font-mono">{shareUrl}</span>
              <CopyBtn url={shareUrl} />
            </div>

            {/* Register CTA */}
            <a
              href={race.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#FF4500] text-white text-center py-4 rounded-xl font-condensed font-bold text-xl uppercase tracking-wide hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors"
            >
              Register Now →
            </a>
          </div>
        </article>
      </div>
    </div>
  )
}
