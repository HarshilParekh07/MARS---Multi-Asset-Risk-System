/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bb: {
          dark: '#080c10',
          panel: '#0d131a',
          surface: '#141d27',
          border: '#1f2d3d',
          accent: '#ff9800', // Bloomberg Terminal Amber / Orange
          cyan: '#00e5ff',
          green: '#00e676',
          red: '#ff5252',
          yellow: '#ffd600',
          muted: '#8b9bb4',
          subtle: '#222f3e'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
