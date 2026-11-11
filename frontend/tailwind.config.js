/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { fontFamily: { sans: ['Cairo', 'sans-serif'] }, colors: { forest: { 50: '#edf7ef', 100: '#d9efdc', 500: '#32934d', 600: '#247b3d', 700: '#1b6031', 900: '#10261e' } }, boxShadow: { soft: '0 12px 34px rgba(15, 39, 29, .08)' } } },
  plugins: []
}
