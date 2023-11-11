/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'hgpt-dark-gray': '#202123',
        'hgpt-medium-gray': '#343541',
        'hgpt-light-gray': '#444654',
        'hgpt-chat-gray': '#40414F',
        'hgpt-hover-white': '#dddddd',
      },
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
