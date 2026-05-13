'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill={filled ? 'currentColor' : 'none'}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function BellIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill={filled ? 'currentColor' : 'none'}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/', label: 'Search', Icon: SearchIcon },
  { href: '/saved', label: 'Saved', Icon: HeartIcon },
  { href: '/alerts', label: 'Alerts', Icon: BellIcon },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#12263A]/95 backdrop-blur-sm border-t border-[#CBD5E1] dark:border-[#1D3A58] z-50 safe-area-inset-bottom">
      <div className="max-w-2xl mx-auto flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-4 min-h-[60px] transition-colors ${
                active ? 'text-[#FF4500]' : 'text-[#64748B] dark:text-[#7A8EA6] hover:text-[#0F172A] dark:hover:text-[#FFFFFC]'
              }`}
            >
              <Icon className="w-5 h-5" filled={active} />
              <span className="font-condensed text-[10px] font-semibold uppercase tracking-widest">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
