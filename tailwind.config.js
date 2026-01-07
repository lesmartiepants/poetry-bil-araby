/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'amiri': ['Amiri', 'serif'],
        'playfair': ['Playfair Display', 'serif'],
        'brand-en': ['Forum', 'serif'],
        'brand-ar': ['Reem Kufi', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
