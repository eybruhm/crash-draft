import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Settings, LayoutDashboard, Users, FileText, X, Menu } from 'lucide-react'
import { useState } from 'react'
import { ROUTES } from '../constants'
import { getStoredUser, clearAuth } from '../utils/auth'
import { useSidebar } from '../contexts/SidebarContext'
import logoV1 from '../assets/logo/logo-v1.png'

/**
 * Sidebar Component
 * 
 * Left sidebar navigation with:
 * - Logo and branding
 * - Navigation menu
 * - Profile section
 * - Logout functionality
 * - Mobile responsive with toggle
 * - Collapsible sidebar (desktop only)
 */
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isCollapsed, toggleSidebar } = useSidebar()
  const user = getStoredUser()

  function handleLogout() {
    clearAuth()
    navigate(ROUTES.LOGIN)
  }

  const navLinks = [
    { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { to: ROUTES.POLICE_ACCOUNTS, label: 'Police Accounts', icon: Users },
    { to: ROUTES.MANUAL_REPORT, label: 'Manual Report', icon: FileText },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          ${isCollapsed ? 'w-20' : 'w-64 lg:w-72'}
          h-screen
          bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95
          backdrop-blur-xl border-r border-white/10
          transform transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          shadow-2xl
        `}
      >
        {/* Header with Logo - Fixed at Top */}
        <div className={`flex-shrink-0 border-b border-white/10 bg-gradient-to-r from-slate-900/50 to-slate-800/30 ${isCollapsed ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className={`flex items-center gap-3 group transition-all duration-200 ${isCollapsed ? 'w-full justify-center' : 'w-full lg:w-auto'}`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/20 group-hover:scale-105 group-hover:shadow-blue-500/30 transition-all duration-200 flex-shrink-0 overflow-hidden">
                {/* Logo: swap this import if you want a different version */}
                <img src={logoV1} alt="CRASH" className="w-full h-full object-cover" />
              </div>
              {!isCollapsed && (
                <div className="hidden lg:block overflow-hidden flex-1">
                  <h1 className="text-xl font-bold text-white tracking-tight whitespace-nowrap">CRASH Admin</h1>
                  {/* <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Law Enforcement System</p> */}
                </div>
              )}
            </button>
            {!isCollapsed && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Menu - Scrollable Middle Section */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 min-h-0">
          {!isCollapsed && (
            <div className="mb-4 hidden lg:block">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2 whitespace-nowrap">Navigation</p>
            </div>
          )}
          <div className="space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg
                    text-sm font-semibold transition-all duration-200
                    ${isCollapsed ? 'lg:px-3' : ''}
                    ${
                      active
                        ? 'bg-gradient-to-r from-blue-600/50 to-blue-500/40 text-white shadow-lg shadow-blue-500/25 border border-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 hover:border-white/10 border border-transparent'
                    }
                  `}
                  title={isCollapsed ? label : ''}
                >
                  <Icon size={18} className={active ? 'text-blue-300 flex-shrink-0' : 'flex-shrink-0'} />
                  {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Profile Section - Fixed at Bottom */}
        <div className="flex-shrink-0 p-4 pt-3 border-t-2 border-white/20 bg-slate-900/40 backdrop-blur-sm">
          {!isCollapsed && (
            <div className="mb-3 hidden lg:block">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2 whitespace-nowrap">Account</p>
            </div>
          )}
          <div className="space-y-2">
            <Link
              to={ROUTES.PROFILE}
              onClick={() => setMobileMenuOpen(false)}
              className={`
                flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl
                text-sm font-medium transition-all duration-200
                ${isCollapsed ? 'lg:px-3' : ''}
                ${
                  isActive(ROUTES.PROFILE)
                    ? 'bg-gradient-to-r from-blue-600/40 to-blue-500/30 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }
              `}
              title={isCollapsed ? 'Profile' : ''}
            >
              <Settings size={18} className={isActive(ROUTES.PROFILE) ? 'text-blue-300 flex-shrink-0' : 'flex-shrink-0'} />
              {!isCollapsed && <span className="whitespace-nowrap">Profile</span>}
            </Link>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-red-500/20 transition-all duration-200 border border-transparent hover:border-red-500/30 ${isCollapsed ? 'lg:px-3' : ''}`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
            </button>
          </div>
          {user && !isCollapsed && (
            <div className="mt-3 pt-3 border-t border-white/10 hidden lg:block">
              <p className="text-xs text-slate-400 px-4 mb-1 whitespace-nowrap">Logged in as</p>
              <p className="text-sm font-medium text-white px-4 truncate">{user.email || user.username}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl text-white shadow-lg hover:bg-slate-800/90 transition-colors"
      >
        <Menu size={20} />
      </button>
    </>
  )
}
