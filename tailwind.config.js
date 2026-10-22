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
          pomodoro: '#FF5A5F',
          shortBreak: '#10B981',
          longBreak: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
