import { AlertTriangle, CheckCircle, Copy, Info, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AddCheckpointModal from '../components/AddCheckpointModal'
import DirectionsModal from '../components/DirectionsModal'
import EditCheckpointModal from '../components/EditCheckpointModal'
import ReportDetailsModal from '../components/ReportDetailsModal'
import NavigationTabs from '../components/NavigationTabs'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { getMapData, mapReportToMarker, mapCheckpointToMarker, reverseGeocode } from '../services/mapService'
import { createCheckpoint, updateCheckpoint, deleteCheckpoint, toBackendFormat } from '../services/checkpointsService'
import { updateReportStatus } from '../services/reportsService'
import { POLLING_INTERVALS } from '../constants'

/**
 * 🔑 Google Maps API Key setup (do not hardcode keys in source):
 * 1) Create a .env file (not committed) at the project root.
 * 2) Add: VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
 * 3) Restart dev server so Vite picks up the env var.
 */
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const mapContainerStyle = { width: '100%', height: '100%' }

const markerIcons = {
  checkpointActive: new URL('../assets/markers/checkpoint-active.png', import.meta.url).href,
  checkpointInactive: new URL('../assets/markers/checkpoint-inactive.png', import.meta.url).href,
  violence: new URL('../assets/markers/violence.png', import.meta.url).href,
  threat: new URL('../assets/markers/threat.png', import.meta.url).href,
  theft: new URL('../assets/markers/theft.png', import.meta.url).href,
  vandalism: new URL('../assets/markers/vandalism.png', import.meta.url).href,
  suspicious: new URL('../assets/markers/suspicious.png', import.meta.url).href,
  emergency: new URL('../assets/markers/emergency.png', import.meta.url).href,
  others: new URL('../assets/markers/others.png', import.meta.url).href,
}

const markerSize = (size = 36) => (window.google ? new window.google.maps.Size(size, size) : undefined)
const defaultCenter = { lat: 14.5995, lng: 120.9842 }
const defaultZoom = 12

const checkpointStatusClass = (isActive) => (isActive ? 'text-lime-500' : 'text-gray-500')

const categoryTextClass = (category) => {
  switch (category.toLowerCase()) {
    case 'threat':
      return 'text-indigo-600'
    case 'violence':
      return 'text-amber-500'
    case 'vandalism':
      return 'text-violet-500'
    case 'theft':
      return 'text-slate-400'
    case 'emergency':
      return 'text-red-600'
    case 'suspicious':
      return 'text-teal-500'
    case 'others':
      return 'text-cyan-500'
    default:
      return 'text-gray-600'
  }
}

const checkpointIcon = (status) =>
  status === 'inactive' ? markerIcons.checkpointInactive : markerIcons.checkpointActive

// Helper to compute if a checkpoint is currently active based on time
const isCheckpointActive = (cp) => {
  if (cp.status === 'inactive') return false
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = (cp.timeStart || '00:00').split(':').map(Number)
  const [eh, em] = (cp.timeEnd || '23:59').split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  // Handle overnight schedules (e.g., 22:00 - 06:00)
  if (end < start) return currentMinutes >= start || currentMinutes <= end
  return currentMinutes >= start && currentMinutes <= end
}

// Get the appropriate icon based on filter selection and actual status
const getCheckpointIcon = (cp, filter) => {
  if (filter === 'active') return markerIcons.checkpointActive
  if (filter === 'inactive') return markerIcons.checkpointInactive
  // filter === 'all': show based on actual computed active state
  return isCheckpointActive(cp) ? markerIcons.checkpointActive : markerIcons.checkpointInactive
}

const categoryIcon = (category) => {
  switch (category.toLowerCase()) {
    case 'violence':
      return markerIcons.violence
    case 'threat':
      return markerIcons.threat
    case 'theft':
      return markerIcons.theft
    case 'vandalism':
      return markerIcons.vandalism
    case 'suspicious':
      return markerIcons.suspicious
    case 'emergency':
      return markerIcons.emergency
    default:
      return markerIcons.others
  }
}

const MapPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY || '' })
  const [checkpoints, setCheckpoints] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportForModal, setReportForModal] = useState(null)
  const [checkpointFilter, setCheckpointFilter] = useState('all')
  const [reportFilter, setReportFilter] = useState('all')
  const [reportScope, setReportScope] = useState('our_office') // 'our_office' or 'all'
  const [checkpointScope, setCheckpointScope] = useState('our_office') // 'our_office' or 'all'
  const [activeFilters, setActiveFilters] = useState({ reports: true, policeCheckpoint: true })
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedPin, setSelectedPin] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { lat, lng, address_line, barangay, city, full_address, loading, error }

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Handle right-click on map to show coordinates
  const handleMapRightClick = async (e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    
    // Set context menu with loading state
    setContextMenu({
      lat,
      lng,
      address_line: null,
      barangay: null,
      city: null,
      full_address: null,
      loading: true,
      error: null,
    })
    
    // Fetch full address from backend
    try {
      const geocodeData = await reverseGeocode(lat, lng)
      setContextMenu(prev => prev ? {
        ...prev,
        address_line: geocodeData.address_line || null,
        barangay: geocodeData.barangay || null,
        city: geocodeData.city || null,
        full_address: geocodeData.full_address || null,
        loading: false,
        error: null,
      } : null)
    } catch (error) {
      console.error('Failed to geocode:', error)
      setContextMenu(prev => prev ? { ...prev, loading: false, error: 'Unable to geocode this location.' } : null)
    }
  }

  // Copy coordinates to clipboard
  const copyCoordinates = (format) => {
    if (!contextMenu) return
    let text = ''
    if (format === 'both') {
      text = `${contextMenu.lat.toFixed(7)}, ${contextMenu.lng.toFixed(7)}`
    } else if (format === 'lat') {
      text = String(contextMenu.lat.toFixed(7))
    } else if (format === 'lng') {
      text = String(contextMenu.lng.toFixed(7))
    }
    navigator.clipboard.writeText(text)
    showToast(`Copied: ${text}`, 'success')
  }

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])


  // Fetch map data from backend
  const fetchMapData = useCallback(async () => {
    try {
      const data = await getMapData({
        scopeReports: reportScope,
        scopeCheckpoints: checkpointScope,
      })
      
      // Transform backend data to frontend format
      const transformedReports = (data.active_reports || []).map(mapReportToMarker)
      const transformedCheckpoints = (data.active_checkpoints || []).map(mapCheckpointToMarker)

      setReports(transformedReports)
      setCheckpoints(transformedCheckpoints)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch map data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [reportScope, checkpointScope])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    // Initial fetch
    fetchMapData()

    // Polling interval - refreshes map data (reports, offices, checkpoints)
    const pollInterval = setInterval(fetchMapData, POLLING_INTERVALS.LIVE_MAP)

    return () => clearInterval(pollInterval)
  }, [isAuthenticated, navigate, fetchMapData])

  const filteredCheckpoints = useMemo(() => {
    if (checkpointFilter === 'all') return checkpoints
    if (checkpointFilter === 'active') return checkpoints.filter(isCheckpointActive)
    return checkpoints.filter((cp) => !isCheckpointActive(cp))
  }, [checkpointFilter, checkpoints])

  // Filter reports by status
  const filteredReports = useMemo(() => {
    if (reportFilter === 'all') return reports
    // Map filter values to actual status strings
    const statusMap = {
      pending: 'Pending',
      acknowledged: 'Acknowledged',
      'en-route': 'En Route',
      'on-scene': 'On Scene',
      resolved: 'Resolved',
      cancelled: 'Canceled',
    }
    const targetStatus = statusMap[reportFilter]
    return reports.filter((r) => r.status === targetStatus)
  }, [reportFilter, reports])

  // Create checkpoint via API
  const handleAdd = async (cpData) => {
    try {
      // Get current user's office ID for the checkpoint
      const officeId = user?.office_id
      if (!officeId) {
        showToast('Unable to determine your office. Please log in again.', 'error')
        return
      }

      const backendData = toBackendFormat(cpData, officeId)
      await createCheckpoint(backendData)
      
      showToast('Checkpoint created successfully', 'success')
      setShowAdd(false)
      
      // Refresh map data
      fetchMapData()
    } catch (err) {
      console.error('Failed to create checkpoint:', err)
      showToast(err.message || 'Failed to create checkpoint', 'error')
    }
  }

  // Update checkpoint via API
  const handleUpdate = async (cpData) => {
    try {
      const officeId = user?.office_id || cpData.officeId
      const backendData = toBackendFormat(cpData, officeId)
      
      await updateCheckpoint(cpData.id, backendData)
      
      showToast('Checkpoint updated successfully', 'success')
      setShowEdit(false)
      setEditTarget(null)
      
      // Refresh map data
      fetchMapData()
    } catch (err) {
      console.error('Failed to update checkpoint:', err)
      showToast(err.message || 'Failed to update checkpoint', 'error')
    }
  }

  // Delete checkpoint via API
  const handleDelete = async (id) => {
    try {
      await deleteCheckpoint(id)
      
      showToast('Checkpoint deleted successfully', 'success')
      setShowEdit(false)
      setEditTarget(null)
      
      // Refresh map data
      fetchMapData()
    } catch (err) {
      console.error('Failed to delete checkpoint:', err)
      showToast(err.message || 'Failed to delete checkpoint', 'error')
    }
  }

  const handleDistanceEtaUpdate = (reportId, distance, eta) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, distance, eta } : r)))
  }

  // Update report status via API
  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await updateReportStatus(reportId, newStatus)
      
      // Update local state
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)))
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
      if (reportForModal?.id === reportId) {
        setReportForModal((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
      
      showToast(`Report status updated to ${newStatus}`, 'success')
      
      // If resolved, the report will be removed on next poll
      if (newStatus === 'Resolved') {
        fetchMapData()
      }
    } catch (err) {
      console.error('Failed to update report status:', err)
      showToast(err.message || 'Failed to update status', 'error')
    }
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold text-red-600">Google Maps API key is missing.</p>
          <p className="text-sm text-gray-700">
            Create a <code>.env</code> file in the project root with <code>VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>, then restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error loading Google Maps</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <PageHeader />
      <div className="w-full max-w-7xl mx-auto px-6 py-4 pt-20">
        <NavigationTabs activeTab="map" />

        <div className="glass-card-strong h-[calc(100vh-120px)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Live Map Monitoring</h2>
            <div className="flex space-x-2">
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Checkpoint
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <button
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors flex items-center ${
                activeFilters.reports
                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent'
              }`}
              onClick={() => setActiveFilters((prev) => ({ ...prev, reports: !prev.reports }))}
            >
              <span className={`w-3 h-3 rounded-full mr-2 ${activeFilters.reports ? 'bg-red-500' : 'bg-gray-400'}`} />
              Reports
            </button>
            {activeFilters.reports && (
              <>
                <select
                  value={reportScope}
                  onChange={(e) => setReportScope(e.target.value)}
                  className="px-4 py-2 rounded-2xl text-sm font-medium border-2 border-red-500 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                >
                  <option value="our_office">Our Office</option>
                  <option value="all">All Offices</option>
                </select>
                <select
                  value={reportFilter}
                  onChange={(e) => setReportFilter(e.target.value)}
                  className="px-4 py-2 rounded-2xl text-sm font-medium border-2 border-red-500 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="en-route">En Route</option>
                  <option value="on-scene">On Scene</option>
                  <option value="resolved">Resolved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </>
            )}
            <button
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors flex items-center ${
                activeFilters.policeCheckpoint
                  ? 'bg-primary-100 text-primary-700 border-2 border-primary-600'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent'
              }`}
              onClick={() => setActiveFilters((prev) => ({ ...prev, policeCheckpoint: !prev.policeCheckpoint }))}
            >
              <span className={`w-3 h-3 rounded-full mr-2 ${activeFilters.policeCheckpoint ? 'bg-primary-600' : 'bg-gray-400'}`} />
              Police Checkpoints
            </button>
            {activeFilters.policeCheckpoint && (
              <>
                <select
                  value={checkpointScope}
                  onChange={(e) => setCheckpointScope(e.target.value)}
                  className="px-4 py-2 rounded-2xl text-sm font-medium border-2 border-primary-600 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <option value="our_office">Our Checkpoints</option>
                  <option value="all">All Checkpoints</option>
                </select>
                <select
                  value={checkpointFilter}
                  onChange={(e) => setCheckpointFilter(e.target.value)}
                  className="px-4 py-2 rounded-2xl text-sm font-medium border-2 border-primary-600 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </>
            )}
          </div>

          <div className="relative flex-1 min-h-[400px] rounded-2xl overflow-hidden border border-white/60 shadow-inner">
            <GoogleMap 
              mapContainerStyle={mapContainerStyle} 
              center={defaultCenter} 
              zoom={defaultZoom}
              onRightClick={handleMapRightClick}
              onClick={() => setContextMenu(null)}
            >
              {activeFilters.policeCheckpoint &&
                filteredCheckpoints.map((cp) => (
                  <Marker
                    key={`cp-${cp.id}`}
                    position={{ lat: cp.location.lat, lng: cp.location.lng }}
                    icon={{
                      url: getCheckpointIcon(cp, checkpointFilter),
                      scaledSize: markerSize(40),
                    }}
                    onClick={() => setSelectedPin({ type: 'checkpoint', data: cp })}
                  />
                ))}

              {activeFilters.reports &&
                filteredReports.map((r) => (
                  <Marker
                    key={`r-${r.id}`}
                    position={{ lat: r.location.lat, lng: r.location.lng }}
                    icon={{
                      url: categoryIcon(r.category),
                      scaledSize: markerSize(40),
                    }}
                    onClick={() => setSelectedPin({ type: 'report', data: r })}
                  />
                ))}
            </GoogleMap>

            {/* Right-click info panel (corner) - styled like Admin, but Police theme */}
            {contextMenu && (
              <div
                className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/50 p-4 w-[360px] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-gray-900 font-semibold">Map location</p>
                    <p className="text-xs text-gray-600 mt-1">Right-click anywhere on the map to refresh</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContextMenu(null)}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-mono text-primary-700">
                      {contextMenu.lat.toFixed(7)}, {contextMenu.lng.toFixed(7)}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyCoordinates('both')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-xs font-semibold shadow"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                  </div>

                  {contextMenu.loading ? (
                    <p className="text-gray-600 text-sm">Getting address…</p>
                  ) : contextMenu.error ? (
                    <p className="text-gray-600 text-sm">{contextMenu.error}</p>
                  ) : (
                    <>
                      <p className="text-gray-900 text-sm font-semibold">{contextMenu.full_address || 'N/A'}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedPin && (
              <div className="absolute bottom-4 right-4 max-w-xs bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/50 p-3 z-30">
                <div className="flex items-start justify-between mb-2">
                  {selectedPin.type === 'report' && selectedPin.data && (
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2 truncate">
                      <span className={categoryTextClass(selectedPin.data.category)}>
                        {selectedPin.data.category}
                      </span>
                    </h3>
                  )}
                  {selectedPin.type === 'checkpoint' && selectedPin.data && (
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2 truncate">
                      {selectedPin.data.name}
                    </h3>
                  )}
                  <button
                    onClick={() => setSelectedPin(null)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                {selectedPin.type === 'report' && selectedPin.data && (
                  <>
                    <div className="space-y-1.5 mb-3">
                      <p className="text-xs text-gray-700 truncate">
                        <span className="font-medium">Status:</span>{' '}
                        <span className={`font-semibold ${
                          selectedPin.data.status === 'Pending' ? 'text-yellow-600' :
                          selectedPin.data.status === 'Acknowledged' ? 'text-blue-600' :
                          selectedPin.data.status === 'En Route' ? 'text-purple-600' :
                          selectedPin.data.status === 'On Scene' ? 'text-orange-600' :
                          selectedPin.data.status === 'Resolved' ? 'text-green-600' :
                          selectedPin.data.status === 'Canceled' ? 'text-gray-500' : 'text-gray-600'
                        }`}>{selectedPin.data.status}</span>
                      </p>
                      <p className="text-xs text-gray-700 truncate">
                        <span className="font-medium">Reporter:</span> {selectedPin.data.reporterName}
                      </p>
                      <p className="text-xs text-gray-700 truncate">
                        <span className="font-medium">Location:</span> {selectedPin.data.barangay || selectedPin.data.location.barangay}, {selectedPin.data.city || selectedPin.data.location.city}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setReportForModal(selectedPin.data)
                          setShowReportModal(true)
                          setSelectedPin(null)
                        }}
                        className="btn-primary text-xs py-1.5 px-3 w-full"
                      >
                        View Full Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(selectedPin.data)
                          setSelectedPin(null)
                        }}
                        className="btn-secondary text-xs py-1.5 px-3 w-full"
                      >
                        Directions
                      </button>
                    </div>
                  </>
                )}

                {selectedPin.type === 'checkpoint' && selectedPin.data && (() => {
                  const checkpoint = selectedPin.data
                  const isActive = () => {
                    const now = new Date()
                    const currentMinutes = now.getHours() * 60 + now.getMinutes()
                    const [sh, sm] = checkpoint.timeStart.split(':').map(Number)
                    const [eh, em] = checkpoint.timeEnd.split(':').map(Number)
                    const start = sh * 60 + sm
                    const end = eh * 60 + em
                    if (end < start) return currentMinutes >= start || currentMinutes <= end
                    return currentMinutes >= start && currentMinutes <= end
                  }
                  const formatOperatingHours = () => {
                    if ((checkpoint.timeStart === '00:00' && checkpoint.timeEnd === '23:59') ||
                      (checkpoint.timeStart === '00:00' && checkpoint.timeEnd === '00:00')) return '24/7'
                    return `${checkpoint.timeStart} - ${checkpoint.timeEnd}`
                  }
                  return (
                    <>
                      <div className="space-y-1.5 mb-3">
                        <p className="text-xs text-gray-600 truncate">
                          <span className="font-medium">Status:</span>{' '}
                          <span className={`font-semibold ${checkpointStatusClass(isActive())}`}>
                            {isActive() ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          <span className="font-medium">Officers:</span> {checkpoint.assignedOfficers.join(', ')}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Time:</span> {formatOperatingHours()}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Contact:</span> {checkpoint.contactNumber}
                        </p>
                        <p className="text-xs text-gray-500 pt-1.5 border-t border-gray-200 line-clamp-2">
                          {checkpoint.location.address}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <button
                          onClick={() => {
                            setEditTarget(checkpoint)
                            setShowEdit(true)
                            setSelectedPin(null)
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center w-full"
                        >
                          <Pencil className="h-3 w-3 mr-1.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPin(null)
                            handleDelete(checkpoint.id)
                          }}
                          className="btn-danger text-xs py-1.5 px-3 flex items-center justify-center w-full"
                        >
                          <Trash2 className="h-3 w-3 mr-1.5" />
                          Remove
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddCheckpointModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}

      {showEdit && editTarget && (
        <EditCheckpointModal
          checkpoint={editTarget}
          onClose={() => {
            setShowEdit(false)
            setEditTarget(null)
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {selectedReport && (
        <DirectionsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDistanceEtaUpdate={handleDistanceEtaUpdate}
        />
      )}

      {showReportModal && reportForModal && (
        <ReportDetailsModal
          report={reportForModal}
          onClose={() => {
            setShowReportModal(false)
            setReportForModal(null)
          }}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.type === 'error' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default MapPage
