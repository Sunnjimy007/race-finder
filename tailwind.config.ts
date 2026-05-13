import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        card: '#12263A',
        border: '#1D3A58',
        orange: '#FF4500',
        'orange-warm': '#FF7F11',
        green: '#00C96B',
        'text-primary': '#FFFFFC',
        muted: '#7A8EA6',
      },
      fontFamily: {
        condensed: ['var(--font-barlow-condensed)', 'sans-serif'],
        body: ['var(--font-barlow)', 'sans-serif'],
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.45s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
