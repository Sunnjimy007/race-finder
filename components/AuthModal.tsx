'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  // Message shown above the form, e.g. "Sign in to save this race"
  prompt?: string
}

export default function AuthModal({ isOpen, onClose, onSuccess, prompt }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (!isOpen) return null

  const reset = (nextTab: 'signin' | 'signup') => {
    setTab(nextTab)
    setError(null)
    setInfo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (tab === 'signin') {
        const err = await signIn(email, password)
        if (err) {
          setError(err)
        } else {
          onSuccess?.()
          onClose()
        }
      } else {
        const { error: err, needsConfirmation } = await signUp(email, password)
        if (err) {
          setError(err)
        } else if (needsConfirmation) {
          setInfo('Check your email to confirm your account, then sign in.')
          reset('signin')
        } else {
          onSuccess?.()
          onClose()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Check your connection and try again.')
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-2xl p-6 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748B] dark:text-[#7A8EA6] hover:text-[#0F172A] dark:hover:text-[#FFFFFC] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Prompt */}
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

          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          {info  && <p className="text-[#00C96B] text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4500] text-white py-3.5 rounded-xl font-condensed font-bold text-lg uppercase tracking-wide hover:bg-[#FF7F11] active:bg-[#e64000] transition-colors disabled:opacity-40 min-h-[52px]"
          >
            {loading ? '…' : tab === 'signin' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>
      </div>
    </div>
  )
}
