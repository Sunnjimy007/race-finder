'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  prompt?: string
}

type Screen = 'form' | 'confirm-email' | 'signed-in'

export default function AuthModal({ isOpen, onClose, onSuccess, prompt }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('form')

  if (!isOpen) return null

  const reset = (nextTab: 'signin' | 'signup') => {
    setTab(nextTab)
    setError(null)
    setScreen('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (tab === 'signin') {
        const err = await signIn(email, password)
        if (err) {
          if (err.toLowerCase().includes('invalid login credentials')) {
            setError("No account found with those details. Try Create Account, or check your password.")
          } else if (err.toLowerCase().includes('email not confirmed')) {
            setError("Please confirm your email first — check your inbox for a verification link.")
          } else {
            setError(err)
          }
        } else {
          // Show personalised welcome then close
          setScreen('signed-in')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1800)
        }
      } else {
        const { error: err, needsConfirmation } = await signUp(email, password)
        if (err) {
          if (err.toLowerCase().includes('already registered')) {
            setError("An account with this email already exists. Try signing in instead.")
            reset('signin')
          } else {
            setError(err)
          }
        } else if (needsConfirmation) {
          setScreen('confirm-email')
        } else {
          // Email confirmation disabled — sign straight in
          setScreen('signed-in')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 1800)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — check your connection and try again.')
    }

    setLoading(false)
  }

  const displayName = email.split('@')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-2xl p-6 shadow-2xl">

        {/* Close — always visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748B] dark:text-[#7A8EA6] hover:text-[#0F172A] dark:hover:text-[#FFFFFC] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Check your inbox ── */}
        {screen === 'confirm-email' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 bg-[#FF4500]/10 dark:bg-[#FF4500]/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="font-condensed font-bold text-2xl text-[#0F172A] dark:text-[#FFFFFC] mb-2">
              Check your inbox
            </h2>
            <p className="text-sm text-[#64748B] dark:text-[#7A8EA6] mb-1 leading-relaxed">
              We sent a confirmation link to
            </p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-4 break-all">
              {email}
            </p>
            <p className="text-sm text-[#64748B] dark:text-[#7A8EA6] leading-relaxed mb-6">
              Click the link in that email to activate your account, then come back here to sign in.
            </p>
            <button
              onClick={() => reset('signin')}
              className="w-full bg-[#FF4500] text-white py-3.5 rounded-xl font-condensed font-bold text-lg uppercase tracking-wide hover:bg-[#FF7F11] transition-colors"
            >
              Back to Sign In →
            </button>
          </div>
        )}

        {/* ── Welcome / signed-in confirmation ── */}
        {screen === 'signed-in' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 bg-[#00C96B]/10 dark:bg-[#00C96B]/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-[#00C96B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="font-condensed font-bold text-2xl text-[#0F172A] dark:text-[#FFFFFC] mb-2">
              Welcome back, {displayName}!
            </h2>
            <p className="text-sm text-[#64748B] dark:text-[#7A8EA6]">
              You&apos;re now signed in.
            </p>
          </div>
        )}

        {/* ── Sign in / Create account form ── */}
        {screen === 'form' && (
          <>
            {prompt && (
              <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-4 pr-6">{prompt}</p>
            )}

            {/* Tabs */}
            <div className="flex rounded-xl bg-[#F1F5F9] dark:bg-[#000000] p-1 mb-5">
              {(['signin', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => reset(t)}
                  className={`flex-1 py-2 rounded-lg font-condensed font-semibold text-sm uppercase tracking-wide transition-all ${
                    tab === t
                      ? 'bg-white dark:bg-[#12263A] text-[#0F172A] dark:text-[#FFFFFC] shadow-sm'
                      : 'text-[#64748B] dark:text-[#7A8EA6]'
                  }`}
                >
                  {t === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#64748B] dark:text-[#7A8EA6] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#F1F5F9] dark:bg-[#000000] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3 text-[#0F172A] dark:text-[#FFFFFC] placeholder-[#94A3B8] dark:placeholder-[#3D5A7A] focus:outline-none focus:border-[#FF4500] transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#64748B] dark:text-[#7A8EA6] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full bg-[#F1F5F9] dark:bg-[#000000] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl px-4 py-3 text-[#0F172A] dark:text-[#FFFFFC] placeholder-[#94A3B8] dark:placeholder-[#3D5A7A] focus:outline-none focus:border-[#FF4500] transition-colors text-sm"
                />
              </div>

              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF4500] text-white py-3.5 rounded-xl font-condensed font-bold text-lg uppercase tracking-wide hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors disabled:opacity-40 min-h-[52px]"
              >
                {loading ? '…' : tab === 'signin' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
