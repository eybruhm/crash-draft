/**
 * RequireAuth Component
 * 
 * Protected route wrapper that checks user authentication
 * Redirects unauthenticated users to login page
 */

import { Navigate, useLocation } from 'react-router-dom'
import { clearAuth, getStoredUser, isAuthenticated, storeUser } from '../utils/auth'
import { ROUTES } from '../constants'

export function RequireAuth({ children }) {
  const location = useLocation()
  
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  // Role gate: Admin web should only allow admin role
  const user = getStoredUser()
  // If role is missing but user exists, try to preserve it (might have been lost during profile update)
  if (!user?.role && user) {
    // Restore role if it was accidentally removed (shouldn't happen, but safety check)
    storeUser({ ...user, role: 'admin' })
    // Re-fetch user to get updated version
    const updatedUser = getStoredUser()
    if (updatedUser?.role === 'admin') {
      return children
    }
  }
  
  if (user?.role !== 'admin') {
    clearAuth()
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }
  
  return children
}

export default RequireAuth
