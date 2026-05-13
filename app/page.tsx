'use client'

import { useState, useEffect } from 'react'
import RaceCard from '@/components/RaceCard'
import ThemeToggle from '@/components/ThemeToggle'
import SearchingState from '@/components/SearchingState'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'
import { useSavedRaces } from '@/hooks/useSavedRaces'
import { supabase } from '@/lib/supabase'
import type { Race } from '@/types/race'

const DISTANCES = ['5K', '10K', 'Half', 'Full', 'Ultra', 'Fun Run']
const TIMEFRAMES = [
  { value: 'next 3 months', label: 'Next 3 months' },
  { value: 'next 6 months', label: 'Next 6 months' },
  { value: 'next 12 months', label: 'Next 12 months' },
]

// Active markets — expand this list as coverage improves
const ACTIVE_LOCATIONS = ['Singapore', 'Australia']

export default function SearchPage() {
  const { user, signOut } = useAuth()
  const { isSaved, toggleSave } = useSavedRaces(user)

  const [location, setLocation] = useState('Singapore')
  const [selectedDistances, setSelectedDistances] = useState<string[]>([...DISTANCES])
  const [timeframe, setTimeframe] = useState('next 12 months')
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [formCollapsed, setFormCollapsed] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingRace, setPendingRace] = useState<Race | null>(null)

  // Restore last search from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('racefinder_search')
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.location) setLocation(s.location)
      if (s.distances) setSelectedDistances(s.distances)
      if (s.timeframe) setTimeframe(s.timeframe)
      if (Array.isArray(s.races) && s.races.length > 0) {
        setRaces(s.races)
        setHasSearched(true)
        setFormCollapsed(true)
      }
    } catch {}
  }, [])

  const toggleDistance = (d: string) =>
    setSelectedDistances(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSearch = async () => {
    if (!location) return
    setLoading(true)
    setError(null)
    setHasSearched(true)
    setRaces([])

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, distances: selectedDistances, timeframe }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')
      const results: Race[] = Array.isArray(data.races) ? data.races : []
      setRaces(results)
      if (results.length > 0) setFormCollapsed(true)

      try {
        localStorage.setItem('racefinder_search', JSON.stringify({
          location, distances: selectedDistances, timeframe, races: results,
        }))
      } catch {}

      // Fire-and-forget alert check for logged-in users
      if (user && results.length > 0) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return
          fetch('/api/alerts/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ location, races: results }),
          }).catch(() => {})
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRace = (race: Race) => {
    if (!user) {
      setPendingRace(race)
      setAuthOpen(true)
      return
    }
    toggleSave(race)
  }

  const handleAuthSuccess = () => {
    if (pendingRace) {
      toggleSave(pendingRace)
      setPendingRace(null)
    }
  }

  return (
    <div className="px-4 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-condensed text-5xl font-bold tracking-tight uppercase leading-none">
            Race<span className="text-[#FF4500]">Finder</span>
          </h1>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mt-2">
            Discover upcoming running events near you
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {user ? (
            <button
              onClick={signOut}
              className="text-xs font-condensed font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#7A8EA6] hover:text-[#FF4500] transition-colors px-1"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="text-xs font-condensed font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#7A8EA6] hover:text-[#FF4500] transition-colors px-1"
            >
              Sign In
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Search — collapsed summary or full form */}
      {formCollapsed ? (
        <button
          onClick={() => setFormCollapsed(false)}
          className="w-full flex items-center justify-between bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3.5 mb-6 hover:border-[#FF4500]/60 transition-colors group text-left"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="font-condensed font-bold text-base text-[#0F172A] dark:text-[#FFFFFC]">
              {location}
            </span>
            <span className="text-[#CBD5E1] dark:text-[#1D3A58] text-sm">·</span>
            <span className="text-[#64748B] dark:text-[#7A8EA6] text-sm font-condensed">
              {selectedDistances.join(', ')}
            </span>
            <span className="text-[#CBD5E1] dark:text-[#1D3A58] text-sm">·</span>
            <span className="text-[#64748B] dark:text-[#7A8EA6] text-sm font-condensed">
              {TIMEFRAMES.find(t => t.value === timeframe)?.label}
            </span>
          </div>
          <span className="flex-shrink-0 ml-3 text-xs font-condensed font-bold uppercase tracking-widest text-[#FF4500] group-hover:text-[#FF7F11] transition-colors">
            Edit
          </span>
        </button>
      ) : (
        <div className="space-y-5 mb-8">
          <div>
            <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest mb-2.5 font-condensed font-semibold">Location</p>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3.5 text-[#0F172A] dark:text-[#FFFFFC] focus:outline-none focus:border-[#FF4500] transition-colors text-base cursor-pointer"
            >
              {ACTIVE_LOCATIONS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest mb-2.5 font-condensed font-semibold">Distance</p>
            <div className="flex flex-wrap gap-2">
              {DISTANCES.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDistance(d)}
                  className={`px-4 py-2 rounded-full font-condensed font-semibold text-sm uppercase tracking-wide transition-all min-h-[44px] border ${
                    selectedDistances.includes(d)
                      ? 'bg-[#FF4500] border-[#FF4500] text-white'
                      : 'bg-white dark:bg-[#12263A] border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-[#FF4500] hover:text-[#FF4500]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest mb-2.5 font-condensed font-semibold">Timeframe</p>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="w-full bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3.5 text-[#0F172A] dark:text-[#FFFFFC] focus:outline-none focus:border-[#FF4500] transition-colors text-base cursor-pointer"
            >
              {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-[#FF4500] text-white py-4 rounded-xl font-condensed font-bold text-xl uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors min-h-[56px]"
          >
            {loading ? 'Searching…' : 'Find Races →'}
          </button>
        </div>
      )}

      {loading && <SearchingState location={location} />}

      {!loading && error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && races.length > 0 && (
        <div className="space-y-4">
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">
            {races.length} race{races.length !== 1 ? 's' : ''} found
          </p>
          {races.map((race, i) => (
            <RaceCard
              key={`${race.name}-${i}`}
              race={race}
              isSaved={isSaved(race)}
              onToggleSave={handleSaveRace}
            />
          ))}
          <p className="text-center text-[#64748B] dark:text-[#7A8EA6] text-xs py-6 px-4 leading-relaxed">
            Race details sourced via AI — verify on official websites before registering
          </p>
        </div>
      )}

      {!loading && hasSearched && races.length === 0 && !error && (
        <div className="text-center py-16">
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">No races found</p>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">Try a different location or expand your timeframe</p>
        </div>
      )}

      <AuthModal
        isOpen={authOpen}
        onClose={() => { setAuthOpen(false); setPendingRace(null) }}
        onSuccess={handleAuthSuccess}
        prompt={pendingRace ? 'Sign in to save this race to your list.' : undefined}
      />
    </div>
  )
}
