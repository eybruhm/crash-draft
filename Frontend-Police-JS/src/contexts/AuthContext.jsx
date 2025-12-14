/**
 * Authentication Context
 * 
 * Provides authentication state and functions throughout the app.
 * Now uses real JWT authentication with the Django backend.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { 
  login as apiLogin, 
  logout as apiLogout, 
  getCurrentUser, 
  isAuthenticated as checkAuth 
} from '../services/authService'

const AuthContext = createContext(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = () => {
      if (checkAuth()) {
        // User has valid tokens, load user data
        const userData = getCurrentUser()
        setUser(userData)
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  /**
   * Login function
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {string} role - User role ('police' or 'admin')
   * @returns {Promise<boolean>} True if login successful
   */
  const login = async (email, password, role = 'police') => {
    setLoading(true)
    setError(null)
    
    try {
      // Call real API login
      const result = await apiLogin(email, password, role)
      
      if (result.success) {
        setUser(result.user)
        return true
      }
      
      return false
      
    } catch (err) {
      // Set error message for display
      setError(err.message || 'Login failed')
      console.error('Login error:', err)
      return false
      
    } finally {
      setLoading(false)
    }
  }

  /**
   * Logout function
   * Clears user state and tokens
   */
  const logout = () => {
    apiLogout()
    setUser(null)
    setError(null)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      error,
      login,
      logout,
    }),
    [user, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
