'use client'

import { useState, useRef, useEffect } from 'react'
import Toast from '@/components/Toast'

interface ShareButtonProps {
  url: string
  raceName: string
}

export default function ShareButton({ url, raceName }: ShareButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(url) } catch {}
    showToast('Link copied!')
    setPopoverOpen(false)
  }

  async function handleClick() {
    // Native share sheet on mobile
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: raceName, text: `Join me at ${raceName} 🏃`, url })
      } catch {} // user dismissed
      return
    }
    // Desktop: toggle popover
    setPopoverOpen(p => !p)
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`Join me at ${raceName} 🏃 ${url}`)}`
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm going to ${raceName} 🏃`)}&url=${encodeURIComponent(url)}`

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        onClick={handleClick}
        aria-label="Share race"
        className="w-10 h-[44px] flex items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-[#1D3A58] text-[#64748B] dark:text-[#7A8EA6] hover:border-[#FF4500] hover:text-[#FF4500] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {/* Desktop popover */}
      {popoverOpen && (
        <div className="absolute bottom-12 right-0 z-30 w-52 bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl shadow-xl overflow-hidden">
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#0F172A] dark:text-[#FFFFFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1D3A58] transition-colors text-left"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy link
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPopoverOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#0F172A] dark:text-[#FFFFFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1D3A58] transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a7.56 7.56 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.399 5.61L0 24l6.545-1.382A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.376l-.36-.214-3.732.979.996-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
            </svg>
            WhatsApp
          </a>
          <a
            href={twUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPopoverOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#0F172A] dark:text-[#FFFFFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1D3A58] transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.848L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter / X
          </a>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
