import { Link, useNavigate } from 'react-router-dom'
import { Ghost, LogOut, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-white hover:text-ghost-300 transition-colors">
          <Ghost className="w-5 h-5 text-ghost-400" />
          <span className="font-bold">Meeting Ghost</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/meetings/new" className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
            <Plus className="w-4 h-4" /> New
          </Link>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-7 h-7 bg-ghost-900 border border-ghost-700 rounded-full flex items-center justify-center text-ghost-300 text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="hidden sm:block">{user?.name?.split(' ')[0]}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
