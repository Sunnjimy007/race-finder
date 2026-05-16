'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'

interface StravaAthlete {
  athlete_name: string
  athlete_avatar: string | null
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [strava, setStrava] = useState<StravaAthlete | null>(null)
  const [loadingStrava, setLoadingStrava] = useState(true)
  const [stravaStatus, setStravaStatus] = useState<'connected' | 'error' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava') === 'connected') setStravaStatus('connected')
    if (params.get('strava') === 'error') setStravaStatus('error')
  }, [])

  useEffect(() => {
    if (!user) { setLoadingStrava(false); return }
    supabase
      .from('strava_tokens')
      .select('athlete_name, athlete_avatar')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setStrava(data)
        setLoadingStrava(false)
      })
  }, [user])

  async function handleConnectStrava() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAuthOpen(true); return }
    // Pass access token as state so callback can identify the user server-side
    window.location.href = `/api/auth/strava?state=${session.access_token}`
  }

  async function handleDisconnect() {
    if (!user) return
    await supabase.from('strava_tokens').delete().eq('user_id', user.id)
    setStrava(null)
    setStravaStatus(null)
  }

  if (!user) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Profile</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-12">Connect your running apps</p>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-6">
            Sign in to view your profile
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
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Profile</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">{user.email}</p>
      </div>

      {stravaStatus === 'connected' && (
        <div className="bg-[#00C96B]/10 border border-[#00C96B]/30 rounded-xl px-4 py-3 mb-6 text-sm text-[#00C96B] font-medium">
          Strava connected successfully!
        </div>
      )}
      {stravaStatus === 'error' && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 mb-6 text-sm text-red-500">
          Could not connect Strava — please try again.
        </div>
      )}

      {/* Strava card */}
      <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-[#1D3A58] flex items-center gap-2">
          <svg className="w-4 h-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">
            Strava
          </p>
        </div>

        <div className="px-5 py-5">
          {loadingStrava ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#FC4C02] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : strava ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {strava.athlete_avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={strava.athlete_avatar}
                    alt={strava.athlete_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FFFFFC]">{strava.athlete_name}</p>
                  <p className="text-xs text-[#00C96B]">Connected</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs font-condensed font-bold uppercase tracking-wide text-[#64748B] dark:text-[#7A8EA6] hover:text-red-500 border border-[#CBD5E1] dark:border-[#1D3A58] hover:border-red-400 px-3 py-1.5 rounded-lg transition-all"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#64748B] dark:text-[#7A8EA6] mb-4 leading-relaxed">
                Connect Strava to sync your running profile and discover races that match your training.
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
    </div>
  )
}
