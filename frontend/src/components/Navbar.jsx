import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Navbar({ showBack, onBack }) {
  const { dark, toggle } = useTheme()

  return (
    <nav className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mr-1"
            aria-label="Back"
          >
            ←
          </button>
        )}
        <span className="font-semibold text-zinc-900 dark:text-white tracking-tight">
          codebase<span className="neon-text">lens</span>
        </span>
      </div>

      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-neon-pink/50 hover:text-neon-pink transition-all"
        aria-label="Toggle theme"
      >
        {dark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </nav>
  )
}
