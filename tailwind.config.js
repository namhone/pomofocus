/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      colors: {
        brand: {
          pomodoro: '#FF5A5F',
          shortBreak: '#10B981',
          longBreak: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
