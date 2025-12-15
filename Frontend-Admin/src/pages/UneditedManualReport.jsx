import { useState, useEffect } from 'react'
import { FileText, Search, User, Building, CheckCircle, AlertCircle, MapPin, Calendar, Copy, Check } from 'lucide-react'
import { api } from '../services/api'
import { getErrorMessage } from '../utils/errors'

/**
 * Manual Report Insertion Page Component
 * 
 * Three-column layout:
 * - Left: Report Form (Primary Input)
 * - Center: Search User Tool (Helper Component)
 * - Right: Search Police Office Tool (Helper Component)
 * 
 * @returns {JSX.Element} Manual report insertion interface
 */
export default function ManualReport() {
  const [form, setForm] = useState({
    report_id: '',
    reporter_id: '',
    assigned_office_id: '',
    category: '',
    status: 'Pending',
    lat: '',
    lng: '',
    city: '',
    barangay: '',
    remarks: '',
    created_at: '',
    updated_at: '',
  })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const [copySuccessMsg, setCopySuccessMsg] = useState('')
  
  // User Search State
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [searchingUser, setSearchingUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Police Office Search State
  const [searchOfficeQuery, setSearchOfficeQuery] = useState('')
  const [officeResults, setOfficeResults] = useState([])
  const [searchingOffice, setSearchingOffice] = useState(false)
  const [selectedOffice, setSelectedOffice] = useState(null)

  // Tab State
  const [activeTab, setActiveTab] = useState('report') // 'report', 'user', 'police'

  // Auto-populate timestamps on mount
  useEffect(() => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 23)
    setForm(prev => ({
      ...prev,
      created_at: prev.created_at || now,
      updated_at: prev.updated_at || now,
    }))
  }, [])

  // Load all users when User tab is active
  useEffect(() => {
    if (activeTab === 'user') {
      loadAllUsers()
    }
  }, [activeTab])

  // Load all police offices when Police tab is active
  useEffect(() => {
    if (activeTab === 'police') {
      loadAllPolice()
    }
  }, [activeTab])

  async function loadAllUsers() {
    setSearchingUser(true)
    try {
      const users = await api.listUsers()
      setUserResults(Array.isArray(users) ? users : [])
    } catch (err) {
      console.error('[ManualReport] Error loading users:', err)
      setUserResults([])
    } finally {
      setSearchingUser(false)
    }
  }

  async function loadAllPolice() {
    setSearchingOffice(true)
    try {
      const police = await api.listPolice()
      const offices = Array.isArray(police) ? police : (police.results || [])
      setOfficeResults(offices)
    } catch (err) {
      console.error('[ManualReport] Error loading police:', err)
      setOfficeResults([])
    } finally {
      setSearchingOffice(false)
    }
  }

  function update(k, v) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  // UUID truncation function: shows first 5 and last 5 characters
  function truncateUUID(uuid) {
    if (!uuid) return 'N/A'
    const str = String(uuid)
    if (str.length <= 10) return str
    return `${str.substring(0, 5)}...${str.substring(str.length - 5)}`
  }

  // Copy UUID to clipboard
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccessMsg('UUID successfully copied to clipboard!')
      setTimeout(() => setCopySuccessMsg(''), 3000)
    } catch (err) {
      setCopySuccessMsg('Failed to copy UUID to clipboard')
      setTimeout(() => setCopySuccessMsg(''), 3000)
    }
  }

  // Get full UUID from user or office object
  function getFullUUID(item) {
    return item?.uuid || item?.id || ''
  }

  async function handleSearchUser() {
    if (!searchUserQuery.trim()) {
      // If search is empty, show all users
      loadAllUsers()
      return
    }
    setSearchingUser(true)
    try {
      // Try to get single result first, then convert to array for table display
      const user = await api.searchUser(searchUserQuery)
      // Convert single result to array for table display
      setUserResults([user])
    } catch (err) {
      setUserResults([])
      // Don't show error for "not found" - just empty results
    } finally {
      setSearchingUser(false)
    }
  }

  async function handleSearchOffice() {
    if (!searchOfficeQuery.trim()) {
      // If search is empty, show all police offices
      loadAllPolice()
      return
    }
    setSearchingOffice(true)
    try {
      // Try to get single result first, then convert to array for table display
      const office = await api.searchPoliceOffice(searchOfficeQuery)
      // Convert single result to array for table display
      setOfficeResults([office])
    } catch (err) {
      setOfficeResults([])
      // Don't show error for "not found" - just empty results
    } finally {
      setSearchingOffice(false)
    }
  }

  function handleClearUser() {
    setSelectedUser(null)
    update('reporter_id', '')
    setUserResults([])
    setSearchUserQuery('')
  }

  function handleClearOffice() {
    setSelectedOffice(null)
    update('assigned_office_id', '')
    setOfficeResults([])
    setSearchOfficeQuery('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg({ type: '', text: '' })

    // Validation
    if (!form.reporter_id) {
      setMsg({ type: 'error', text: 'Please select a user (reporter)' })
      return
    }
    if (!form.assigned_office_id) {
      setMsg({ type: 'error', text: 'Please select a police office' })
      return
    }
    if (!form.category) {
      setMsg({ type: 'error', text: 'Please select a category' })
      return
    }

    // Generate timestamps if not provided
    const now = new Date().toISOString().replace('T', ' ').slice(0, 23)
    const payload = {
      ...form,
      created_at: form.created_at || now,
      updated_at: form.updated_at || now,
    }

    setLoading(true)
    try {
      await api.createReport(payload)
      setMsg({ type: 'success', text: 'Report inserted successfully!' })
      
      // Reset form
      const newTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 23)
      setForm({
        report_id: '',
        reporter_id: '',
        assigned_office_id: '',
        category: '',
        status: 'Pending',
        lat: '',
        lng: '',
        city: '',
        barangay: '',
        remarks: '',
        created_at: newTimestamp,
        updated_at: newTimestamp,
      })
      setSelectedUser(null)
      setSelectedOffice(null)
      setUserResults([])
      setOfficeResults([])
      setSearchUserQuery('')
      setSearchOfficeQuery('')
    } catch (err) {
      setMsg({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
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
            User
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
            Police
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'report' && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText size={20} />
              Report Form
            </h2>

            <div className="space-y-4">
              {/* Report ID */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Report ID</label>
                <input
                  type="text"
                  value={form.report_id}
                  onChange={(e) => update('report_id', e.target.value)}
                  className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm"
                  placeholder="Auto-generated or manual"
                />
              </div>

              {/* Reporter ID (user) - Read-only after selection */}
                <div>
                <label className="block text-sm font-medium text-white mb-2">Reporter ID (user)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.reporter_id}
                    readOnly={!!selectedUser}
                    onChange={(e) => !selectedUser && update('reporter_id', e.target.value)}
                    className={`flex-1 px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm ${
                      selectedUser ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    placeholder="Select from User search"
                  />
                  {!selectedUser && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('user')}
                      className="px-3 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors text-sm font-medium flex items-center gap-1"
                      title="Search for user"
                    >
                      <User size={14} />
                      Search
                    </button>
                  )}
                  {selectedUser && (
                    <button
                      type="button"
                      onClick={handleClearUser}
                      className="px-3 py-2 bg-red-600/60 text-white rounded-lg hover:bg-red-600/80 transition-colors text-sm font-medium"
                      title="Clear selection"
                    >
                      ×
                    </button>
                  )}
                </div>
                {selectedUser && (
                  <p className="text-xs text-green-300 mt-1 flex items-center gap-1">
                    <Check size={12} />
                    Selected: {selectedUser.name || selectedUser.username || selectedUser.email || selectedUser.id}
                  </p>
                )}
              </div>

              {/* Assigned Office ID (police) - Read-only after selection */}
                <div>
                <label className="block text-sm font-medium text-white mb-2">Assigned Office ID (police)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.assigned_office_id}
                    readOnly={!!selectedOffice}
                    onChange={(e) => !selectedOffice && update('assigned_office_id', e.target.value)}
                    className={`flex-1 px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm ${
                      selectedOffice ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    placeholder="Select from Police search"
                  />
                  {!selectedOffice && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('police')}
                      className="px-3 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors text-sm font-medium flex items-center gap-1"
                      title="Search for police office"
                    >
                      <Building size={14} />
                      Search
                    </button>
                  )}
                  {selectedOffice && (
                    <button
                      type="button"
                      onClick={handleClearOffice}
                      className="px-3 py-2 bg-red-600/60 text-white rounded-lg hover:bg-red-600/80 transition-colors text-sm font-medium"
                      title="Clear selection"
                    >
                      ×
                    </button>
                  )}
                </div>
                {selectedOffice && (
                  <p className="text-xs text-green-300 mt-1 flex items-center gap-1">
                    <Check size={12} />
                    Selected: {selectedOffice.officeName || selectedOffice.name || selectedOffice.id}
                  </p>
                )}
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value)}
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white outline-none transition-all text-sm"
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
                  <label className="block text-sm font-medium text-white mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white outline-none transition-all text-sm"
                  >
                    <option value="Pending" className="bg-slate-900">Pending</option>
                    <option value="Resolved" className="bg-slate-900">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Location Coordinates */}
              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <MapPin size={14} />
                  Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={(e) => update('lat', e.target.value)}
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm"
                    placeholder="Lat"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lng}
                    onChange={(e) => update('lng', e.target.value)}
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm"
                    placeholder="Lng"
                  />
                </div>
              </div>

              {/* City & Barangay */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Barangay</label>
                  <input
                    type="text"
                    value={form.barangay}
                    onChange={(e) => update('barangay', e.target.value)}
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all text-sm"
                    placeholder="Barangay"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => update('remarks', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none transition-all resize-none text-sm"
                  placeholder="Additional details..."
                />
              </div>

              {/* Timestamps (Read-only) */}
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} />
                    Created At
                  </label>
                  <input
                    type="text"
                    value={form.created_at}
                    readOnly
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/5 border border-white/10 rounded-lg text-white/60 font-mono text-xs opacity-75 cursor-not-allowed"
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} />
                    Updated At
                  </label>
                  <input
                    type="text"
                    value={form.updated_at}
                    readOnly
                    className="w-full px-3 py-2 backdrop-blur-md bg-white/5 border border-white/10 rounded-lg text-white/60 font-mono text-xs opacity-75 cursor-not-allowed"
                    placeholder="Auto-generated"
                  />
                </div>
              </div>

              {/* Messages */}
              {msg.text && (
                <div className={`flex items-center gap-3 p-4 rounded-xl backdrop-blur-md border ${
                  msg.type === 'success' 
                    ? 'bg-green-600/30 border-green-500/60' 
                    : 'bg-red-600/30 border-red-500/60'
                }`}>
                  {msg.type === 'success' ? (
                    <CheckCircle className="text-green-300" size={20} />
                  ) : (
                    <AlertCircle className="text-red-300" size={20} />
                  )}
                  <p className={`text-sm ${msg.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
                    {msg.text}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <form onSubmit={handleSubmit} className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600/60 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-blue-600/80 transition-all border border-blue-500/50 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={20} />
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Tab Content */}
      {activeTab === 'user' && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User size={20} />
              Search User
            </h3>
          
            <div className="space-y-4">
            {/* Copy Success Message */}
            {copySuccessMsg && (
              <div className={`flex items-center gap-3 p-3 rounded-xl backdrop-blur-md border ${
                copySuccessMsg.includes('successfully') 
                  ? 'bg-green-600/30 border-green-500/60' 
                  : 'bg-red-600/30 border-red-500/60'
              }`}>
                {copySuccessMsg.includes('successfully') ? (
                  <CheckCircle className="text-green-300" size={18} />
                ) : (
                  <AlertCircle className="text-red-300" size={18} />
                )}
                <p className={`text-sm ${copySuccessMsg.includes('successfully') ? 'text-green-200' : 'text-red-200'}`}>
                  {copySuccessMsg}
                </p>
              </div>
            )}
            
            {/* Search Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                  placeholder="Name or UUID"
                className="flex-1 px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchUser}
                  disabled={searchingUser}
                className="px-6 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors disabled:opacity-50 font-medium"
              >
                {searchingUser ? 'Searching...' : <><Search size={18} /> Search</>}
              </button>
            </div>

            {/* Results Table */}
            {userResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/10 border-b border-white/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold">UUID</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Contact</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Address</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Gender</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Age</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Created At</th>
                      <th className="px-4 py-3 text-right text-white font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {userResults.map((user, idx) => {
                      const fullUUID = getFullUUID(user)
                      const displayName = user.name || user.username || 'N/A'
                      const displayContact = user.contact || user.phone || 'N/A'
                      const address = [user.region, user.city, user.barangay].filter(Boolean).join(', ') || 'N/A'
                      
                      return (
                        <tr 
                          key={user.id || user.uuid || idx} 
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-300 font-mono text-sm">
                            {truncateUUID(fullUUID)}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{displayName}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{user.email || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{displayContact}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{address}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{user.gender || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{user.age || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fullUUID)}
                                className="px-3 py-1.5 bg-purple-600/60 text-white rounded-lg hover:bg-purple-600/80 transition-colors text-xs font-medium flex items-center gap-1"
                                title="Copy full UUID"
                              >
                                <Copy size={14} />
                                Copy UUID
                </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {searchUserQuery && userResults.length === 0 && !searchingUser && (
              <div className="text-center py-12">
                <User className="text-slate-500 mx-auto mb-4" size={48} />
                <p className="text-slate-400">No users found</p>
                <p className="text-slate-500 text-sm mt-2">Try a different search query</p>
                        </div>
            )}

            {!searchUserQuery && userResults.length === 0 && !searchingUser && (
              <div className="text-center py-12">
                <User className="text-slate-500 mx-auto mb-4" size={48} />
                <p className="text-slate-400">No users available</p>
                </div>
              )}
            </div>
          </div>
      )}

      {/* Police Tab Content */}
      {activeTab === 'police' && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Building size={20} />
              Search Police Office
            </h3>
          
            <div className="space-y-4">
            {/* Copy Success Message */}
            {copySuccessMsg && (
              <div className={`flex items-center gap-3 p-3 rounded-xl backdrop-blur-md border ${
                copySuccessMsg.includes('successfully') 
                  ? 'bg-green-600/30 border-green-500/60' 
                  : 'bg-red-600/30 border-red-500/60'
              }`}>
                {copySuccessMsg.includes('successfully') ? (
                  <CheckCircle className="text-green-300" size={18} />
                ) : (
                  <AlertCircle className="text-red-300" size={18} />
                )}
                <p className={`text-sm ${copySuccessMsg.includes('successfully') ? 'text-green-200' : 'text-red-200'}`}>
                  {copySuccessMsg}
                </p>
              </div>
            )}
            
            {/* Search Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchOfficeQuery}
                  onChange={(e) => setSearchOfficeQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchOffice()}
                  placeholder="Office Name or UUID"
                className="flex-1 px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400/60 focus:bg-white/20 text-white placeholder-slate-400 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchOffice}
                  disabled={searchingOffice}
                className="px-6 py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-600/80 transition-colors disabled:opacity-50 font-medium"
              >
                {searchingOffice ? 'Searching...' : <><Search size={18} /> Search</>}
              </button>
            </div>

            {/* Results Table */}
            {officeResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/10 border-b border-white/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold">UUID</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Head Officer</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Contact</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Location</th>
                      <th className="px-4 py-3 text-right text-white font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {officeResults.map((office, idx) => {
                      const fullUUID = getFullUUID(office)
                      const location = [office.city, office.barangay].filter(Boolean).join(', ') || 'N/A'
                      
                      return (
                        <tr 
                          key={office.id || office.uuid || idx} 
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-300 font-mono text-sm">
                            {truncateUUID(fullUUID)}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {office.officeName || office.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {office.email || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {office.headName || office.headOfficer || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {office.contact || office.contactNo || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{location}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fullUUID)}
                                className="px-3 py-1.5 bg-purple-600/60 text-white rounded-lg hover:bg-purple-600/80 transition-colors text-xs font-medium flex items-center gap-1"
                                title="Copy full UUID"
                              >
                                <Copy size={14} />
                                Copy UUID
                </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {searchOfficeQuery && officeResults.length === 0 && !searchingOffice && (
              <div className="text-center py-12">
                <Building className="text-slate-500 mx-auto mb-4" size={48} />
                <p className="text-slate-400">No police offices found</p>
                <p className="text-slate-500 text-sm mt-2">Try a different search query</p>
                      </div>
            )}

            {!searchOfficeQuery && officeResults.length === 0 && !searchingOffice && (
              <div className="text-center py-12">
                <Building className="text-slate-500 mx-auto mb-4" size={48} />
                <p className="text-slate-400">No police offices available</p>
                </div>
              )}
          </div>
        </div>
      )}

    </div>
  )
}
