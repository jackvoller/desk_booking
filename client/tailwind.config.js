/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        available: '#10B981',
        booked: '#ef4444',
        sfSeaside: '#007ab7',
        sfIndigo: '#04588c',
        sfIce: '#13c5e2',
        sfSmoke: '#eaeef1',
        sfPepper: '#0d0e20'
      }
    }
  },
  plugins: []
};
