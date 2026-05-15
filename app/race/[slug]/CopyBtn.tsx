'use client'

import { useState } from 'react'

export default function CopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 text-xs font-condensed font-bold uppercase tracking-wide text-[#FF4500] hover:text-[#FF7F11] transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
