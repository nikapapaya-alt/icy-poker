/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        felt: {
          700: '#17604d',
          800: '#0f4a3b',
          900: '#0a3328',
        },
        gold: {
          300: '#f5dd9a',
          400: '#e8c06a',
          500: '#c9a04a',
        },
      },
      keyframes: {
        'deal-in': {
          from: { opacity: '0', transform: 'translateY(-28px) scale(0.85) rotate(-8deg)' },
          to: { opacity: '1', transform: 'none' },
        },
        'chip-in': {
          from: { opacity: '0', transform: 'scale(0.3) translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'seat-in': {
          from: { opacity: '0', transform: 'translate(-50%, -40%) scale(0.92)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'winner-glow': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(232,192,106,0.9), 0 0 18px rgba(232,192,106,0.45)' },
          '50%': { boxShadow: '0 0 0 2px rgba(232,192,106,0.4), 0 0 30px rgba(232,192,106,0.8)' },
        },
        'turn-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(110,231,183,0.9)' },
          '50%': { boxShadow: '0 0 0 5px rgba(110,231,183,0.25)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'balance-flash': {
          '0%': { color: '#6ee7b7', transform: 'scale(1.06)' },
          '100%': { color: 'inherit', transform: 'scale(1)' },
        },
        'scan-line': {
          '0%, 100%': { top: '0%' },
          '50%': { top: '100%' },
        },
      },
      animation: {
        'deal-in': 'deal-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'chip-in': 'chip-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'seat-in': 'seat-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'winner-glow': 'winner-glow 1.4s ease-in-out infinite',
        'turn-pulse': 'turn-pulse 1.2s ease-in-out infinite',
        'modal-in': 'modal-in 0.22s ease-out both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'balance-flash': 'balance-flash 0.8s ease-out both',
        'scan-line': 'scan-line 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
