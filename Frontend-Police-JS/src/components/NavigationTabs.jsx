import { BarChart3, CheckCircle, Home, Map } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const NavigationTabs = ({ activeTab }) => {
  const location = useLocation()
  const current = activeTab || location.pathname.replace('/', '') || 'dashboard'

  const tabClass = (tab) =>
    `py-2 px-1 border-b-2 font-medium text-sm ${
      current === tab ? 'tab-active' : 'tab-inactive'
    }`

  return (
    <div className="mb-4">
      <nav className="flex space-x-6">
        <Link to="/dashboard" className={tabClass('dashboard')}>
          <Home className="h-4 w-4 inline mr-2" />
          Dashboard
        </Link>
        <Link to="/map" className={tabClass('map')}>
          <Map className="h-4 w-4 inline mr-2" />
          Live Map
        </Link>
        <Link to="/analytics" className={tabClass('analytics')}>
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Analytics
        </Link>
        <Link to="/resolved-cases" className={tabClass('resolved-cases')}>
          <CheckCircle className="h-4 w-4 inline mr-2" />
          Resolved Cases
        </Link>
      </nav>
    </div>
  )
}

export default NavigationTabs
