import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Eye,
  Home,
  MapPinned,
  MessageSquare,
  Map,
  MapPin,
  Navigation,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import NavigationTabs from '../components/NavigationTabs'
import DirectionsModal from '../components/DirectionsModal'
import ReportChatModal from '../components/ReportChatModal'
import ReportDetailsModal from '../components/ReportDetailsModal'
import { useAuth } from '../contexts/AuthContext'
import { getActiveReports, getReportDetail, updateReportStatus } from '../services/reportsService'

/**
 * Helper function: Transform backend report format to frontend format
 * Backend uses snake_case and different field names, frontend expects camelCase
 * This keeps components unchanged while adapting to backend structure
 */
const mapBackendReportToFrontend = (backendReport) => {
  // Parse incident_address "Barangay, City" into separate fields
  const [barangay, city] = backendReport.incident_address?.split(', ') || ['', '']
  
  return {
    id: backendReport.report_id,
    reporterId: backendReport.reporter?.user_id || null, // Needed for chat messages
    reporterName: backendReport.reporter_full_name || 'Anonymous',
    reporterPhone: backendReport.reporter?.phone || 'N/A',  // Only available in detail view
    reporterEmail: backendReport.reporter?.email || 'N/A',  // Only available in detail view
    city: city || backendReport.location_city || '',
    barangay: barangay || backendReport.location_barangay || '',
    category: backendReport.category,
    status: backendReport.status,
    description: backendReport.description || 'No description provided',
    location: {
      lat: backendReport.latitude != null ? Number(backendReport.latitude) : null,
      lng: backendReport.longitude != null ? Number(backendReport.longitude) : null,
      address: backendReport.incident_address || 'Address Pending',
    },
    timestamp: backendReport.created_at,
    // These fields require detail endpoint, set defaults for now
    attachments: [],
    emergencyContact: {
      name: backendReport.reporter?.emergency_contact_name || 'N/A',
      phone: backendReport.reporter?.emergency_contact_number || 'N/A',
    },
    reporterAddress: {
      region: backendReport.reporter?.region || null,
      city: backendReport.reporter?.city || null,
      barangay: backendReport.reporter?.barangay || null,
    },
  }
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [error, setError] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [loadingReportId, setLoadingReportId] = useState(null)
  const [toast, setToast] = useState(null)

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 1000)
  }

  // Fetch real reports from backend on mount
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const fetchReports = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Call backend API to get active reports (excludes resolved/canceled)
        const backendReports = await getActiveReports()
        
        // Transform backend format to frontend format
        const frontendReports = backendReports.map(mapBackendReportToFrontend)
        
        setReports(frontendReports)
      } catch (err) {
        console.error('Failed to fetch reports:', err)
        setError(err.message || 'Unable to load reports. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [isAuthenticated, navigate])

  /**
   * Handle "View" button click - fetch full report details
   * List view has limited data, detail view needs reporter phone, emergency contact, etc.
   */
  const handleViewReport = async (report) => {
    setLoadingReportId(report.id)
    try {
      // Fetch complete report data from backend
      const fullReport = await getReportDetail(report.id)
      
      // Transform to frontend format with complete data
      const completeReport = mapBackendReportToFrontend(fullReport)
      
      setSelectedReport(completeReport)
      setShowReportModal(true)
    } catch (err) {
      console.error('Failed to fetch report details:', err)
      showToast(err.message || 'Unable to load report details', 'error')
      // Fallback: show list data if detail fetch fails
      setSelectedReport(report)
      setShowReportModal(true)
    } finally {
      setLoadingReportId(null)
    }
  }

  const handleViewDirections = (report) => {
    setSelectedReport(report)
    setShowDirectionsModal(true)
  }

  const handleOpenChat = (report) => {
    setSelectedReport(report)
    setShowChatModal(true)
  }

  const handleCloseChat = () => {
    setShowChatModal(false)
    setSelectedReport(null)
  }

  /**
   * Handle status change - update in backend and local state
   * Flow: pending → acknowledged → en-route → on-scene → resolved
   */
  const handleStatusChange = async (reportId, newStatus, remarks = '') => {
    try {
      // Call backend API to update status
      await updateReportStatus(reportId, newStatus, remarks)
      
      // Update local state on success
      setReports((prev) => 
        prev.map((report) => 
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      )
      
      // Update selected report if it's the one being changed
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport((prev) => prev ? { ...prev, status: newStatus } : null)
      }
      
      showToast(`Report status updated to ${newStatus}`, 'success')
      
    } catch (err) {
      console.error('Failed to update status:', err)
      showToast(err.message || 'Failed to update status. Please try again.', 'error')
    }
  }

  const handleDistanceEtaUpdate = (reportId, distance, eta) => {
    setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, distance, eta } : report)))
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport((prev) => (prev ? { ...prev, distance, eta } : null))
    }
  }

  const getStatusBadge = (status) => {
    // Backend uses capitalized status values (e.g., "Pending", "En Route")
    // Map them to CSS classes (lowercase with hyphens)
    const statusConfig = {
      'Pending': { label: 'Pending', className: 'status-pending' },
      'Acknowledged': { label: 'Acknowledged', className: 'status-acknowledged' },
      'En Route': { label: 'En Route', className: 'status-en-route' },
      'On Scene': { label: 'On Scene', className: 'status-on-scene' },
      'Resolved': { label: 'Resolved', className: 'status-resolved' },
      'Canceled': { label: 'Canceled', className: 'status-canceled' },
    }

    const config = statusConfig[status] || statusConfig['Pending']
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>
    )
  }

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'violence':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'threat':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'theft':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'vandalism':
        return <AlertTriangle className="h-4 w-4 text-purple-500" />
      case 'suspicious':
        return <AlertTriangle className="h-4 w-4 text-indigo-500" />
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-cyan-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  // Show error message if API call failed
  if (error) {
    return (
      <div className="min-h-screen">
        <PageHeader />
        <div className="w-full max-w-7xl mx-auto px-6 py-4 pt-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Unable to Load Reports</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <PageHeader />

      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex-1 pt-20">
        <NavigationTabs activeTab="dashboard" />

        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="glass-card hover:bg-white/85 transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-status-pending-100 rounded-lg">
                  <Clock className="h-7 w-7 text-status-pending-600" />
                </div>
                <div className="ml-4">
                  <p className="text-xs font-semibold text-status-pending-700">Pending</p>
                  <p className="text-2xl font-bold text-status-pending-700">
                    {reports.filter((r) => r.status === 'Pending').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card hover:bg-white/85 transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-status-acknowledged-100 rounded-lg">
                  <Eye className="h-7 w-7 text-status-acknowledged-600" />
                </div>
                <div className="ml-4">
                  <p className="text-xs font-semibold text-status-acknowledged-700">Acknowledged</p>
                  <p className="text-2xl font-bold text-status-acknowledged-700">
                    {reports.filter((r) => r.status === 'Acknowledged').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card hover:bg-white/85 transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-status-enroute-100 rounded-lg">
                  <Navigation className="h-7 w-7 text-status-enroute-600" />
                </div>
                <div className="ml-4">
                  <p className="text-xs font-semibold text-status-enroute-700">En Route</p>
                  <p className="text-2xl font-bold text-status-enroute-700">
                    {reports.filter((r) => r.status === 'En Route').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card hover:bg-white/85 transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MapPinned className="h-7 w-7 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-xs font-semibold text-purple-700">On Scene</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {reports.filter((r) => r.status === 'On Scene').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card hover:bg-white/85 transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-status-resolved-100 rounded-lg">
                  <CheckCircle className="h-7 w-7 text-status-resolved-600" />
                </div>
                <div className="ml-4">
                  <p className="text-xs font-semibold text-status-resolved-700">Resolved</p>
                  <p className="text-2xl font-bold text-status-resolved-700">
                    {reports.filter((r) => r.status === 'Resolved').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Reports Table */}
          <div className="glass-card-strong">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Active Reports</h2>
              <div className="text-xs font-medium text-gray-600">{reports.length} total reports</div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white/60 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Reporter
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/30 divide-y divide-gray-200/50">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <AlertTriangle className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-lg font-semibold text-gray-700">No Active Reports</p>
                          <p className="text-sm text-gray-500 mt-1">All reports have been resolved or there are no pending incidents.</p>
                        </div>
                      </td>
                    </tr>
                  ) : reports.map((report) => (
                    <tr key={report.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{report.reporterName}</div>
                            <div className="text-xs text-gray-500">{report.reporterPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {getCategoryIcon(report.category)}
                          <span className="ml-2 text-sm text-gray-900">{report.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {report.city}, {report.barangay}
                            </div>
                            <div className="text-xs text-gray-500">{report.location.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(report.status)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatTimestamp(report.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewReport(report)}
                            disabled={loadingReportId === report.id}
                            className="text-primary-600 hover:text-primary-800 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingReportId === report.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-1" />
                            ) : (
                              <Eye className="h-3 w-3 mr-1" />
                            )}
                            View
                          </button>
                          <button
                            onClick={() => handleViewDirections(report)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Directions
                          </button>
                          <button
                            onClick={() => handleOpenChat(report)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Open Chat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showReportModal && selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setShowReportModal(false)}
          onStatusChange={handleStatusChange}
          onDistanceEtaUpdate={handleDistanceEtaUpdate}
        />
      )}

      {showDirectionsModal && selectedReport && (
        <DirectionsModal
          report={selectedReport}
          onClose={() => setShowDirectionsModal(false)}
          onDistanceEtaUpdate={handleDistanceEtaUpdate}
        />
      )}

      {showChatModal && selectedReport && user && (
        <ReportChatModal report={selectedReport} userId={user.id} onClose={handleCloseChat} />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm transition-all ${
          toast.type === 'success' 
            ? 'bg-green-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
