import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Calendar, Lock, CheckCircle, AlertCircle, Edit, Save, X, LogOut } from 'lucide-react'
import { clearAuth, getStoredUser, storeUser } from '../utils/auth'
import { validatePassword, validateEmail } from '../utils/validation'
import { getErrorMessage } from '../utils/errors'
import { ROUTES } from '../constants'
import PasswordInput from '../components/PasswordInput'
import { api } from '../services/api'

/**
 * Profile & Settings Page Component
 * 
 * Displays admin profile information and allows password changes:
 * - Shows profile details (username, email, phone, account creation date)
 * - Inline password change form with validation
 * - Security information sidebar
 * 
 * @returns {JSX.Element} Admin profile management interface
 */
export default function Profile() {
  const navigate = useNavigate()
  const stored = getStoredUser()
  const [profile, setProfile] = useState(stored)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editForm, setEditForm] = useState({ username: '', email: '', contact: '' })

  // Fetch latest profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getAdminProfile()
        setProfile(data)
        // CRITICAL: Preserve role field when updating stored user data
        // The backend AdminSerializer doesn't return role, but RequireAuth needs it
        const currentUser = getStoredUser()
        storeUser({ ...data, role: currentUser?.role || 'admin' })
        setEditForm({
          username: data.username || '',
          email: data.email || '',
          contact: data.contact || data.contact_no || '',
        })
      } catch (err) {
        console.error('Failed to fetch profile:', err)
        // Keep using stored profile if fetch fails
        // Don't clear auth on profile fetch errors - let interceptor handle 401s
      }
    }
    
    if (stored) {
      fetchProfile()
    }
  }, [])

  useEffect(() => {
    if (profile) {
      setEditForm({
        username: profile.username || '',
        email: profile.email || '',
        contact: profile.contact || profile.contact_no || '',
      })
    }
  }, [profile])

  function updateEditForm(k, v) {
    setEditForm((s) => ({ ...s, [k]: v }))
  }

  async function handleSaveDetails() {
    setMsg({ type: '', text: '' })
    
    // Validate email if provided
    if (editForm.email && !validateEmail(editForm.email)) {
      setMsg({ type: 'error', text: 'Invalid email format.' })
      return
    }
    
    // Validate username if provided
    if (editForm.username && editForm.username.trim().length < 3) {
      setMsg({ type: 'error', text: 'Username must be at least 3 characters.' })
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        contact: editForm.contact.trim() || null,
      }
      
      const updated = await api.updateAdminProfile(payload)
      setProfile(updated)
      // CRITICAL: Preserve role field when updating stored user data
      // The backend AdminSerializer doesn't return role, but RequireAuth needs it
      const currentUser = getStoredUser()
      storeUser({ ...updated, role: currentUser?.role || 'admin' })
      setMsg({ type: 'success', text: 'Profile updated successfully!' })
      setEditingDetails(false)
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setMsg({ type: '', text: '' })
    
    if (!validatePassword(newPassword)) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    
    setSaving(true)
    try {
      await api.changePassword(newPassword)
      setMsg({ type: 'success', text: 'Password changed successfully!' })
      setNewPassword('')
      setChangingPassword(false)
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    clearAuth()
    navigate(ROUTES.LOGIN)
  }

  if (!profile) {
    return <div className="text-center py-8">Please login first</div>
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Card */}
        <div className="lg:col-span-2">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-8">
           
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/20">
              <div className="w-20 h-20 bg-blue-600/40 backdrop-blur-md border border-blue-500/60 rounded-lg flex items-center justify-center">
                <User className="text-blue-300" size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
                <p className="text-slate-400">Admin Account</p>
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Profile Details</h3>
                {!editingDetails ? (
                  <button
                    onClick={() => setEditingDetails(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors font-medium backdrop-blur-md border border-blue-500/60 text-sm"
                  >
                    <Edit size={16} />
                    Edit Details
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingDetails(false)
                        setEditForm({ username: profile.username || '', email: profile.email || '', contact: profile.contact || '' })
                        setMsg({ type: '', text: '' })
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium backdrop-blur-md border border-white/20 text-sm"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md border border-blue-500/60 text-sm"
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {!editingDetails ? (
                <>
                  <div className="flex items-start gap-4">
                    <User className="text-slate-500 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-slate-400">Username</p>
                      <p className="text-lg font-semibold text-white">{profile.username || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="text-slate-500 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-slate-400">Email Address</p>
                      <p className="text-lg font-semibold text-white">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Phone className="text-slate-500 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-slate-400">Contact Number</p>
                      <p className="text-lg font-semibold text-white">{profile.contact || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Calendar className="text-slate-500 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-slate-400">Account Created</p>
                      <p className="text-lg font-semibold text-white">
                        {profile.createdAt || profile.created_at 
                          ? new Date(profile.createdAt || profile.created_at).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Username</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => updateEditForm('username', e.target.value)}
                      className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 outline-none text-white placeholder-slate-400"
                      placeholder="Username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => updateEditForm('email', e.target.value)}
                      className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 outline-none text-white placeholder-slate-400"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Contact Number</label>
                    <input
                      type="tel"
                      value={editForm.contact}
                      onChange={(e) => updateEditForm('contact', e.target.value)}
                      className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 outline-none text-white placeholder-slate-400"
                      placeholder="+63 2 1234 5678"
                    />
                  </div>

                  {msg.text && (
                    <div className={`flex items-center gap-3 p-4 rounded-lg backdrop-blur-md border ${msg.type === 'success' ? 'bg-green-600/30 border-green-500/60' : 'bg-red-600/30 border-red-500/60'}`}>
                      {msg.type === 'success' ? (
                        <CheckCircle className="text-green-300" size={20} />
                      ) : (
                        <AlertCircle className="text-red-300" size={20} />
                      )}
                      <p className={`text-sm ${msg.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>{msg.text}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Change Password Section */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock size={20} /> Security
                </h3>
              </div>

              {!changingPassword ? (
                <button
                  onClick={() => {
                    setChangingPassword(true)
                    setMsg({ type: '', text: '' })
                  }}
                  className="px-4 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors font-medium backdrop-blur-md border border-blue-500/60"
                >
                  Change Password
                </button>
              ) : (
                <div className="space-y-4 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">New Password</label>
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 pr-12 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 outline-none text-white placeholder-slate-400"
                      autoComplete="new-password"
                    />
                  </div>

                  {msg.text && msg.text.includes('Password') && (
                    <div className={`flex items-center gap-3 p-4 rounded-lg backdrop-blur-md border ${msg.type === 'success' ? 'bg-green-600/30 border-green-500/60' : 'bg-red-600/30 border-red-500/60'}`}>
                      {msg.type === 'success' ? (
                        <CheckCircle className="text-green-300" size={20} />
                      ) : (
                        <AlertCircle className="text-red-300" size={20} />
                      )}
                      <p className={`text-sm ${msg.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>{msg.text}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md border border-blue-500/60"
                    >
                      {saving ? 'Saving...' : 'Save Password'}
                    </button>
                    <button
                      onClick={() => {
                        setChangingPassword(false)
                        setNewPassword('')
                        setMsg({ type: '', text: '' })
                      }}
                      className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium backdrop-blur-md border border-white/20"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button (5.4) */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/60 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-red-600/80 transition-all border border-red-500/50 shadow-lg hover:shadow-xl"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
