import { useEffect, useMemo, useState } from 'react'
import { Copy, MapPin, Map } from 'lucide-react'
import { api } from '../services/api'
import GoogleMap from '../components/GoogleMap'
import { getStoredUser } from '../utils/auth'

/**
 * Dashboard Page Component
 * 
 * Main admin dashboard displaying:
 * - Stats cards (total police accounts, admin accounts, system status)
 * - Quick action shortcuts to other pages
 * - Recently added police accounts table
 * 
 * @returns {JSX.Element} Dashboard with stats, shortcuts, and recent accounts
 */
export default function Dashboard() {
  const [offices, setOffices] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [officeScope, setOfficeScope] = useState('all') // all | our
  const [checkpointScope, setCheckpointScope] = useState('all') // all | our
  const [showOffices, setShowOffices] = useState(true)
  const [showCheckpoints, setShowCheckpoints] = useState(true)
  const [rightClickInfo, setRightClickInfo] = useState(null)
  const [rightClickLoading, setRightClickLoading] = useState(false)

  useEffect(() => {
    const loadMapData = () => {
      setLoadError('')
      api.getAdminMapData()
        .then((data) => {
          const o = data?.police_offices || []
          const c = data?.active_checkpoints || []
          setOffices(Array.isArray(o) ? o : [])
          setCheckpoints(Array.isArray(c) ? c : [])
        })
        .catch((err) => {
          console.error('[Dashboard] Error loading map data:', err)
          setLoadError('Failed to load map data. Make sure you are logged in as an admin and the backend is running.')
          setOffices([])
          setCheckpoints([])
        })
        .finally(() => setLoading(false))
    }
    
    loadMapData()
    // Refresh every 30 seconds (avoid spamming backend)
    const interval = setInterval(loadMapData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const admin = getStoredUser()
  const ourOfficeIds = useMemo(() => {
    const adminId = admin?.admin_id
    if (!adminId) return new Set()
    return new Set(offices.filter((o) => o.created_by === adminId).map((o) => o.office_id))
  }, [offices, admin?.admin_id])

  const allOfficeCount = offices.length
  const ourOfficeCount = offices.filter((o) => o.created_by === admin?.admin_id).length
  const allCheckpointCount = checkpoints.length
  const ourCheckpointCount = checkpoints.filter((c) => ourOfficeIds.has(c.office)).length

  const visibleOffices = useMemo(() => {
    if (officeScope === 'our' && admin?.admin_id) {
      return offices.filter((o) => o.created_by === admin.admin_id)
    }
    return offices
  }, [offices, officeScope, admin?.admin_id])

  const visibleCheckpoints = useMemo(() => {
    if (checkpointScope === 'our') {
      return checkpoints.filter((c) => ourOfficeIds.has(c.office))
    }
    return checkpoints
  }, [checkpoints, checkpointScope, ourOfficeIds])

  const markers = useMemo(() => {
    const out = []
    if (showOffices) {
      out.push(...visibleOffices.map((o) => ({ ...o, type: 'office' })))
    }
    if (showCheckpoints) {
      out.push(...visibleCheckpoints.map((c) => ({ ...c, type: 'checkpoint' })))
    }
    return out
  }, [showOffices, showCheckpoints, visibleOffices, visibleCheckpoints])

  async function handleMapRightClick(lat, lng) {
    setRightClickLoading(true)
    try {
      const data = await api.reverseGeocode(lat, lng)
      setRightClickInfo({ lat, lng, ...data })
    } catch (err) {
      setRightClickInfo({ lat, lng, error: 'Unable to reverse geocode this location.' })
    } finally {
      setRightClickLoading(false)
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(String(text))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Map Display */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600/40 to-blue-500/30 rounded-xl flex items-center justify-center border border-blue-400/30">
                <Map className="text-blue-300" size={20} />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Police Office Locations</h2>
            </div>
            <p className="text-sm text-slate-400 ml-[52px] font-medium">Interactive map visualization of all registered police stations</p>

            {/* Stat boxes */}
            <div className="mt-5 ml-[52px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowOffices(true)
                  setShowCheckpoints(false)
                  setOfficeScope('all')
                }}
                className="text-left glass-elevated p-4 hover:bg-white/10 transition-colors border border-white/10"
              >
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">All Police Offices</p>
                <p className="text-2xl font-bold text-white mt-1">{allOfficeCount}</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOffices(true)
                  setShowCheckpoints(false)
                  setOfficeScope('our')
                }}
                className="text-left glass-elevated p-4 hover:bg-white/10 transition-colors border border-white/10"
              >
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Our Police Offices</p>
                <p className="text-2xl font-bold text-white mt-1">{ourOfficeCount}</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOffices(false)
                  setShowCheckpoints(true)
                  setCheckpointScope('all')
                }}
                className="text-left glass-elevated p-4 hover:bg-white/10 transition-colors border border-white/10"
              >
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">All Police Checkpoints</p>
                <p className="text-2xl font-bold text-white mt-1">{allCheckpointCount}</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOffices(false)
                  setShowCheckpoints(true)
                  setCheckpointScope('our')
                }}
                className="text-left glass-elevated p-4 hover:bg-white/10 transition-colors border border-white/10"
              >
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Our Office Checkpoints</p>
                <p className="text-2xl font-bold text-white mt-1">{ourCheckpointCount}</p>
              </button>
            </div>

            {/* Filter toggles */}
            <div className="mt-3 ml-[52px] flex flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setOfficeScope('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    officeScope === 'all' ? 'bg-blue-600/60 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  All Offices
                </button>
                <button
                  type="button"
                  onClick={() => setOfficeScope('our')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    officeScope === 'our' ? 'bg-blue-600/60 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Our Offices
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setCheckpointScope('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    checkpointScope === 'all' ? 'bg-blue-600/60 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  All Checkpoints
                </button>
                <button
                  type="button"
                  onClick={() => setCheckpointScope('our')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    checkpointScope === 'our' ? 'bg-blue-600/60 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Our Checkpoints
                </button>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={showOffices} onChange={(e) => setShowOffices(e.target.checked)} />
                  Offices
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={showCheckpoints} onChange={(e) => setShowCheckpoints(e.target.checked)} />
                  Checkpoints
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="glass-elevated overflow-hidden border-2 border-white/10">
          <div className="h-[calc(100vh-400px)] min-h-[600px] relative">
            <GoogleMap
              markers={markers}
              onMarkerClick={setSelectedPin}
              selectedMarker={selectedPin}
              onMapRightClick={handleMapRightClick}
              defaultCenter={{ lat: 14.5995, lng: 120.9842 }} // Manila, Philippines
              defaultZoom={10}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="text-center glass-elevated p-8 max-w-md">
                  <p className="text-white text-lg font-semibold mb-2">Loading map data…</p>
                  <p className="text-slate-400 text-sm">Fetching police offices from the backend</p>
                </div>
              </div>
            )}
            {loadError && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="text-center glass-elevated p-8 max-w-md">
                  <p className="text-white text-lg font-semibold mb-2">Unable to load data</p>
                  <p className="text-slate-400 text-sm">{loadError}</p>
                </div>
              </div>
            )}
            {markers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="text-center glass-elevated p-8 max-w-md">
                  <Map className="text-slate-400 mx-auto mb-4" size={48} />
                  <p className="text-white text-lg font-semibold mb-2">No map markers</p>
                  <p className="text-slate-400 text-sm">Adjust filters or add police offices/checkpoints</p>
                </div>
              </div>
            )}

            {/* Right-click info panel */}
            {rightClickInfo && (
              <div className="absolute bottom-4 left-4 z-30 glass-elevated p-4 w-[360px] max-w-[90vw]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">Map location</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Right-click anywhere on the map to refresh
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRightClickInfo(null)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-slate-300 text-sm font-mono">
                      {rightClickInfo.lat?.toFixed?.(7) ?? rightClickInfo.lat}, {rightClickInfo.lng?.toFixed?.(7) ?? rightClickInfo.lng}
                    </p>
                    <button
                      type="button"
                      onClick={() => copy(`${rightClickInfo.lat},${rightClickInfo.lng}`)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/10 text-xs font-medium"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>

                  {rightClickLoading ? (
                    <p className="text-slate-400 text-sm">Getting address…</p>
                  ) : rightClickInfo.error ? (
                    <p className="text-slate-400 text-sm">{rightClickInfo.error}</p>
                  ) : (
                    <>
                      <p className="text-white text-sm font-semibold">{rightClickInfo.full_address || 'N/A'}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => copy(rightClickInfo.full_address || '')}
                          className="px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/10 text-xs font-medium"
                        >
                          Copy Address
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Pin Details - Modal (center) */}
          {selectedPin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600/40 to-blue-500/30 rounded-xl flex items-center justify-center border border-blue-400/30 shadow-lg">
                      <MapPin className="text-blue-300" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {selectedPin.checkpoint_id ? 'Checkpoint Details' : 'Police Office Details'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">Complete information</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedPin.checkpoint_id ? (
                      <>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Checkpoint Name</p>
                          <p className="font-bold text-white text-lg">{selectedPin.checkpoint_name}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Office</p>
                          <p className="font-bold text-white text-lg">{selectedPin.office_name || 'N/A'}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Location</p>
                          <p className="font-bold text-white text-lg">{selectedPin.location || 'N/A'}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">UUID</p>
                          <p className="font-mono text-sm text-slate-200 break-all font-semibold">{selectedPin.checkpoint_id}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Coordinates</p>
                          <p className="font-mono text-sm text-slate-200 font-semibold">
                            {Number(selectedPin.latitude).toFixed(4)}, {Number(selectedPin.longitude).toFixed(4)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Office Name</p>
                          <p className="font-bold text-white text-lg">{selectedPin.office_name}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Location</p>
                          <p className="font-bold text-white text-lg">
                            {[selectedPin.location_barangay, selectedPin.location_city].filter(Boolean).join(', ') || 'N/A'}
                          </p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Created By</p>
                          <p className="font-bold text-white text-lg">{selectedPin.created_by_username || 'N/A'}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Head Officer</p>
                          <p className="font-bold text-white text-lg">{selectedPin.head_officer || 'N/A'}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Contact</p>
                          <p className="font-bold text-white text-lg">{selectedPin.contact_number || 'N/A'}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">UUID</p>
                          <p className="font-mono text-sm text-slate-200 break-all font-semibold">{selectedPin.office_id}</p>
                        </div>
                        <div className="info-card">
                          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Coordinates</p>
                          <p className="font-mono text-sm text-slate-200 font-semibold">
                            {Number(selectedPin.latitude).toFixed(4)}, {Number(selectedPin.longitude).toFixed(4)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
