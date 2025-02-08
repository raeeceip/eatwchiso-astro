/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        terminal: {
          black: '#2E3440',
          red: '#BF616A',
          green: '#A3BE8C',
          yellow: '#EBCB8B',
          blue: '#5E81AC',
          magenta: '#B48EAD',
          cyan: '#88C0D0',
          white: '#ECEFF4',
          brightBlack: '#4C566A',
          brightRed: '#BF616A',
          brightGreen: '#A3BE8C',
          brightYellow: '#EBCB8B',
          brightBlue: '#81A1C1',
          brightMagenta: '#B48EAD',
          brightCyan: '#8FBCBB',
          brightWhite: '#ECEFF4',
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        typing: 'typing 1.5s steps(30, end)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
