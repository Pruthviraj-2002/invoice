/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1B2CC1',
        secondary: '#6E00FF',
        accent: '#00E0FF',
        background: '#F4F6FF',
        surface: '#FFFFFF',
        text: '#0A0A23',
        muted: '#4B4B63',
        dark: '#0D0B2E',
      }
    },
  },
  plugins: [],
}