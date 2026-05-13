'use client'

import { useEffect, useState } from 'react'

const MESSAGES = [
  'Scanning race calendars…',
  'Checking official event sites…',
  'Finding upcoming events…',
  'Verifying registration links…',
  'Sourcing real race data…',
  'Almost there…',
]

export default function SearchingState({ location }: { location: string }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      {/* Track + runner animation */}
      <div className="relative w-40 h-40">
        {/* Outer track ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-[#E2E8F0] dark:border-[#1D3A58]" />
        {/* Inner track ring */}
        <div className="absolute inset-[14px] rounded-full border-[3px] border-[#E2E8F0]/60 dark:border-[#1D3A58]/60" />

        {/* Spinning dot — positioned at top of outer ring */}
        <div
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '1.7s', animationTimingFunction: 'linear' }}
        >
          {/* Dot sits exactly on the outer ring: offset = half size minus half dot */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#FF4500] rounded-full shadow-[0_0_12px_3px_rgba(255,69,0,0.55)]" />
        </div>

        {/* Orange arc trail — static quarter-circle visual hint */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80" cy="80" r="78"
            fill="none"
            stroke="#FF4500"
            strokeWidth="3"
            strokeDasharray="60 1000"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>

        {/* Running person icon in centre */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-12 h-12 text-[#FF4500]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />
          </svg>
        </div>
      </div>

      {/* Text block */}
      <div className="text-center space-y-2 px-6">
        <p className="font-condensed text-2xl font-bold uppercase tracking-wide text-[#0F172A] dark:text-[#FFFFFC]">
          Finding races in {location}
        </p>
        <p
          key={msgIndex}
          className="text-[#64748B] dark:text-[#7A8EA6] text-sm animate-fade-slide-up"
        >
          {MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  )
}
