/**
 * RequireAuth Component
 * 
 * Protected route wrapper that checks user authentication
 * Redirects unauthenticated users to login page
 */

import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'
import { ROUTES } from '../constants'

export function RequireAuth({ children }) {
  const location = useLocation()
  
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }
  
  return children
}

export default RequireAuth
