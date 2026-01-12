/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'brand-discogs': '#333333',
        'brand-lastfm': '#d51007',
        'gray': {
          900: '#121212',
          800: '#181818',
          700: '#282828',
          600: '#3e3e3e',
          500: '#535353',
          400: '#b3b3b3',
          300: '#e0e0e0',
          200: '#f0f0f0',
          100: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

