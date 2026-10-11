/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        samvaad: {
          bg: '#FAF7F2',
          sand: '#F5F0E8',
          surface: '#FFFFFF',
          navy: '#191C3B',
          'navy-dark': '#101226',
          'navy-light': '#252952',
          gold: '#C59A58',
          'gold-light': '#FDF8EE',
          'gold-border': '#EAD9BE',
          border: '#E8E2D5',
          'border-light': '#F0EBE1',
          text: '#191C3B',
          subtext: '#686578',
          muted: '#9E9AA8',
          green: '#10B981',
          saffron: '#E65100',
        },
        viora: {
          bg: '#FAF7F2',
          surface: '#FFFFFF',
          secondary: '#F5F0E8',
          lavender: '#191C3B',
          purple: '#191C3B',
          'light-lavender': '#FDF8EE',
          text: '#191C3B',
          subtext: '#686578',
          border: '#E8E2D5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', '-apple-system', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'Inter', 'sans-serif'],
        serif: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
}
