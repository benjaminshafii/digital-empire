/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F5F2ED',
          warm: '#F5F2ED',
          cool: '#E6F2EF',
        },
        ink: {
          DEFAULT: '#050505',
          light: '#333333',
          muted: '#666666',
        },
        accent: {
          DEFAULT: '#4ade80',
          muted: '#22c55e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Libre Baskerville', 'Georgia', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#050505',
            '--tw-prose-headings': '#050505',
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
