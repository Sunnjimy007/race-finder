import Link from 'next/link'
import type { Race } from '@/types/race'
import { raceToId } from '@/lib/getRaceById'
import GoingButton from '@/components/GoingButton'

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(dateStr: string) {
  const d = parseLocalDate(dateStr)
  return {
    month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
    day: d.getDate().toString(),
    year: d.getFullYear().toString(),
  }
}

function isEarlyBirdActive(deadline: string | null): boolean {
  if (!deadline) return false
  return parseLocalDate(deadline) >= new Date()
}

function formatShortDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('default', { day: 'numeric', month: 'short' })
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill={filled ? 'currentColor' : 'none'}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

interface RaceCardProps {
  race: Race
  isSaved?: boolean
  onToggleSave?: (race: Race) => void
}

export default function RaceCard({ race, isSaved = false, onToggleSave }: RaceCardProps) {
  const { month, day, year } = formatDate(race.date)
  const earlyBird = isEarlyBirdActive(race.early_bird_deadline)

  return (
    <article className="relative bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-4 hover:border-[#FF4500]/50 dark:hover:border-[#FF4500]/50 transition-colors">
      {/* Save button */}
      {onToggleSave && (
        <button
          onClick={() => onToggleSave(race)}
          aria-label={isSaved ? 'Remove from saved' : 'Save race'}
          className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            isSaved
              ? 'text-[#FF4500]'
              : 'text-[#CBD5E1] dark:text-[#1D3A58] hover:text-[#FF4500] dark:hover:text-[#FF4500]'
          }`}
        >
          <HeartIcon filled={isSaved} />
        </button>
      )}

      <div className="flex gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 flex flex-col items-center justify-start bg-[#F1F5F9] dark:bg-[#000000] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-lg px-3 py-2.5 min-w-[58px] text-center">
          <span className="font-condensed text-[#FF4500] text-xs font-bold uppercase leading-none mb-0.5">
            {month}
          </span>
          <span className="font-condensed text-[#0F172A] dark:text-[#FFFFFC] text-3xl font-bold leading-none">
            {day}
          </span>
          <span className="font-condensed text-[#64748B] dark:text-[#7A8EA6] text-xs leading-none mt-0.5">
            {year}
          </span>
        </div>

        {/* Main content — pr-8 leaves room for the save button */}
        <div className="flex-1 min-w-0 pr-8">
          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="bg-[#FF4500] text-white font-condensed font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full shadow-sm shadow-[#FF4500]/30">
              {race.distance}
            </span>
            {race.sub_distances?.map(d => (
              <span key={d} className="bg-[#FF4500]/10 dark:bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30 font-condensed font-semibold text-xs uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                {d}
              </span>
            ))}
            {earlyBird && (
              <span className="bg-[#00C96B]/15 text-[#00C96B] border border-[#00C96B]/30 font-condensed font-semibold text-xs uppercase px-3 py-1 rounded-full">
                Early Bird
              </span>
            )}
          </div>

          {/* Race name */}
          <Link href={`/races/${raceToId(race)}`} className="group">
            <h2 className="font-condensed font-bold text-xl text-[#0F172A] dark:text-[#FFFFFC] leading-tight mb-1 truncate group-hover:text-[#FF4500] transition-colors">
              {race.name}
            </h2>
          </Link>

          {/* Location */}
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-2.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{race.location}</span>
          </p>

          {/* Description */}
          <p className="text-[#0F172A]/60 dark:text-[#FFFFFC]/60 text-sm leading-relaxed mb-4 line-clamp-3">
            {race.description}
          </p>

          {/* Footer: price + register */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="font-condensed font-bold text-xl text-[#0F172A] dark:text-[#FFFFFC] block">
                {race.price}
              </span>
              {race.early_bird_deadline && (
                <span className={`text-xs block mt-0.5 ${earlyBird ? 'text-[#00C96B]' : 'text-[#64748B] dark:text-[#7A8EA6]'}`}>
                  {earlyBird
                    ? `Early bird until ${formatShortDate(race.early_bird_deadline)}`
                    : `Early bird ended ${formatShortDate(race.early_bird_deadline)}`}
                </span>
              )}
            </div>

            <a
              href={race.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-[#FF4500] text-white px-4 py-2.5 rounded-lg font-condensed font-bold text-sm uppercase tracking-wide hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors min-h-[44px] flex items-center whitespace-nowrap"
            >
              Register →
            </a>
          </div>
          {/* Going button */}
          <GoingButton
            raceId={raceToId(race)}
            raceName={race.name}
            raceDate={race.date}
          />
        </div>
      </div>
    </article>
  )
}
