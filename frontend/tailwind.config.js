/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All values driven by CSS variables — auto-switch between dark/light
        'app-bg':      'var(--app-bg)',
        'surface':     'var(--surface)',
        'border-line': 'var(--border-line)',
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent-purple':  'var(--accent-purple)',
        'accent-pink':    'var(--accent-pink)',
        'active-bg':   'var(--active-bg)',
        'active-text': 'var(--active-text)',
      },
    },
  },
  plugins: [],
}
