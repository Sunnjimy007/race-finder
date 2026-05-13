import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Barlow } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import { AuthProvider } from '@/context/AuthContext'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RaceFinder — Discover Running Races in Asia',
  description: 'Find upcoming running events in Singapore, Southeast Asia, and APAC. Search 5K, 10K, half marathon, marathon, and ultra races by location and date. Powered by AI.',
  keywords: [
    'running races Singapore',
    'upcoming running events Singapore',
    'marathon Singapore 2025',
    'half marathon Singapore',
    '5K races Singapore',
    'running events Asia',
    'APAC running races',
    'race finder',
    'running event search',
    'Southeast Asia running',
    'trail running Asia',
    'fun run Singapore',
  ],
  authors: [{ name: 'RaceFinder' }],
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    title: 'RaceFinder — Discover Running Races in Asia',
    description: 'Find upcoming running events in Singapore, Southeast Asia, and APAC. Search by distance, location, and timeframe. Powered by AI.',
    siteName: 'RaceFinder',
    locale: 'en_SG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaceFinder — Discover Running Races in Asia',
    description: 'Find upcoming running events in Singapore, Southeast Asia, and APAC. Powered by AI.',
  },
}

export const viewport: Viewport = {
  themeColor: '#12263A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s?s==='dark':p!==false;document.documentElement.classList.toggle('dark',d);})();` }} />
      </head>
      <body className="bg-[#F1F5F9] dark:bg-[#000000] text-[#0F172A] dark:text-[#FFFFFC] font-body min-h-screen antialiased">
        <AuthProvider>
          <main className="max-w-2xl mx-auto pb-24">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
