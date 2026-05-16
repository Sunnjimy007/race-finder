'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'

interface StravaAthlete {
  athlete_name: string
  athlete_avatar: string | null
}

interface StravaStats {
  weekly_km_avg: number
  longest_run_km: number
  total_runs_last_30_days: number
  preferred_distances: string[]
  estimated_level: string
  home_location: string | null
  recent_pace: string | null
  ytd_distance_km: number
  last_synced: string | null
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F1F5F9] dark:bg-[#0A1929] rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#64748B] dark:text-[#7A8EA6]">
        {label}
      </span>
      <span className="font-condensed font-bold text-lg text-[#0F172A] dark:text-[#FFFFFC] leading-tight">
        {value}
      </span>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [strava, setStrava] = useState<StravaAthlete | null>(null)
  const [stats, setStats] = useState<StravaStats | null>(null)
  const [loadingStrava, setLoadingStrava] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [stravaStatus, setStravaStatus] = useState<'connected' | 'error' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava') === 'connected') setStravaStatus('connected')
    if (params.get('strava') === 'error') setStravaStatus('error')
  }, [])

  const loadStravaData = useCallback(async () => {
    if (!user) { setLoadingStrava(false); return }
    const [{ data: token }, { data: cached }] = await Promise.all([
      supabase.from('strava_tokens').select('athlete_name, athlete_avatar').eq('user_id', user.id).maybeSingle(),
      supabase.from('strava_stats').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    setStrava(token)
    setStats(cached)
    setLoadingStrava(false)
  }, [user])

  useEffect(() => { loadStravaData() }, [loadStravaData])


  async function handleConnectStrava() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAuthOpen(true); return }
    window.location.href = `/api/auth/strava?state=${session.access_token}`
  }

  async function handleDisconnect() {
    if (!user) return
    await Promise.all([
      supabase.from('strava_tokens').delete().eq('user_id', user.id),
      supabase.from('strava_stats').delete().eq('user_id', user.id),
    ])
    setStrava(null)
    setStats(null)
    setStravaStatus(null)
  }

  async function handleSync() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (res.ok) {
        const { data: fresh } = await supabase
          .from('strava_stats').select('*').eq('user_id', user!.id).maybeSingle()
        setStats(fresh)
      } else {
        setSyncError(body.error ?? 'Sync failed — please try again.')
      }
    } catch (e) {
      setSyncError('Network error — check your connection and try again.')
      console.error('Strava sync failed:', e)
    } finally {
      setSyncing(false)
    }
  }

  function formatSynced(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  if (!user) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Profile</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-12">Connect your running apps</p>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-6">Sign in to view your profile</p>
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
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Profile</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">{user.email}</p>
      </div>

      {stravaStatus === 'connected' && (
        <div className="bg-[#00C96B]/10 border border-[#00C96B]/30 rounded-xl px-4 py-3 mb-5 text-sm text-[#00C96B] font-medium">
          Strava connected! Syncing your data…
        </div>
      )}
      {stravaStatus === 'error' && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 mb-5 text-sm text-red-500">
          Could not connect Strava — please try again.
        </div>
      )}

      {/* ── Strava card ── */}
      <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl overflow-hidden mb-4">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-[#1D3A58] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">
              Strava
            </p>
          </div>
          {strava && (
            <button
              onClick={handleDisconnect}
              className="text-xs font-condensed font-bold uppercase tracking-wide text-[#64748B] dark:text-[#7A8EA6] hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          {loadingStrava ? (
            <div className="flex items-center justify-center py-5">
              <div className="w-6 h-6 border-2 border-[#FC4C02] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : strava ? (
            <div>
              {/* Athlete row */}
              <div className="flex items-center gap-3 mb-4">
                {strava.athlete_avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={strava.athlete_avatar} alt={strava.athlete_name} className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FFFFFC]">{strava.athlete_name}</p>
                  <p className="text-xs text-[#00C96B]">Connected</p>
                </div>
              </div>

              {/* Sync button — always visible and prominent */}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 bg-[#FC4C02] text-white py-3 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:bg-[#e64500] active:bg-[#cc3d00] transition-colors disabled:opacity-50 mb-4"
              >
                {syncing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {syncing ? 'Syncing…' : 'Sync Strava Data'}
              </button>

              {syncError && (
                <p className="text-xs text-red-500 mb-3 leading-relaxed">{syncError}</p>
              )}

              {/* Stats grid */}
              {stats ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <StatPill label="Weekly avg" value={`${stats.weekly_km_avg.toFixed(1)} km`} />
                    <StatPill label="Longest run" value={`${stats.longest_run_km.toFixed(1)} km`} />
                    <StatPill label="KM this year" value={`${stats.ytd_distance_km.toFixed(0)} km`} />
                    <StatPill label="Runs (30 days)" value={`${stats.total_runs_last_30_days}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {stats.recent_pace && (
                      <StatPill label="Recent pace" value={stats.recent_pace} />
                    )}
                    <StatPill label="Level" value={stats.estimated_level} />
                  </div>
                  {(stats.preferred_distances?.length > 0 || stats.home_location) && (
                    <div className="text-xs text-[#64748B] dark:text-[#7A8EA6] space-y-1 pt-2 border-t border-[#E2E8F0] dark:border-[#1D3A58]">
                      {stats.preferred_distances?.length > 0 && (
                        <p>Favourite distances: <span className="font-medium text-[#0F172A] dark:text-[#FFFFFC]">{stats.preferred_distances.join(', ')}</span></p>
                      )}
                      {stats.home_location && (
                        <p>Usually runs in: <span className="font-medium text-[#0F172A] dark:text-[#FFFFFC]">{stats.home_location}</span></p>
                      )}
                    </div>
                  )}
                  {stats.last_synced && (
                    <p className="text-[10px] text-[#94A3B8] mt-3">
                      Last synced {formatSynced(stats.last_synced)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#64748B] dark:text-[#7A8EA6] text-center py-2">
                  No data yet — tap Sync above to load your stats.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#64748B] dark:text-[#7A8EA6] mb-4 leading-relaxed">
                Connect Strava to sync your running stats and discover races that match your training.
              </p>
              <button
                onClick={handleConnectStrava}
                className="inline-flex items-center gap-2 bg-[#FC4C02] text-white px-5 py-2.5 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:bg-[#e64500] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Connect with Strava
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Other settings links */}
      <div className="space-y-2 mt-2">
        {[
          { href: '/account', label: 'Notification Preferences', desc: 'Email and in-app alerts', icon: 'bell' },
          { href: '/alerts',  label: 'Race Alerts',              desc: 'Get emailed when new races match your criteria', icon: 'search' },
          { href: '/friends', label: 'Friends',                  desc: 'Follow runners and see who\'s going', icon: 'people' },
        ].map(({ href, label, desc, icon }) => (
          <a key={href} href={href} className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#0A1929] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF4500]/10 flex items-center justify-center flex-shrink-0">
                {icon === 'bell' && <svg className="w-4 h-4 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                {icon === 'search' && <svg className="w-4 h-4 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>}
                {icon === 'people' && <svg className="w-4 h-4 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
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
  )
}
