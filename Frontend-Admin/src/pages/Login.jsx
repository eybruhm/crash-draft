import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { ROUTES } from '../constants'
import { storeUser } from '../utils/auth'
import { getErrorMessage } from '../utils/errors'

/**
 * Login Page Component
 * 
 * Handles admin authentication with email/username and password.
 * Upon successful login, stores user session and redirects to dashboard.
 * 
 * @returns {JSX.Element} Login form with authentication UI
 */
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const admin = await api.loginAdmin({ usernameOrEmail: username, password })
      storeUser(admin)
      const from = (location.state && location.state.from) || { pathname: ROUTES.DASHBOARD }
      navigate(from.pathname || ROUTES.DASHBOARD)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-elevated shadow-2xl shadow-black/40 p-8 lg:p-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center border border-blue-500/40 shadow-xl shadow-blue-500/20">
              <span className="text-white font-bold text-3xl">C</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CRASH Admin</h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">Law Enforcement Management System</p>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-white mb-2.5">
              Email or Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="glass-input w-full"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white mb-2.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass-input w-full"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-lg">
              <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-sm text-red-300 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={18} />
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-xs text-slate-500 text-center mb-4 font-medium">
            No signup available. Admin accounts are created via system administrator.
          </p>
          <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg">
            <p className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Demo Credentials</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Email:</span>
                <code className="font-mono bg-white/10 px-2.5 py-1 rounded text-blue-300 text-xs font-semibold">admin@example.com</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Password:</span>
                <code className="font-mono bg-white/10 px-2.5 py-1 rounded text-blue-300 text-xs font-semibold">password</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
