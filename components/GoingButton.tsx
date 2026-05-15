'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'
import Toast from '@/components/Toast'
import ShareButton from '@/components/ShareButton'

interface Avatar { letter: string; colour: string }
interface GoingState { count: number; isGoing: boolean; avatars: Avatar[] }

interface GoingButtonProps {
  raceId: string
  raceName: string
  raceDate: string
  raceLocation?: string
  shareUrl?: string
}

export default function GoingButton({ raceId, raceName, raceDate, raceLocation, shareUrl }: GoingButtonProps) {
  const [state, setState] = useState<GoingState>({ count: 0, isGoing: false, avatars: [] })
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const fetchState = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = session
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
    const res = await fetch(`/api/attendees?raceId=${encodeURIComponent(raceId)}`, { headers })
    if (res.ok) setState(await res.json())
    setLoading(false)
  }, [raceId])

  useEffect(() => { fetchState() }, [fetchState])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleToggle() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAuthOpen(true); return }

    // Optimistic update
    const next: GoingState = {
      ...state,
      isGoing: !state.isGoing,
      count: state.isGoing ? Math.max(0, state.count - 1) : state.count + 1,
    }
    setState(next)
    setPulse(true)
    setTimeout(() => setPulse(false), 350)

    const res = await fetch('/api/attendees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ raceId, raceName, raceDate, raceLocation: raceLocation ?? '' }),
    })

    if (res.ok) {
      const data = await res.json()
      setState(data)
      showToast(data.isGoing ? "You're going! 🎉" : 'Removed')
    } else {
      setState(state) // revert on error
    }
  }

  if (loading) return <div className="h-9" /> // reserve space while loading

  return (
    <div className="relative flex items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#1D3A58]">
      {/* Left: share button (if provided) + avatar stack + count */}
      <div className="flex items-center gap-2 min-w-0">
        {shareUrl && <ShareButton url={shareUrl} raceName={raceName} />}
        {state.avatars.length > 0 && (
          <div className="flex -space-x-2 flex-shrink-0">
            {state.avatars.map((a, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-[#12263A] flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: a.colour }}
              >
                {a.letter}
              </div>
            ))}
            {state.count > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#12263A] bg-[#E2E8F0] dark:bg-[#1D3A58] flex items-center justify-center text-[#64748B] dark:text-[#7A8EA6] text-[10px] font-bold">
                +{state.count - 3}
              </div>
            )}
          </div>
        )}
        <span className="text-xs text-[#64748B] dark:text-[#7A8EA6] truncate">
          {state.count === 0 ? 'Be the first' : `${state.count} going`}
        </span>
      </div>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg font-condensed font-bold text-xs uppercase tracking-wide border transition-all duration-200 min-h-[36px] ${
          pulse ? 'scale-110' : 'scale-100'
        } ${
          state.isGoing
            ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
            : 'bg-transparent border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400'
        }`}
      >
        {state.isGoing && <span>✓</span>}
        I&apos;m Going
      </button>

      <Toast message={toast} />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        prompt="Sign in to mark yourself as going."
      />
    </div>
  )
}
