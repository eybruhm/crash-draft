import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PageHeader = ({ onLogout }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      logout()
      navigate('/login')
    }
  }

  return (
    <header className="bg-gradient-primary/95 backdrop-blur-md shadow-lg border-b border-white/30 fixed top-0 left-0 right-0 z-50 w-full">
      <div className="w-full max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-xl ring-2 ring-white/50 hover:scale-105 transition-transform">
              <span className="text-primary-600 text-lg font-bold">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white drop-shadow-md">CRASH</h1>
              <p className="text-xs text-white/70">Crime Response & Alert System Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{user?.office_name || `${user?.first_name} ${user?.last_name}`}</p>
                <p className="text-xs text-white/70">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-red-500/20 rounded-lg transition-all border border-white/20"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default PageHeader
