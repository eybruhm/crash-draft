import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building, Check, CheckCircle, Copy, FileText, Search, User } from 'lucide-react'
import { api } from '../services/api'
import { getErrorMessage } from '../utils/errors'

export default function ManualReport() {
  const [activeTab, setActiveTab] = useState('report') // report | user | police

  const [offices, setOffices] = useState([])
  const [loadingOffices, setLoadingOffices] = useState(true)
  const sortedOffices = useMemo(() => {
    return [...offices].sort((a, b) => String(a.office_name || '').localeCompare(String(b.office_name || ''), 'en', { sensitivity: 'base' }))
  }, [offices])

  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedOffice, setSelectedOffice] = useState(null)

  const [form, setForm] = useState({
    category: '',
    status: 'Pending',
    latitude: '',
    longitude: '',
    description: '',
    remarks: '',
    created_at: '', // datetime-local
    updated_at: '', // datetime-local
    reporter: '', // user UUID (optional)
    assigned_office: '', // office UUID (required)
  })

  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  
  // User search
  const [userQuery, setUserQuery] = useState('')
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [userResults, setUserResults] = useState([])
  
  // Police search
  const [officeQuery, setOfficeQuery] = useState('')

  useEffect(() => {
    setLoadingOffices(true)
    api
      .listPolice({ scope: 'all' })
      .then((data) => setOffices(Array.isArray(data) ? data : []))
      .catch(() => setOffices([]))
      .finally(() => setLoadingOffices(false))
  }, [])

  // Prefill timestamps (like your friend's file) but editable
  useEffect(() => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    setForm((s) => ({
      ...s,
      created_at: s.created_at || local,
      updated_at: s.updated_at || local,
    }))
  }, [])

  function update(k, v) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  function norm7(value) {
    const n = Number.parseFloat(value)
    if (!Number.isFinite(n)) return 0
    return Number(n.toFixed(7))
  }

  function toIsoOrNull(datetimeLocal) {
    if (!datetimeLocal) return null

    // datetime-local inputs have NO timezone.
    // Converting via `new Date(...).toISOString()` depends on the browser/device timezone
    // and can shift timestamps unexpectedly. CRASH is Manila-based, so we encode the
    // timestamp explicitly as Asia/Manila (+08:00).
    // Expected input: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
    const hasSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(datetimeLocal)
    const base = hasSeconds ? datetimeLocal : `${datetimeLocal}:00`
    return `${base}+08:00`
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(String(text))
    } catch {
      // ignore
    }
  }

  async function handleSearchUsers() {
    setSearchingUsers(true)
    try {
      const data = await api.searchUsers(userQuery)
      setUserResults(Array.isArray(data) ? data : [])
    } catch (err) {
      setUserResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  // Dynamic search: as-you-type (same feel as Police Search tab)
  useEffect(() => {
    if (activeTab !== 'user') return
    const t = setTimeout(() => {
      handleSearchUsers()
    }, 300)
    return () => clearTimeout(t)
  }, [activeTab, userQuery])

  function selectUser(u) {
    setSelectedUser(u)
    update('reporter', u.user_id)
    setActiveTab('report')
  }

  function clearUser() {
    setSelectedUser(null)
    update('reporter', '')
  }

  const filteredOffices = useMemo(() => {
    const q = officeQuery.trim().toLowerCase()
    if (!q) return sortedOffices
    return sortedOffices.filter((o) => {
      const name = String(o.office_name || '').toLowerCase()
      const loc = `${o.location_barangay || ''} ${o.location_city || ''}`.toLowerCase()
      return name.includes(q) || loc.includes(q)
    })
  }, [sortedOffices, officeQuery])

  function selectOffice(o) {
    setSelectedOffice(o)
    update('assigned_office', o.office_id)
    setActiveTab('report')
  }

  function clearOffice() {
    setSelectedOffice(null)
    update('assigned_office', '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })

    if (!form.category) {
      setMsg({ type: 'error', text: 'Category is required.' })
      return
    }
    if (!form.assigned_office) {
      setMsg({ type: 'error', text: 'Assigned police office is required (911 dispatch).' })
      return
    }

    const lat = Number.parseFloat(form.latitude)
    const lng = Number.parseFloat(form.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMsg({ type: 'error', text: 'Latitude and longitude are required.' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        category: form.category,
        status: form.status,
        description: form.description || null,
        remarks: form.remarks || null,
        latitude: norm7(form.latitude),
        longitude: norm7(form.longitude),
        assigned_office: form.assigned_office,
      }
      if (form.reporter.trim()) payload.reporter = form.reporter.trim()

      const createdAtIso = toIsoOrNull(form.created_at)
      const updatedAtIso = toIsoOrNull(form.updated_at)
      if (createdAtIso) payload.created_at = createdAtIso
      if (updatedAtIso) payload.updated_at = updatedAtIso

      const created = await api.createManualReport(payload)
      setMsg({ type: 'success', text: `Report created: ${created.report_id}` })

      setForm((s) => ({
        ...s,
        category: '',
        status: 'Pending',
        latitude: '',
        longitude: '',
        description: '',
        remarks: '',
        reporter: '',
        assigned_office: '',
      }))
      setSelectedUser(null)
      setSelectedOffice(null)
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'report'
                ? 'bg-blue-600/60 text-white border border-blue-500/60 shadow-lg'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
            }`}
          >
            <FileText size={18} />
            Manual Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('user')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'user'
                ? 'bg-blue-600/60 text-white border border-blue-500/60 shadow-lg'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
            }`}
          >
            <User size={18} />
            User Search
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('police')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'police'
                ? 'bg-blue-600/60 text-white border border-blue-500/60 shadow-lg'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
            }`}
          >
            <Building size={18} />
            Police Search
          </button>
        </div>
      </div>

      {/* Report tab */}
      {activeTab === 'report' && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Manual Report Insert Form (911 Offline)</h2>
          <p className="text-slate-400 text-sm mb-6">
            Admin can insert offline 911 reports safely. Assigned office is required because 911 dispatch chooses it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white outline-none transition-all"
                  >
                    <option value="" className="bg-slate-900">Select</option>
                    <option value="Emergency" className="bg-slate-900">Emergency</option>
                    <option value="Accident" className="bg-slate-900">Accident</option>
                    <option value="Theft" className="bg-slate-900">Theft</option>
                    <option value="Assault" className="bg-slate-900">Assault</option>
                    <option value="Traffic Violation" className="bg-slate-900">Traffic Violation</option>
                    <option value="Vandalism" className="bg-slate-900">Vandalism</option>
                    <option value="Other" className="bg-slate-900">Other</option>
                  </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-white mb-2">Status (from 911)</label>
                  <select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white outline-none transition-all"
                  >
                    <option value="Pending" className="bg-slate-900">Pending</option>
                    <option value="Resolved" className="bg-slate-900">Resolved</option>
                  </select>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Latitude</label>
                  <input
                    type="number"
                  step="0.0000001"
                  value={form.latitude}
                  onChange={(e) => update('latitude', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Longitude</label>
                  <input
                    type="number"
                  step="0.0000001"
                  value={form.longitude}
                  onChange={(e) => update('longitude', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                <label className="block text-sm font-medium text-white mb-2">Created At</label>
                  <input
                  type="datetime-local"
                  value={form.created_at}
                  onChange={(e) => update('created_at', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white outline-none transition-all"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-white mb-2">Updated At (optional)</label>
                  <input
                  type="datetime-local"
                  value={form.updated_at}
                  onChange={(e) => update('updated_at', e.target.value)}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
              <label className="block text-sm font-medium text-white mb-2">Assigned Police Office UUID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.assigned_office}
                  onChange={(e) => update('assigned_office', e.target.value)}
                  className="flex-1 px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all font-mono text-sm"
                  placeholder="Select in Police Search tab (Copy/Use UUID)"
                />
                <button
                  type="button"
                  onClick={() => setActiveTab('police')}
                  className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-xl transition-colors font-medium"
                >
                  Police Search
                </button>
              </div>
              {selectedOffice && (
                <p className="text-xs text-green-300 mt-2 flex items-center gap-2">
                  <Check size={14} /> Selected office: {selectedOffice.office_name}
                  <button type="button" onClick={clearOffice} className="ml-2 text-slate-300 hover:text-white underline">
                    Clear
                  </button>
                </p>
              )}
              </div>

                <div>
              <label className="block text-sm font-medium text-white mb-2">Reporter UUID</label>
              <div className="flex gap-2">
                  <input
                    type="text"
                  value={form.reporter}
                  onChange={(e) => update('reporter', e.target.value)}
                  className="flex-1 px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all font-mono text-sm"
                  placeholder="Select in User Search tab (if user exists)"
                />
                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-xl transition-colors font-medium"
                >
                  User Search
                </button>
              </div>
              {selectedUser && (
                <p className="text-xs text-green-300 mt-2 flex items-center gap-2">
                  <Check size={14} /> Selected user: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
                  <button type="button" onClick={clearUser} className="ml-2 text-slate-300 hover:text-white underline">
                    Clear
                  </button>
                </p>
              )}
                </div>

                <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all resize-none"
                placeholder="Describe the incident or report details..."
                  />
              </div>

                <div>
              <label className="block text-sm font-medium text-white mb-2">Remarks (optional)</label>
              <textarea
                value={form.remarks}
                onChange={(e) => update('remarks', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all resize-none"
                placeholder="Additional notes or remarks..."
                  />
              </div>

              {msg.text && (
                <div className={`flex items-center gap-3 p-4 rounded-xl backdrop-blur-md border ${
                msg.type === 'success' ? 'bg-green-600/30 border-green-500/60' : 'bg-red-600/30 border-red-500/60'
                }`}>
                  {msg.type === 'success' ? (
                    <CheckCircle className="text-green-300" size={20} />
                  ) : (
                    <AlertCircle className="text-red-300" size={20} />
                  )}
                <p className={`text-sm ${msg.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>{msg.text}</p>
                </div>
              )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/60 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-blue-600/80 transition-all border border-blue-500/50 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating…' : 'Create Report'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMsg({ type: '', text: '' })
                  clearUser()
                  clearOffice()
                }}
                className="flex-1 px-4 py-2 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl transition-colors font-medium"
              >
                Clear Selected UUIDs
              </button>
            </div>
            </form>
        </div>
      )}

      {/* User tab */}
      {activeTab === 'user' && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Search User (Get UUID)</h3>
              <div className="flex gap-2">
                <input
                  type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search by email, phone, first name, last name…"
                className="flex-1 px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none"
                />
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm flex items-center gap-2">
              <Search size={16} />
              {searchingUsers ? 'Searching…' : 'Live'}
            </div>
            </div>

          <div className="mt-4 overflow-x-auto">
            {userResults.length === 0 ? (
              <p className="text-slate-400 text-sm">No results yet. Search to find the user UUID.</p>
            ) : (
                <table className="w-full">
                  <thead className="bg-white/10 border-b border-white/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold">UUID</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Phone</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                  {userResults.map((u) => (
                    <tr key={u.user_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono text-sm">{u.user_id}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{u.first_name} {u.last_name}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{u.phone || 'N/A'}</td>
                          <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                            onClick={() => copy(u.user_id)}
                            className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-xs font-medium flex items-center gap-1"
                              >
                                <Copy size={14} />
                                Copy UUID
                </button>
                          <button
                            type="button"
                            onClick={() => selectUser(u)}
                            className="px-3 py-1.5 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <Check size={14} />
                            Use as Reporter
                          </button>
                            </div>
                          </td>
                        </tr>
                  ))}
                  </tbody>
                </table>
            )}
          </div>
          </div>
      )}

      {/* Police tab */}
      {activeTab === 'police' && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Search Police Office (Get UUID)</h3>
                <input
                  type="text"
            value={officeQuery}
            onChange={(e) => setOfficeQuery(e.target.value)}
            placeholder="Search by office name / city / barangay…"
            className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none"
                />

          <div className="mt-4 overflow-x-auto">
            {loadingOffices ? (
              <p className="text-slate-400 text-sm">Loading offices…</p>
            ) : (
                <table className="w-full">
                  <thead className="bg-white/10 border-b border-white/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold">UUID</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Office</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Location</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Head Officer</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Contact</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                  {filteredOffices.slice(0, 50).map((o) => (
                    <tr key={o.office_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono text-sm">{o.office_id}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{o.office_name}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {[o.location_barangay, o.location_city].filter(Boolean).join(', ') || 'N/A'}
                          </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{o.head_officer || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{o.contact_number || 'N/A'}</td>
                          <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                            onClick={() => copy(o.office_id)}
                            className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-xs font-medium flex items-center gap-1"
                              >
                                <Copy size={14} />
                                Copy UUID
                </button>
                          <button
                            type="button"
                            onClick={() => selectOffice(o)}
                            className="px-3 py-1.5 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <Check size={14} />
                            Use as Assigned Office
                          </button>
                            </div>
                          </td>
                        </tr>
                  ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
