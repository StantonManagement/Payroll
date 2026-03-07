import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Libre Baskerville', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: '#1a2744',
        'primary-light': '#2d3f5f',
        accent: '#8b7355',
        'accent-light': '#c4a77d',
        paper: '#fdfcfa',
        ink: '#1a1a1a',
        muted: '#6b7280',
        border: '#d1d5db',
        divider: '#e5e7eb',
        success: '#166534',
        error: '#991b1b',
        warning: '#92400e',
        'bg-section': '#f8f7f5',
        'bg-input': '#ffffff',
      },
    },
  },
  plugins: [],
}

export default config
