/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        paper: '#ffffff',
        'paper-mint': '#E6F2EF',
        'paper-warm': '#F5F2ED',
        ink: '#1a1a1a',
        'ink-black': '#050505',
        'outer-bg': '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        pixel: ['VT323', 'monospace'],
      },
      letterSpacing: {
        'tight-headline': '-0.04em',
        'tight-subhead': '-0.03em',
        'tight-body': '-0.02em',
        'tight-industrial': '-0.05em',
      },
      lineHeight: {
        'headline': '0.85',
        'subhead': '1.1',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      },
    },
  },
  plugins: [],
}
