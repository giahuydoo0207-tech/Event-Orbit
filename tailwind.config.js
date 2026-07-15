/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a2a4a',
          light: '#2d4a7a',
          dark: '#0e182b',
        },
        accent: {
          blue: '#3b82f6',
          hover: '#2563eb',
        },
        surface: '#f8f9fa',
        text: {
          primary: '#1a1a1a',
          secondary: '#6b7280',
        },
        success: '#10b981',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
