'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'

type Tab = 'requests' | 'following' | 'discover'
type FollowStatus = 'none' | 'following' | 'pending_outgoing' | 'pending_incoming'

interface Person {
  userId: string
  displayName: string
  followStatus: FollowStatus
  followId?: string
}

interface FollowEntry {
  id: string
  following_id: string
  status: string
  name: string
}

interface Profile { first_name: string; last_name: string }

export default function FriendsPage() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('discover')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [following, setFollowing] = useState<FollowEntry[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  const fetchProfile = useCallback(async () => {
    const session = await getSession()
    if (!session) { setProfileLoading(false); return }
    const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const data = await res.json()
      setProfile(data)
      setFirstName(data.first_name ?? '')
      setLastName(data.last_name ?? '')
    }
    setProfileLoading(false)
  }, [])

  const fetchFollowing = useCallback(async () => {
    const session = await getSession()
    if (!session) return
    const res = await fetch('/api/follows', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const data = await res.json()
      setFollowing(data.following ?? [])
    }
  }, [])

  const fetchPeople = useCallback(async () => {
    const session = await getSession()
    if (!session) return
    setLoading(true)
    const res = await fetch('/api/people', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const data = await res.json()
      setPeople(data.people ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchFollowing()
      fetchPeople()
    }
  }, [user, fetchProfile, fetchFollowing, fetchPeople])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    const session = await getSession()
    if (!session) return
    setSavingProfile(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    })
    if (res.ok) {
      const data = await res.json()
      setProfile(data)
      setProfileSaved(true)
      fetchPeople()
    }
    setSavingProfile(false)
  }

  async function handleFollow(userId: string, currentStatus: FollowStatus) {
    const session = await getSession()
    if (!session) return
    setPendingIds(prev => new Set(prev).add(userId))

    if (currentStatus === 'following' || currentStatus === 'pending_outgoing') {
      // Unfollow or cancel request
      await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ followingId: userId }),
      })
      setPeople(prev => prev.map(p => p.userId === userId ? { ...p, followStatus: 'none' as FollowStatus, followId: undefined } : p))
      setFollowing(prev => prev.filter(f => f.following_id !== userId))
    } else if (currentStatus === 'none') {
      // Send follow request
      await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ followingId: userId }),
      })
      setPeople(prev => prev.map(p => p.userId === userId ? { ...p, followStatus: 'pending_outgoing' as FollowStatus } : p))
    }

    setPendingIds(prev => { const s = new Set(prev); s.delete(userId); return s })
  }

  async function handleAccept(followId: string, actorId: string) {
    const session = await getSession()
    if (!session) return
    setPendingIds(prev => new Set(prev).add(followId))

    const res = await fetch(`/api/follows/${followId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'accept' }),
    })
    if (res.ok) {
      // Refresh both lists
      await Promise.all([fetchFollowing(), fetchPeople()])
      if (tab === 'requests') setTab('following')
    }
    setPendingIds(prev => { const s = new Set(prev); s.delete(followId); return s })
  }

  async function handleDecline(followId: string) {
    const session = await getSession()
    if (!session) return
    await fetch(`/api/follows/${followId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'decline' }),
    })
    setPeople(prev => prev.map(p => p.followId === followId ? { ...p, followStatus: 'none' as FollowStatus, followId: undefined } : p))
  }

  const incoming = people.filter(p => p.followStatus === 'pending_incoming')
  const acceptedFollowing = following.filter(f => f.status === 'accepted')
  const pendingFollowing = following.filter(f => f.status === 'pending')
  const discover = people.filter(p => p.followStatus === 'none')

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
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs leading-relaxed mb-6">Get notified when your friends sign up for a race.</p>
          <button onClick={() => setAuthOpen(true)} className="bg-[#FF4500] text-white px-8 py-3 rounded-xl font-condensed font-bold text-base uppercase tracking-wide hover:bg-[#FF7F11] transition-colors">
            Sign In / Create Account
          </button>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-8">
      <div className="mb-6">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Friends</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">
          {acceptedFollowing.length > 0 ? `Following ${acceptedFollowing.length}` : 'Find your running crew'}
        </p>
      </div>

      {/* Profile name — show setup banner if no name set yet, show success if just saved */}
      {!profileLoading && profileSaved && (
        <div className="bg-[#00C96B]/10 border border-[#00C96B]/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#00C96B] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm text-[#00C96B] font-medium">
            You&apos;re now discoverable as <strong>{firstName}{lastName ? ` ${lastName[0]}.` : ''}</strong>
          </p>
        </div>
      )}
      {!profileLoading && !profileSaved && !profile?.first_name && (
        <div className="bg-[#FF4500]/5 dark:bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-xl p-4 mb-6">
          <p className="font-condensed font-bold text-sm uppercase tracking-wide text-[#FF4500] mb-1">Set your display name</p>
          <p className="text-xs text-[#64748B] dark:text-[#7A8EA6] mb-3">So friends can recognise you. Shows as &quot;First L.&quot;</p>
          <form onSubmit={saveProfile} className="flex gap-2">
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name"
              required
              className="flex-1 bg-white dark:bg-[#0A1929] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-[#FFFFFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF4500] transition-colors"
            />
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Last name"
              className="flex-1 bg-white dark:bg-[#0A1929] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-[#FFFFFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF4500] transition-colors"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-[#FF4500] text-white px-4 py-2 rounded-lg font-condensed font-bold text-xs uppercase tracking-wide hover:bg-[#FF7F11] transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {savingProfile ? '…' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-[#F1F5F9] dark:bg-[#000000] p-1 mb-6 gap-1">
        {([
          { key: 'requests', label: incoming.length > 0 ? `Requests (${incoming.length})` : 'Requests' },
          { key: 'following', label: 'Following' },
          { key: 'discover', label: 'Discover' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 px-1 rounded-lg font-condensed font-semibold text-xs uppercase tracking-wide transition-all ${
              tab === key
                ? 'bg-white dark:bg-[#12263A] text-[#0F172A] dark:text-[#FFFFFC] shadow-sm'
                : 'text-[#64748B] dark:text-[#7A8EA6]'
            } ${key === 'requests' && incoming.length > 0 ? 'text-[#FF4500]' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Requests tab ── */}
      {tab === 'requests' && (
        <div>
          {incoming.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-condensed text-lg font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">No pending requests</p>
              <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">When someone wants to follow you, you&apos;ll see them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incoming.map(p => (
                <div key={p.userId} className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-[#FF4500]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF4500] font-bold text-lg">{p.displayName[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#0F172A] dark:text-[#FFFFFC]">{p.displayName}</p>
                      <p className="text-xs text-[#64748B] dark:text-[#7A8EA6]">wants to follow you</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => p.followId && handleAccept(p.followId, p.userId)}
                      disabled={pendingIds.has(p.followId ?? '')}
                      className="flex-1 bg-[#FF4500] text-white py-2.5 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:bg-[#FF7F11] transition-colors disabled:opacity-40"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => p.followId && handleDecline(p.followId)}
                      disabled={pendingIds.has(p.followId ?? '')}
                      className="flex-1 border border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] py-2.5 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Following tab ── */}
      {tab === 'following' && (
        <div>
          {acceptedFollowing.length === 0 && pendingFollowing.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-condensed text-lg font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">Not following anyone yet</p>
              <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-4">
                Head to Discover to find friends to follow.
              </p>
              <button onClick={() => setTab('discover')} className="text-[#FF4500] font-condensed font-bold text-sm uppercase">
                Discover people →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFollowing.length > 0 && (
                <>
                  <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">Pending</p>
                  {pendingFollowing.map(f => (
                    <PersonRow
                      key={f.id}
                      name={f.name}
                      status="pending_outgoing"
                      disabled={pendingIds.has(f.following_id)}
                      onAction={() => handleFollow(f.following_id, 'pending_outgoing')}
                    />
                  ))}
                  <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold pt-2">Following</p>
                </>
              )}
              {acceptedFollowing.map(f => (
                <PersonRow
                  key={f.id}
                  name={f.name}
                  status="following"
                  disabled={pendingIds.has(f.following_id)}
                  onAction={() => handleFollow(f.following_id, 'following')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Discover tab ── */}
      {tab === 'discover' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : discover.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-condensed text-lg font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">
                {people.length === 0 ? 'No other runners yet' : 'You\'re following everyone!'}
              </p>
              <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs mx-auto leading-relaxed">
                {people.length === 0
                  ? 'As more runners join RaceFinder and set their display name, they\'ll appear here.'
                  : 'Check the Following tab to see your crew.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">
                {discover.length} runner{discover.length !== 1 ? 's' : ''} on RaceFinder
              </p>
              {discover.map(p => (
                <PersonRow
                  key={p.userId}
                  name={p.displayName}
                  status={p.followStatus}
                  disabled={pendingIds.has(p.userId)}
                  onAction={() => handleFollow(p.userId, p.followStatus)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Account settings ── */}
      <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#1D3A58]">
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold mb-3">
          Your Settings
        </p>
        <div className="space-y-2">
          {/* Display name edit (if already set) */}
          {profile?.first_name && (
            <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3">
              <p className="text-xs text-[#64748B] dark:text-[#7A8EA6] mb-2 uppercase tracking-wider font-condensed font-semibold">Display name</p>
              <form onSubmit={saveProfile} className="flex gap-2">
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="flex-1 bg-[#F1F5F9] dark:bg-[#0A1929] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-[#FFFFFC] focus:outline-none focus:border-[#FF4500] transition-colors"
                />
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="flex-1 bg-[#F1F5F9] dark:bg-[#0A1929] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-[#FFFFFC] focus:outline-none focus:border-[#FF4500] transition-colors"
                />
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#FF4500] text-white px-4 py-2 rounded-lg font-condensed font-bold text-xs uppercase tracking-wide hover:bg-[#FF7F11] transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {savingProfile ? '…' : profileSaved ? 'Saved ✓' : 'Update'}
                </button>
              </form>
            </div>
          )}

          {/* Links to other settings */}
          {[
            { href: '/profile', label: 'Strava Integration', desc: 'Connect your Strava account', icon: <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /> },
            { href: '/account', label: 'Notification Preferences', desc: 'Email and in-app alerts', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
            { href: '/alerts', label: 'Race Alerts', desc: 'Get emailed when new races match your criteria', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
          ].map(({ href, label, desc, icon }) => (
            <a
              key={href}
              href={href}
              className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#0A1929] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF4500]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#FF4500]" fill={label === 'Strava Integration' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke={label === 'Strava Integration' ? 'none' : 'currentColor'} strokeWidth={2}>
                    {icon}
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F172A] dark:text-[#FFFFFC]">{label}</p>
                  <p className="text-xs text-[#64748B] dark:text-[#7A8EA6]">{desc}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#CBD5E1] dark:text-[#1D3A58] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function PersonRow({
  name,
  status,
  disabled,
  onAction,
}: {
  name: string
  status: FollowStatus
  disabled: boolean
  onAction: () => void
}) {
  const btnLabel = status === 'following' ? 'Following' : status === 'pending_outgoing' ? 'Requested' : 'Follow'
  const btnClass = status === 'following'
    ? 'border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-red-400 hover:text-red-500'
    : status === 'pending_outgoing'
      ? 'border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6]'
      : 'border-[#FF4500]/40 text-[#FF4500] hover:bg-[#FF4500] hover:text-white'

  return (
    <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-[#FF4500]/10 dark:bg-[#FF4500]/15 flex items-center justify-center flex-shrink-0">
          <span className="text-[#FF4500] font-bold text-base">{name[0]?.toUpperCase()}</span>
        </div>
        <span className="text-sm font-medium text-[#0F172A] dark:text-[#FFFFFC] truncate">{name}</span>
      </div>
      <button
        onClick={onAction}
        disabled={disabled || status === 'pending_outgoing'}
        className={`flex-shrink-0 text-xs font-condensed font-bold uppercase tracking-wide px-4 py-2 rounded-lg border transition-all disabled:opacity-40 ${btnClass}`}
      >
        {btnLabel}
      </button>
    </div>
  )
}
