/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f0f0f5',
          100: '#e0e0eb',
          200: '#c2c2d6',
          300: '#9999b3',
          400: '#6b6b8a',
          500: '#4a4a66',
          600: '#2d2d44',
          700: '#1e1e32',
          800: '#151524',
          900: '#0d0d1a',
          950: '#08080f',
        },
        accent: {
          blue: '#6366f1',
          purple: '#a855f7',
          pink: '#ec4899',
          cyan: '#06b6d4',
          emerald: '#10b981',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
