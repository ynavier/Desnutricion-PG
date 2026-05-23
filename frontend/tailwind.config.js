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
          blue:      '#81D4EA',
          'blue-md': '#4FB4D2',
          teal:      '#6FCF97',
          'blue-lt': '#EAF6FB',
          accent:    '#81D4EA',
        },
        status: {
          adequate:  '#52C41A',
          risk:      '#FFE082',
          mild:      '#FB8C00',
          moderate:  '#E53935',
          severe:    '#B71C1C',
        },
        neutral: {
          text:    '#1E293B',
          sub:     '#64748B',
          border:  '#D9EEF5',
          card:    '#FFFFFF',
          bg:      '#F5FAFC',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
