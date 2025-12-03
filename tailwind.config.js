/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        tvbg: '#131722',
        tvtext: '#d1d4dc',
        tvaccent: '#2962ff'
      }
    }
  },
  plugins: []
}
