const black = '#000000';
const white = '#ffffff';
const orange = '#FF5600';

const neutral = {
  50: white,
  100: 'rgb(0 0 0 / 0.04)',
  200: 'rgb(0 0 0 / 0.12)',
  300: 'rgb(0 0 0 / 0.20)',
  400: 'rgb(0 0 0 / 0.38)',
  500: 'rgb(0 0 0 / 0.58)',
  600: 'rgb(0 0 0 / 0.72)',
  700: 'rgb(0 0 0 / 0.84)',
  800: black,
  900: black,
  950: black,
};

const accent = {
  50: 'rgb(255 86 0 / 0.08)',
  100: 'rgb(255 86 0 / 0.12)',
  200: 'rgb(255 86 0 / 0.24)',
  300: 'rgb(255 86 0 / 0.40)',
  400: orange,
  500: orange,
  600: orange,
  700: orange,
  800: orange,
  900: black,
  950: black,
};

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
          black,
          white,
          orange,
        },
        slate: neutral,
        gray: neutral,
        zinc: neutral,
        neutral,
        stone: neutral,
        orange: accent,
        amber: accent,
        emerald: accent,
        green: accent,
        sky: accent,
        blue: accent,
        indigo: accent,
        rose: accent,
        red: accent,
        yellow: accent,
        purple: accent,
      },
    },
  },
  plugins: [],
}
