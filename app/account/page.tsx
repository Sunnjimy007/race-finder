'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'
import { useAuth } from '@/context/AuthContext'

interface Prefs {
  email_friend_going: boolean
  in_app_notifications: boolean
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#0F172A] dark:text-[#FFFFFC]">{label}</p>
        <p className="text-xs text-[#64748B] dark:text-[#7A8EA6] mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#FF4500]' : 'bg-[#CBD5E1] dark:bg-[#1D3A58]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>({ email_friend_going: true, in_app_notifications: true })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchPrefs = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/preferences', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) setPrefs(await res.json())
  }, [])

  useEffect(() => {
    if (user) fetchPrefs()
  }, [user, fetchPrefs])

  async function handleSave() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  if (!user) {
    return (
      <div className="px-4 pt-8">
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Account</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-12">Manage your profile and preferences</p>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-full flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-[#CBD5E1] dark:text-[#1D3A58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="font-condensed text-xl font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">Sign in to manage your account</p>
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
        <h1 className="font-condensed text-4xl font-bold uppercase text-[#0F172A] dark:text-[#FFFFFC] mb-1">Account</h1>
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm">{user.email}</p>
      </div>

      {/* Notification preferences */}
      <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-5 mb-6">
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold pt-4 pb-2">
          Notification Preferences
        </p>

        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1D3A58]">
          <Toggle
            label="Email me when friends sign up to a race"
            description="Receive an email when someone you follow marks themselves as going."
            checked={prefs.email_friend_going}
            onChange={v => updatePref('email_friend_going', v)}
          />
          <Toggle
            label="In-app notifications"
            description="Show a badge and notification when friends sign up for races."
            checked={prefs.in_app_notifications}
            onChange={v => updatePref('in_app_notifications', v)}
          />
        </div>

        <div className="py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#FF4500] text-white py-3 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors disabled:opacity-40"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl overflow-hidden mb-6">
        <p className="text-[#64748B] dark:text-[#7A8EA6] text-xs uppercase tracking-widest font-condensed font-semibold px-5 pt-4 pb-2">
          Quick Links
        </p>
        {[
          { href: '/alerts', label: 'Race Alerts', desc: 'Manage email alerts for new races' },
          { href: '/saved', label: 'Saved Races', desc: 'Your bookmarked events' },
          { href: '/friends', label: 'Friends', desc: 'Who you follow' },
        ].map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#1D3A58] hover:bg-[#F8FAFC] dark:hover:bg-[#0A1929] transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#FFFFFC]">{label}</p>
              <p className="text-xs text-[#64748B] dark:text-[#7A8EA6]">{desc}</p>
            </div>
            <svg className="w-4 h-4 text-[#CBD5E1] dark:text-[#1D3A58] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="w-full border border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] py-3 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:border-red-400 hover:text-red-500 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
