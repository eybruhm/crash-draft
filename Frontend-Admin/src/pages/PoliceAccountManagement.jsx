import { useEffect, useState } from 'react'
import { UserPlus, Edit3, Trash2, Save, X, MapPin, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '../services/api'
import { validateEmail, validatePassword, validateCoordinates } from '../utils/validation'
import { getErrorMessage } from '../utils/errors'
import { getStoredUser } from '../utils/auth'
import PasswordInput from '../components/PasswordInput'

/**
 * Police Account Management Page Component
 * 
 * Unified CRUD interface for police accounts:
 * - 3.1: List/Table of all police accounts (editable grid/table)
 * - 3.2: Add button that opens popup/form
 * - 3.3: Edit button per row that opens popup/form
 * - 3.4: Delete button per row
 * 
 * @returns {JSX.Element} Unified police account management interface
 */
export default function PoliceAccountManagement() {
  const [police, setPolice] = useState([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState('all') // 'all' | 'our'
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  
  const [addForm, setAddForm] = useState({ email: '', password: '', office_name: '', latitude: '', longitude: '', contact_number: '', head_officer: '' })
  const [editForm, setEditForm] = useState({ email: '', password: '', office_name: '', latitude: '', longitude: '', contact_number: '', head_officer: '' })

  function norm7(value) {
    const n = Number.parseFloat(value)
    if (!Number.isFinite(n)) return 0
    return Number(n.toFixed(7))
  }

  useEffect(() => {
    load()
  }, [scope])

  function load() {
    setLoading(true)
    api.listPolice({ scope }).then(setPolice).finally(() => setLoading(false))
  }

  function updateAddForm(k, v) {
    setAddForm((s) => ({ ...s, [k]: v }))
  }

  function updateEditForm(k, v) {
    setEditForm((s) => ({ ...s, [k]: v }))
  }

  function openAddModal() {
    setShowAddModal(true)
    setAddForm({ email: '', password: '', office_name: '', latitude: '', longitude: '', contact_number: '', head_officer: '' })
    setMsg({ type: '', text: '' })
  }

  function openEditModal(p) {
    setEditingId(p.office_id)
    setEditForm({
      email: p.email || '',
      password: '',
      office_name: p.office_name || '',
      latitude: p.latitude ?? '',
      longitude: p.longitude ?? '',
      contact_number: p.contact_number || '',
      head_officer: p.head_officer || '',
    })
    setShowEditModal(true)
    setMsg({ type: '', text: '' })
  }

  async function handleAdd(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })

    if (!validateEmail(addForm.email)) {
      setMsg({ type: 'error', text: 'Invalid email format' })
      return
    }
    if (!validatePassword(addForm.password)) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    if (addForm.latitude && addForm.longitude && !validateCoordinates(parseFloat(addForm.latitude), parseFloat(addForm.longitude))) {
      setMsg({ type: 'error', text: 'Invalid coordinates range' })
      return
    }

    setSaving(true)
    try {
      const admin = getStoredUser()
      if (!admin?.admin_id) {
        throw new Error('Missing admin_id. Please log out and log in again.')
      }

      // Build payload - only include optional fields if they have values
      // Backend rejects empty strings for CharField with blank=True, null=True
      const payload = {
        email: addForm.email,
        password: addForm.password,
        office_name: addForm.office_name || 'Unnamed Office',
        latitude: norm7(addForm.latitude),
        longitude: norm7(addForm.longitude),
      }
      // Only add optional fields if they have actual values
      if (addForm.head_officer?.trim()) {
        payload.head_officer = addForm.head_officer.trim()
      }
      if (addForm.contact_number?.trim()) {
        payload.contact_number = addForm.contact_number.trim()
      }
      await api.addPolice(payload)
      setMsg({ type: 'success', text: 'Police account registered successfully!' })
      setAddForm({ email: '', password: '', office_name: '', latitude: '', longitude: '', contact_number: '', head_officer: '' })
      load()
      setTimeout(() => {
        setShowAddModal(false)
      }, 1500)
    } catch (err) {
      // Show DRF validation errors in UI (and keep a console trail for debugging)
      console.error('[PoliceAccountManagement] addPolice failed:', err?.response?.data || err)
      setMsg({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })

    if (editForm.latitude && editForm.longitude && !validateCoordinates(parseFloat(editForm.latitude), parseFloat(editForm.longitude))) {
      setMsg({ type: 'error', text: 'Invalid coordinates range' })
      return
    }
    // Password is optional on update; validate only if user entered something
    if (editForm.password && !validatePassword(editForm.password)) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setSaving(true)
    try {
      const admin = getStoredUser()
      if (!admin?.admin_id) {
        throw new Error('Missing admin_id. Please log out and log in again.')
      }

      const updates = {
        email: editForm.email,
        office_name: editForm.office_name,
        head_officer: editForm.head_officer || null,
        contact_number: editForm.contact_number || null,
        latitude: norm7(editForm.latitude),
        longitude: norm7(editForm.longitude),
      }
      if (editForm.password) {
        updates.password = editForm.password
      }

      await api.updatePolice(editingId, updates)
      setMsg({ type: 'success', text: 'Police account updated successfully!' })
      load()
      setTimeout(() => {
        setShowEditModal(false)
        setEditingId(null)
      }, 1500)
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const police_item = police.find((p) => p.office_id === id)
    const ok = window.confirm(`Are you sure you want to delete "${police_item?.office_name || 'this office'}"? This action cannot be undone.`)
    if (!ok) return

    setDeletingId(id)
    try {
      await api.removePolice(id)
      load()
    } catch (err) {
      // Error handled silently
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Police Account Management</h2>
          <p className="text-slate-400 mt-1">Manage all police station accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                scope === 'all' ? 'bg-blue-600/60 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              All Accounts
            </button>
            <button
              type="button"
              onClick={() => setScope('our')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                scope === 'our' ? 'bg-blue-600/60 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              Our Accounts
            </button>
          </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/60 text-white rounded-xl hover:bg-blue-600/80 transition-all backdrop-blur-md border border-blue-500/60 font-medium"
        >
          <UserPlus size={18} />
          Add Police Account
        </button>
        </div>
      </div>

      {/* Data Display: List of Police Accounts (Editable Grid/Table) */}
      {loading ? (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-8 text-center">
          <p className="text-slate-300">Loading accounts...</p>
        </div>
      ) : police.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-12 text-center">
          <AlertCircle className="text-slate-500 mx-auto mb-4" size={40} />
          <p className="text-slate-400 text-lg">No police accounts found</p>
          <button
            onClick={openAddModal}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600/60 text-white rounded-xl hover:bg-blue-600/80 transition-all backdrop-blur-md border border-blue-500/60 font-medium mx-auto"
          >
            <UserPlus size={18} />
            Add First Account
          </button>
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10 border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Office Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Created By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Head Officer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {police.map((p) => (
                  <tr key={p.office_id} className="hover:bg-white/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">{p.office_name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {[p.location_barangay, p.location_city].filter(Boolean).join(', ') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{p.created_by_username || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300">{p.head_officer || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300">{p.contact_number || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{p.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600/40 text-blue-200 hover:bg-blue-600/60 backdrop-blur-md border border-blue-500/60 rounded-lg transition-colors font-medium text-sm"
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.office_id)}
                          disabled={deletingId === p.office_id}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600/40 text-red-200 hover:bg-red-600/60 backdrop-blur-md border border-red-500/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        >
                          <Trash2 size={16} />
                          {deletingId === p.office_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-white/10 border-t border-white/20">
            <p className="text-sm text-slate-300">Total accounts: <span className="font-semibold text-white">{police.length}</span></p>
          </div>
        </div>
      )}

      {/* Add Modal (3.2) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Add Police Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email *</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => updateAddForm('email', e.target.value)}
                    required
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="officer@police.gov"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Password *</label>
                  <PasswordInput
                    value={addForm.password}
                    onChange={(e) => updateAddForm('password', e.target.value)}
                    required
                    className="w-full px-4 py-2 pr-12 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Police Office Name</label>
                <input
                  type="text"
                  value={addForm.office_name}
                  onChange={(e) => updateAddForm('office_name', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                  placeholder="Metro Police Station"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <MapPin size={16} /> Location Coordinates
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.0001"
                    value={addForm.latitude}
                    onChange={(e) => updateAddForm('latitude', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={addForm.longitude}
                    onChange={(e) => updateAddForm('longitude', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Longitude"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Contact Number</label>
                  <input
                    type="tel"
                    value={addForm.contact_number}
                    onChange={(e) => updateAddForm('contact_number', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="+63 2 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Head Officer Name</label>
                  <input
                    type="text"
                    value={addForm.head_officer}
                    onChange={(e) => updateAddForm('head_officer', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Captain Juan Dela Cruz"
                  />
                </div>
              </div>

              {msg.text && (
                <div className={`flex items-center gap-3 p-4 rounded-xl backdrop-blur-md border ${msg.type === 'success' ? 'bg-green-600/30 border-green-500/60' : 'bg-red-600/30 border-red-500/60'}`}>
                  {msg.type === 'success' ? (
                    <CheckCircle className="text-green-300" size={20} />
                  ) : (
                    <AlertCircle className="text-red-300" size={20} />
                  )}
                  <p className={`text-sm ${msg.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>{msg.text}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/60 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-blue-600/80 transition-all border border-blue-500/50 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={20} />
                  {saving ? 'Registering...' : 'Register Police Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (3.3) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Edit Police Account</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingId(null)
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => updateEditForm('email', e.target.value)}
                    required
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">New Password (optional)</label>
                  <PasswordInput
                    value={editForm.password}
                    onChange={(e) => updateEditForm('password', e.target.value)}
                    className="w-full px-4 py-2 pr-12 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Leave blank to keep the current password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Police Office Name</label>
                <input
                  type="text"
                  value={editForm.office_name}
                  onChange={(e) => updateEditForm('office_name', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <MapPin size={16} /> Location Coordinates
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.latitude}
                    onChange={(e) => updateEditForm('latitude', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.longitude}
                    onChange={(e) => updateEditForm('longitude', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Longitude"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Contact Number</label>
                  <input
                    type="tel"
                    value={editForm.contact_number}
                    onChange={(e) => updateEditForm('contact_number', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Head Officer Name</label>
                  <input
                    type="text"
                    value={editForm.head_officer}
                    onChange={(e) => updateEditForm('head_officer', e.target.value)}
                    className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              {msg.text && (
                <div className={`flex items-center gap-3 p-4 rounded-xl backdrop-blur-md border ${msg.type === 'success' ? 'bg-green-600/30 border-green-500/60' : 'bg-red-600/30 border-red-500/60'}`}>
                  {msg.type === 'success' ? (
                    <CheckCircle className="text-green-300" size={20} />
                  ) : (
                    <AlertCircle className="text-red-300" size={20} />
                  )}
                  <p className={`text-sm ${msg.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>{msg.text}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingId(null)
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/60 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-blue-600/80 transition-all border border-blue-500/50 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}