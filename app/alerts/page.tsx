'use client'

import { useState, useEffect } from 'react'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const DISTANCES = ['5K', '10K', 'Half', 'Full', 'Ultra', 'Fun Run']
const ACTIVE_LOCATIONS = ['Singapore', 'Australia']

interface Alert {
  id: string
  location: string
  distances: string[]
  email: string
  is_active: boolean
  created_at: string
}

export default function AlertsPage() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState('Singapore')
  const [selectedDistances, setSelectedDistances] = useState<string[]>(['Half', 'Full'])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('race_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setAlerts(data as Alert[])
        setLoading(false)
      })
  }, [user])

  const toggleDist = (d: string) =>
    setSelectedDistances(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || selectedDistances.length === 0) return
    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('race_alerts')
      .insert({
        user_id: user.id,
        email: user.email,
        location,
        distances: selectedDistances,
        is_active: true,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
    } else {
      setAlerts(prev => [data as Alert, ...prev])
      setSelectedDistances(['Half', 'Full'])
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('race_alerts').delete().eq('id', id)
    if (!err) setAlerts(prev => prev.filter(a => a.id !== id))
  }

  if (!user) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Race Alerts</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-12">Get notified when new races match your preferences</p>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-full flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-[#CBD5E1] dark:text-[#1D3A58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">Sign in to set alerts</p>
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm max-w-xs leading-relaxed mb-6">
            Get email notifications when new races matching your preferences are found.
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
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Race Alerts</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">
          Alerts send to <span className="text-[#0F172A] dark:text-[#FFFFFC]">{user.email}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-3 mb-8">
          <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold">Active Alerts</p>
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-condensed font-bold text-base text-[#0F172A] dark:text-[#FFFFFC]">{alert.location}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(alert.distances as string[]).map(d => (
                    <span key={d} className="bg-[#FF4500]/10 dark:bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30 font-condensed font-semibold text-xs uppercase px-2.5 py-0.5 rounded-full">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                className="flex-shrink-0 text-[#CBD5E1] dark:text-[#1D3A58] hover:text-red-500 transition-colors mt-0.5"
                aria-label="Delete alert"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-5">
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold mb-4">
          {alerts.length === 0 ? 'Create Your First Alert' : 'Add New Alert'}
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest mb-2 font-condensed font-semibold">Location</p>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-[#F1F5F9] dark:bg-[#000000] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3 text-[#0F172A] dark:text-[#FFFFFC] focus:outline-none focus:border-[#FF4500] transition-colors text-base cursor-pointer"
            >
              {ACTIVE_LOCATIONS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest mb-2 font-condensed font-semibold">Distances</p>
            <div className="flex flex-wrap gap-2">
              {DISTANCES.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDist(d)}
                  className={`px-3.5 py-1.5 rounded-full font-condensed font-semibold text-xs uppercase tracking-wide transition-all border ${
                    selectedDistances.includes(d)
                      ? 'bg-[#FF4500] border-[#FF4500] text-white'
                      : 'bg-[#F1F5F9] dark:bg-[#000000] border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-[#FF4500] hover:text-[#FF4500]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving || selectedDistances.length === 0}
            className="w-full bg-[#FF4500] text-white py-3.5 rounded-xl font-condensed font-bold text-base uppercase tracking-wide hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]"
          >
            {saving ? 'Creating…' : 'Create Alert →'}
          </button>
        </form>
      </div>

      <p className="text-center text-[#64748B] dark:text-[#7A8EA6] text-xs py-6 px-4 leading-relaxed">
        Alerts trigger when you search that location and new matching races are found.
      </p>
    </div>
  )
}
