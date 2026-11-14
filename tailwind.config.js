/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      borderRadius: {
        none: '0px',
        sm: '2px',
      },
      fontFamily: {
        mono: ['Menlo', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
