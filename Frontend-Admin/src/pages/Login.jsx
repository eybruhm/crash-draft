import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { ROUTES } from '../constants'
import { storeRefreshToken, storeToken, storeUser } from '../utils/auth'
import { getErrorMessage } from '../utils/errors'
import PasswordInput from '../components/PasswordInput'
import logoV1 from '../assets/logo/logo-v1.png'

/**
 * Login Page Component
 * 
 * Handles admin authentication with email/username and password.
 * Upon successful login, stores user session and redirects to dashboard.
 * 
 * @returns {JSX.Element} Login form with authentication UI
 */
export default function Login() {
  const [email, setEmail] = useState('')
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
      const data = await api.loginAdmin({ email, password })
      if (data?.role !== 'admin') {
        throw new Error('This account is not an admin.')
      }

      // Store token + user (include role for RequireAuth gating)
      if (data?.access) {
        storeToken(data.access)
      }
      if (data?.refresh) {
        storeRefreshToken(data.refresh)
      }
      storeUser({ ...(data?.user || {}), role: data?.role })

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
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl border border-blue-500/40 shadow-xl shadow-blue-500/20 overflow-hidden">
              {/* Logo: swap file here if you want a different version */}
              <img src={logoV1} alt="CRASH" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">Crime Response & Alert System Hub</p>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-white mb-2.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass-input w-full"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white mb-2.5">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass-input w-full pr-12"
              placeholder="••••••••"
              autoComplete="current-password"
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
        </div>
      </div>
    </div>
  )
}
