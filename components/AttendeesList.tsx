'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Attendee {
  userId: string
  displayName: string
  letter: string
  colour: string
  isFollowing: boolean
  isPending: boolean
}

interface AttendeesListProps {
  raceId: string
}

export default function AttendeesList({ raceId }: AttendeesListProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [actioning, setActioning] = useState<Set<string>>(new Set())

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

  async function handleFollow(attendee: Attendee) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setActioning(prev => new Set(prev).add(attendee.userId))

    if (attendee.isFollowing) {
      // Unfollow
      setAttendees(prev => prev.map(a => a.userId === attendee.userId ? { ...a, isFollowing: false } : a))
      await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ followingId: attendee.userId }),
      })
    } else {
      // Send follow request (optimistic: show pending)
      setAttendees(prev => prev.map(a => a.userId === attendee.userId ? { ...a, isPending: true } : a))
      await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ followingId: attendee.userId }),
      })
    }

    setActioning(prev => { const s = new Set(prev); s.delete(attendee.userId); return s })
  }

  if (loading || attendees.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#1D3A58]">
      <p className="text-xs text-[#64748B] dark:text-[#7A8EA6] uppercase tracking-widest font-condensed font-semibold mb-3">
        Who&apos;s Going
      </p>
      <div className="space-y-2.5">
        {attendees.slice(0, 6).map(a => {
          const isActioning = actioning.has(a.userId)
          const btnLabel = a.isFollowing ? 'Following' : a.isPending ? 'Requested' : 'Follow'
          const btnClass = a.isFollowing
            ? 'border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-red-400 hover:text-red-500'
            : a.isPending
              ? 'border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] cursor-default'
              : 'border-[#FF4500]/40 text-[#FF4500] hover:bg-[#FF4500] hover:text-white'

          return (
            <div key={a.userId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: a.colour }}
                >
                  {a.letter}
                </div>
                <span className="text-sm text-[#0F172A] dark:text-[#FFFFFC] font-medium truncate">
                  {a.displayName}
                </span>
              </div>
              {authed && (
                <button
                  onClick={() => !a.isPending && handleFollow(a)}
                  disabled={isActioning || a.isPending}
                  className={`flex-shrink-0 text-xs font-condensed font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${btnClass}`}
                >
                  {btnLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
