'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Attendee {
  userId: string
  letter: string
  colour: string
  isFollowing: boolean
}

interface AttendeesListProps {
  raceId: string
}

export default function AttendeesList({ raceId }: AttendeesListProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const fetchAttendees = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setAuthed(!!session)
    const headers: HeadersInit = session
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
    const res = await fetch(`/api/attendees?raceId=${encodeURIComponent(raceId)}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setAttendees(data.attendees ?? [])
    }
    setLoading(false)
  }, [raceId])

  useEffect(() => { fetchAttendees() }, [fetchAttendees])

  async function handleFollow(userId: string, currentlyFollowing: boolean) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setPendingIds(prev => new Set(prev).add(userId))

    // Optimistic update
    setAttendees(prev =>
      prev.map(a => a.userId === userId ? { ...a, isFollowing: !currentlyFollowing } : a)
    )

    await fetch('/api/follows', {
      method: currentlyFollowing ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ followingId: userId }),
    })

    setPendingIds(prev => { const s = new Set(prev); s.delete(userId); return s })
  }

  if (loading || attendees.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#1D3A58]">
      <p className="text-xs text-[#64748B] dark:text-[#7A8EA6] uppercase tracking-widest font-condensed font-semibold mb-3">
        Who&apos;s Going
      </p>
      <div className="space-y-2">
        {attendees.slice(0, 6).map(a => (
          <div key={a.userId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: a.colour }}
              >
                {a.letter}
              </div>
              <span className="text-sm text-[#64748B] dark:text-[#7A8EA6] font-mono">
                {a.userId.slice(0, 8)}…
              </span>
            </div>
            {authed && (
              <button
                onClick={() => handleFollow(a.userId, a.isFollowing)}
                disabled={pendingIds.has(a.userId)}
                className={`text-xs font-condensed font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                  a.isFollowing
                    ? 'border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-red-400 hover:text-red-500'
                    : 'border-[#FF4500]/40 text-[#FF4500] hover:bg-[#FF4500] hover:text-white'
                }`}
              >
                {a.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
