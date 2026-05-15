'use client'

interface ToastProps {
  message: string | null
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null
  return (
    <div className="absolute -top-9 right-0 z-10 bg-[#0F172A] dark:bg-[#FFFFFC] text-[#FFFFFC] dark:text-[#0F172A] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-slide-up pointer-events-none">
      {message}
    </div>
  )
}
