import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PoliceAccountManagement from './pages/PoliceAccountManagement'
import Profile from './pages/Profile'
import ManualReport from './pages/ManualReport'
import PasswordHashConverter from './pages/PasswordHashConverter'
import { ROUTES } from './constants'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'

/**
 * Main App Component
 * 
 * Handles:
 * - Main layout structure with sidebar
 * - Route definitions
 * - Conditional sidebar rendering
 * - Authentication guard
 */
export default function App() {
  return (
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  )
}

function AppContent() {
  const location = useLocation()
  const isLoginPage = location.pathname === ROUTES.LOGIN
  const { isCollapsed } = useSidebar()

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <Sidebar />
      <div 
        className={`flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64 xl:ml-72'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-6 pb-8 min-h-0">
          <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            
            <Route
              path={ROUTES.DASHBOARD}
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            
            <Route
              path={ROUTES.POLICE_ACCOUNTS}
              element={
                <RequireAuth>
                  <PoliceAccountManagement />
                </RequireAuth>
              }
            />
            
            <Route
              path={ROUTES.PROFILE}
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            
            <Route
              path={ROUTES.MANUAL_REPORT}
              element={
                <RequireAuth>
                  <ManualReport />
                </RequireAuth>
              }
            />
            
            <Route
              path={ROUTES.PASSWORD_HASH_CONVERTER}
              element={
                <RequireAuth>
                  <PasswordHashConverter />
                </RequireAuth>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
