/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#080c17',
        surface: '#0e1424',
        card: '#131928',
        'card-hover': '#171f30',
        border: 'rgba(255,255,255,0.06)',
        'border-med': 'rgba(255,255,255,0.1)',
        'border-strong': 'rgba(255,255,255,0.16)',
        text: '#dde4f0',
        'text-muted': '#6b7a99',
        'text-dim': '#3d4a62',
        cyan: '#22d3ee',
        amber: '#f59e0b',
        green: '#34d399',
        red: '#f87171',
        purple: '#c084fc',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
