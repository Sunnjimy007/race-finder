'use client'

import { useState } from 'react'
import RaceCard from '@/components/RaceCard'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'
import { useSavedRaces } from '@/hooks/useSavedRaces'

export default function SavedPage() {
  const { user } = useAuth()
  const { saved, loadingSaved, toggleSave, isSaved } = useSavedRaces(user)
  const [authOpen, setAuthOpen] = useState(false)

  if (!user) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Saved Races</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-12">Your bookmarked events</p>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-full flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-[#CBD5E1] dark:text-[#1D3A58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">Sign in to save races</p>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs leading-relaxed mb-6">
            Create an account to bookmark races and access them from any device.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="bg-[#FF4500] text-white px-8 py-3 rounded-xl font-condensed font-bold text-base uppercase tracking-wide hover:bg-[#FF7F11] transition-colors"
          >
            Sign In / Create Account
          </button>
        </div>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-8">
      <div className="mb-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Saved Races</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">
          {loadingSaved
            ? 'Loading…'
            : saved.length > 0
              ? `${saved.length} race${saved.length !== 1 ? 's' : ''} bookmarked`
              : 'Your bookmarked events'}
        </p>
      </div>

      {loadingSaved && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loadingSaved && saved.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-full flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-[#CBD5E1] dark:text-[#1D3A58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">No saved races yet</p>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs leading-relaxed">
            Tap the heart on any race in your search results to save it here
          </p>
        </div>
      )}

      {!loadingSaved && saved.length > 0 && (
        <div className="space-y-4">
          {saved.map((race, i) => (
            <RaceCard
              key={`${race.name}-${i}`}
              race={race}
              isSaved={isSaved(race)}
              onToggleSave={toggleSave}
            />
          ))}
          <p className="text-center text-[#64748B] dark:text-[#7A8EA6] text-xs py-6 px-4 leading-relaxed">
            Race details sourced via AI — verify on official websites before registering
          </p>
        </div>
      )}
    </div>
  )
}
