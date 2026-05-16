'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface NotificationPayload {
  actor_name?: string
  race_name?: string
  race_slug?: string
  follow_id?: string
  actor_id?: string
}

interface Notification {
  id: string
  type: string
  payload: NotificationPayload
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [actioning, setActioning] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setAuthed(true)
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount)
      }
    })
  }, [])

  async function handleOpen() {
    if (open) { setOpen(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setOpen(true); return }

    setOpen(true)
    setLoading(true)

    const res = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(0)
    }
    setLoading(false)

    fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  }

  async function handleFollowAction(notification: Notification, action: 'accept' | 'decline') {
    const followId = notification.payload.follow_id
    if (!followId) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setActioning(prev => new Set(prev).add(notification.id))

    const res = await fetch(`/api/follows/${followId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action }),
    })

    if (res.ok) {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }
    setActioning(prev => { const s = new Set(prev); s.delete(notification.id); return s })
  }

  return (
    <div className="flex-1 flex flex-col items-center relative">
      <button
        onClick={handleOpen}
        className={`flex-1 w-full flex flex-col items-center gap-1 pt-3 pb-4 min-h-[60px] transition-colors ${
          open ? 'text-[#FF4500]' : 'text-[#64748B] dark:text-[#7A8EA6] hover:text-[#0F172A] dark:hover:text-[#FFFFFC]'
        }`}
        aria-label="Friend notifications"
      >
        <div className="relative">
          <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="font-condensed text-[10px] font-semibold uppercase tracking-widest">Friends</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="fixed bottom-[60px] left-0 right-0 z-50 bg-white dark:bg-[#12263A] border-t border-[#CBD5E1] dark:border-[#1D3A58] rounded-t-2xl max-h-[72vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#E2E8F0] dark:border-[#1D3A58] flex-shrink-0">
              <h2 className="font-condensed font-bold text-lg uppercase tracking-wide text-[#0F172A] dark:text-[#FFFFFC]">
                Friend Activity
              </h2>
              <button onClick={() => setOpen(false)} className="text-[#64748B] dark:text-[#7A8EA6] hover:text-[#0F172A] dark:hover:text-[#FFFFFC] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {!authed ? (
                <div className="py-12 px-4 text-center">
                  <p className="font-condensed text-lg font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">Sign in to see friend activity</p>
                  <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-5">Follow friends and get notified when they sign up for races.</p>
                  <Link href="/account" onClick={() => setOpen(false)} className="inline-block bg-[#FF4500] text-white px-6 py-2.5 rounded-xl font-condensed font-bold text-sm uppercase tracking-wide hover:bg-[#FF7F11] transition-colors">
                    Sign In →
                  </Link>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <p className="font-condensed text-lg font-semibold text-[#0F172A] dark:text-[#FFFFFC] mb-2">No notifications yet</p>
                  <p className="text-[#64748B] dark:text-[#7A8EA6] text-sm mb-5">
                    Follow friends from a race page to see when they sign up.
                  </p>
                  <Link href="/friends" onClick={() => setOpen(false)} className="inline-block text-[#FF4500] font-condensed font-bold text-sm uppercase tracking-wide">
                    Find Friends →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0] dark:divide-[#1D3A58]">
                  {notifications.map(n => {
                    const isRequest = n.type === 'follow_request'
                    const isAccepted = n.type === 'follow_accepted'
                    const isActioning = actioning.has(n.id)

                    if (isRequest) {
                      return (
                        <div key={n.id} className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#FF4500]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#FF4500] font-bold text-sm uppercase">
                                {n.payload.actor_name?.[0] ?? '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#0F172A] dark:text-[#FFFFFC] leading-snug mb-2">
                                <span className="font-semibold">{n.payload.actor_name}</span>
                                {' '}wants to follow you
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFollowAction(n, 'accept')}
                                  disabled={isActioning}
                                  className="px-4 py-1.5 bg-[#FF4500] text-white rounded-lg font-condensed font-bold text-xs uppercase tracking-wide hover:bg-[#FF7F11] transition-colors disabled:opacity-40"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleFollowAction(n, 'decline')}
                                  disabled={isActioning}
                                  className="px-4 py-1.5 border border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] rounded-lg font-condensed font-bold text-xs uppercase tracking-wide hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                            <span className="text-xs text-[#64748B] dark:text-[#7A8EA6] flex-shrink-0">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                      )
                    }

                    const content = isAccepted
                      ? <><span className="font-semibold">{n.payload.actor_name}</span> accepted your follow request</>
                      : <><span className="font-semibold">{n.payload.actor_name}</span>{' '}is going to{' '}<span className="font-semibold">{n.payload.race_name}</span></>

                    const inner = (
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-9 h-9 rounded-full bg-[#FF4500]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#FF4500] font-bold text-sm uppercase">
                            {n.payload.actor_name?.[0] ?? '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#0F172A] dark:text-[#FFFFFC] leading-snug">{content}</p>
                          <p className="text-xs text-[#64748B] dark:text-[#7A8EA6] mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[#FF4500] flex-shrink-0" />}
                      </div>
                    )

                    return n.payload.race_slug ? (
                      <Link key={n.id} href={`/race/${n.payload.race_slug}`} onClick={() => setOpen(false)} className="block hover:bg-[#F8FAFC] dark:hover:bg-[#0A1929] transition-colors">
                        {inner}
                      </Link>
                    ) : (
                      <div key={n.id}>{inner}</div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1D3A58] flex-shrink-0">
              <Link href="/friends" onClick={() => setOpen(false)} className="text-sm text-[#FF4500] font-condensed font-bold uppercase tracking-wide hover:text-[#FF7F11] transition-colors">
                Manage Friends →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
