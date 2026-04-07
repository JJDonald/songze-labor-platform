/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#2D6A4F',
          'green-light': '#52B788',
          'green-pale': '#D8F3DC',
          orange: '#E76F51',
          'orange-light': '#F4A261',
          'orange-pale': '#FFF0E6',
          yellow: '#F4C542',
          'yellow-pale': '#FFF8E1',
          brown: '#6B4226',
          cream: '#FEFAE0',
          sand: '#F5EFD8',
        },
        text: {
          DEFAULT: '#2C2416',
          soft: '#6B5B45',
          muted: '#A08060',
        },
      },
      fontFamily: {
        display: ['"Ma Shan Zheng"', 'cursive'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        sm: '12px',
        DEFAULT: '20px',
        lg: '28px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(44,36,22,0.08)',
        DEFAULT: '0 4px 20px rgba(44,36,22,0.12)',
        lg: '0 8px 40px rgba(44,36,22,0.16)',
      },
    },
  },
  plugins: [],
}