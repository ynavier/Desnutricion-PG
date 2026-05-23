/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          blue:      '#0D47A1',
          'blue-md': '#1976D2',
          teal:      '#0097A7',
          'blue-lt': '#E3F2FD',
        },
        status: {
          adequate:  '#43A047',
          risk:      '#FBC02D',
          mild:      '#FB8C00',
          moderate:  '#E53935',
          severe:    '#B71C1C',
        },
        neutral: {
          text:    '#1A1F2B',
          sub:     '#54606E',
          border:  '#E0E6ED',
          card:    '#F7F9FC',
          bg:      '#FAFCFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
