import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme (Kingsman Cyberpunk)
        dark: {
          bg: '#0A0B0F',
          surface: 'rgba(18, 20, 28, 0.78)',
          primary: '#C9A962',
          text: '#E8E4DF',
          muted: '#6B6B7D',
          border: '#2A2D3A',
        },
        // Light theme
        light: {
          bg: '#F6F5F2',
          surface: '#FFFFFF',
          primary: '#2563EB',
          text: '#1A1814',
          muted: '#8B8B8B',
          border: '#E5E3E0',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-in-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      opacity: {
        12: '0.12',
        35: '0.35',
        78: '0.78',
      },
    },
  },
  plugins: [],
} satisfies Config
