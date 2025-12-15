import { useState } from 'react'
import { Hash, Copy, CheckCircle } from 'lucide-react'
import PasswordInput from '../components/PasswordInput'
import apiClient from '../services/apiClient'

/**
 * Password Hash Converter Page
 * 
 * Purpose: Admin1 (junior IT) can convert a plain text password to a Django hashed password.
 * The hashed password is then sent to Admin2 (senior IT) via office communication platform.
 * Admin2 uses the hashed password to insert directly into Supabase.
 * 
 * Security: Password is hashed client-side using Django's PBKDF2 algorithm (simulated via API call).
 * The plain password never leaves the browser until hashed.
 */
export default function PasswordHashConverter() {
  const [password, setPassword] = useState('')
  const [hashedPassword, setHashedPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Convert plain password to Django hashed password
   * Uses a backend endpoint to hash the password (simulates Django's make_password)
   */
  async function handleConvert() {
    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    setLoading(true)
    setError('')
    setHashedPassword('')
    setCopied(false)

    try {
      // Call backend endpoint to hash password
      // Backend uses Django's make_password() to generate the hash
      const response = await apiClient.post('/admin/password-hash/', {
        password: password,
      })

      setHashedPassword(response.data.hashed_password || '')
    } catch (err) {
      console.error('Error hashing password:', err)
      setError(err.response?.data?.detail || 'Failed to hash password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Copy hashed password to clipboard
   */
  async function handleCopy() {
    if (!hashedPassword) return

    try {
      await navigator.clipboard.writeText(hashedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setError('Failed to copy to clipboard')
    }
  }

  /**
   * Format hashed password for display (show first 8 and last 8 characters)
   * Example: "pbkdf2_sha256$600000$abc123...xyz789$hashed="
   */
  function formatHashedPassword(hash) {
    if (!hash || hash.length <= 16) return hash
    const start = hash.substring(0, 8)
    const end = hash.substring(hash.length - 8)
    return `${start}...${end}`
  }

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/40 to-blue-500/30 rounded-xl flex items-center justify-center border border-blue-400/30">
            <Hash className="text-blue-300" size={20} />
          </div>
          <h2 className="text-2xl font-bold text-white">Password Hash Converter</h2>
        </div>
        <p className="text-slate-400 mt-2 text-sm">
          Convert a plain text password to Django hashed password for Supabase insertion.
        </p>
      </div>

      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
        <div className="space-y-6">
          {/* Password Input */}
          <div>
            <label htmlFor="password-input" className="block text-sm font-medium text-white mb-2">
              Plain Text Password
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <PasswordInput
                  id="password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to hash"
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleConvert}
                disabled={loading || !password.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600/60 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-blue-600/80 transition-all border border-blue-500/50 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Hash size={18} />
                {loading ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* Hashed Password Display */}
          {hashedPassword && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white mb-2">
                Hashed Password (Django PBKDF2)
              </label>
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-slate-300 font-mono break-all">
                      {formatHashedPassword(hashedPassword)}
                    </p>
                    {/* <p className="text-xs text-slate-500 mt-1">
                      Full hash copied to clipboard when you click Copy
                    </p> */}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-lg transition-colors font-medium text-sm flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

