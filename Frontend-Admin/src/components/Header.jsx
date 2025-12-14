import { useLocation } from 'react-router-dom'
import { ROUTES } from '../constants'

/**
 * Header Component
 * 
 * Top header bar for the main content area
 */
export default function Header() {
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname
    if (path === ROUTES.DASHBOARD || path === '/') return 'Dashboard'
    if (path === ROUTES.POLICE_ACCOUNTS) return 'Police Account Management'
    if (path === ROUTES.MANUAL_REPORT) return 'Manual Report Insertion'
    if (path === ROUTES.PROFILE) return 'Profile & Settings'
    return 'CRASH Admin'
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/10">
      <div className="px-6 lg:px-8 py-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Administrative Control Panel</p>
        </div>
      </div>
    </header>
  )
}
