'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'

interface FollowEntry {
  following_id: string
  name: string
  created_at: string
}

export default function FriendsPage() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [following, setFollowing] = useState<FollowEntry[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const fetchFollows = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const res = await fetch('/api/follows', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setFollowing(data.following ?? [])
      setFollowerCount(data.followerCount ?? 0)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchFollows() }, [fetchFollows])

  async function handleUnfollow(followingId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setPendingIds(prev => new Set(prev).add(followingId))
    setFollowing(prev => prev.filter(f => f.following_id !== followingId))

    await fetch('/api/follows', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ followingId }),
    })

    setPendingIds(prev => { const s = new Set(prev); s.delete(followingId); return s })
  }

  if (!user) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Friends</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-12">See when friends sign up for races</p>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-full flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-[#CBD5E1] dark:text-[#1D3A58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">Sign in to follow friends</p>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs leading-relaxed mb-6">
            Get notified when your friends sign up for a race.
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
    <div className="px-4 pt-8 pb-8">
      <div className="mb-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Friends</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">
          {following.length > 0 ? `Following ${following.length}` : 'Not following anyone yet'}
          {followerCount > 0 ? ` · ${followerCount} follower${followerCount !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {/* How to follow tip */}
      <div className="bg-[#FF4500]/5 dark:bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-xl px-4 py-3 mb-6 flex gap-3 items-start">
        <svg className="w-4 h-4 text-[#FF4500] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-[#0F172A]/70 dark:text-[#FFFFFC]/70 leading-relaxed">
          Open any race, scroll to <strong>Who&apos;s Going</strong>, and tap <strong>Follow</strong> next to a runner to get notified when they sign up for future races.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : following.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="font-condensed text-lg font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">No one followed yet</p>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs leading-relaxed">
            Once you follow someone from a race page, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">Following</p>
          {following.map(f => {
            const initial = f.name?.[0]?.toUpperCase() ?? '?'
            return (
              <div
                key={f.following_id}
                className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#FF4500]/10 dark:bg-[#FF4500]/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#FF4500] font-bold text-base">{initial}</span>
                  </div>
                  <span className="text-sm text-[#0F172A] dark:text-[#FFFFFC] font-medium truncate">
                    {f.name}
                  </span>
                </div>
                <button
                  onClick={() => handleUnfollow(f.following_id)}
                  disabled={pendingIds.has(f.following_id)}
                  className="flex-shrink-0 text-xs font-condensed font-bold uppercase tracking-wide text-[#64748B] dark:text-[#7A8EA6] hover:text-red-500 border border-[#CBD5E1] dark:border-[#1D3A58] hover:border-red-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                >
                  Unfollow
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
