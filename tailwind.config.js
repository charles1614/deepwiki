/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        vercel: {
          // Background colors (Light Mode)
          bg: '#ffffff',
          'bg-subtle': '#fafafa',
          'bg-light': '#f5f5f5',
          'bg-lighter': '#eaeaea',
          // Text colors (Light Mode)
          black: '#000000',
          'text-primary': '#000000',
          'text-secondary': '#666666', // Darkened from #444 for better contrast
          'text-tertiary': '#888888', // Darkened from #666
          // Border colors
          'border-subtle': '#eaeaea',
          'border-light': '#eaeaea',
          'border-medium': '#d4d4d4', // Standard border
          'border-strong': '#a3a3a3', // Darker border for hover/active
          // Dark mode (kept for reference/toggle if needed)
          'dark-bg': '#000000',
          'dark-gray': '#111111',
        },
        // Override blue to use black/gray for Vercel aesthetic
        blue: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eaeaea',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

