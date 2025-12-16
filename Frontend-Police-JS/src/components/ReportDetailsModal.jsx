import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getReportMedia } from '../services/mediaService'
import { useAuth } from '../contexts/AuthContext'

// Backend status options (capitalized strings)
const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'En Route', label: 'En Route' },
  { value: 'On Scene', label: 'On Scene' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Canceled', label: 'Canceled' },
]

const ReportDetailsModal = ({ report, onClose, onStatusChange, onOpenChat, onDistanceEtaUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(report.status || 'Pending')
  const [remarks, setRemarks] = useState(report.remarks || '')
  const [showAttachments, setShowAttachments] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState(null)
  const { user } = useAuth()
  const [computedDistance, setComputedDistance] = useState(null)
  const [computedEta, setComputedEta] = useState(null)

  useEffect(() => {
    setSelectedStatus(report.status || 'Pending')
    setRemarks(report.remarks || '')
  }, [report.status, report.remarks])

  // If distance/eta are missing, compute a simple fallback using haversine + assumed speed.
  useEffect(() => {
    const officeLat = user?.latitude != null ? Number(user.latitude) : null
    const officeLng = user?.longitude != null ? Number(user.longitude) : null
    const repLat = report?.location?.lat != null ? Number(report.location.lat) : null
    const repLng = report?.location?.lng != null ? Number(report.location.lng) : null
    if (officeLat == null || officeLng == null || repLat == null || repLng == null) return
    if (report?.distance && report?.eta) return

    const toRad = (v) => (v * Math.PI) / 180
    const R = 6371
    const dLat = toRad(repLat - officeLat)
    const dLng = toRad(repLng - officeLng)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(officeLat)) * Math.cos(toRad(repLat)) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.asin(Math.sqrt(a))
    const km = R * c

    const distanceText = `${km.toFixed(1)} km`
    // assume ~35km/h average city response speed + small dispatch overhead
    const minutes = Math.max(1, Math.round((km / 35) * 60 + 3))
    const etaText = `${minutes} mins`

    setComputedDistance(distanceText)
    setComputedEta(etaText)
    if (onDistanceEtaUpdate && report?.id) onDistanceEtaUpdate(report.id, distanceText, etaText)
  }, [user?.latitude, user?.longitude, report?.id, report?.distance, report?.eta, report?.location?.lat, report?.location?.lng, onDistanceEtaUpdate])

  // Fetch attachments for this report when modal opens
  useEffect(() => {
    const fetchMedia = async () => {
      if (!report?.id) return
      try {
        setAttachmentsLoading(true)
        setAttachmentsError(null)
        const media = await getReportMedia(report.id)
        setAttachments(Array.isArray(media) ? media : [])
      } catch (err) {
        setAttachmentsError(err.message || 'Failed to load attachments')
      } finally {
        setAttachmentsLoading(false)
      }
    }

    fetchMedia()
  }, [report?.id])


  const handleStatusChange = () => {
    if (selectedStatus !== report.status && onStatusChange) {
      onStatusChange(report.id, selectedStatus, remarks)
    } else if (onStatusChange && remarks !== (report.remarks || '')) {
      // If only remarks changed, still update
      onStatusChange(report.id, selectedStatus, remarks)
    }
    onClose()
  }

  const getStatusOptions = () => STATUS_OPTIONS

  const formatTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    })

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'violence':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'threat':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'theft':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'vandalism':
        return <AlertTriangle className="h-5 w-5 text-purple-500" />
      case 'suspicious':
        return <AlertTriangle className="h-5 w-5 text-indigo-500" />
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-cyan-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">{getCategoryIcon(report.category)}</div>
            <h2 className="text-xl font-bold text-gray-900">Report #{report.id}</h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenChat && (
              <button
                className="btn-secondary flex items-center gap-2 text-sm"
                onClick={() => onOpenChat(report)}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="glass-card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg mr-3">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              Reporter Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <p className="text-sm font-medium text-gray-900">{report.reporterName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-900">{report.reporterPhone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-900">{report.reporterEmail || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Emergency Contact</label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.emergencyContact?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-600">{report.emergencyContact?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reporter Address</label>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-900">
                    {[report.reporterAddress?.region, report.reporterAddress?.city, report.reporterAddress?.barangay]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              Incident Details
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <p className="text-sm font-medium text-gray-900">{report.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Status</label>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'Pending'
                        ? 'status-pending'
                        : report.status === 'Acknowledged'
                        ? 'status-acknowledged'
                        : report.status === 'En Route'
                        ? 'status-en-route'
                        : report.status === 'On Scene'
                        ? 'status-on-scene'
                        : report.status === 'Resolved'
                        ? 'status-resolved'
                        : 'status-canceled'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <p className="text-sm text-gray-900 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm leading-relaxed">
                  {report.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.location.address || 'Address Pending'}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {report.city || 'N/A'}, {report.barangay || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Coordinates: {report.location.lat != null ? report.location.lat.toFixed(6) : 'N/A'}, {report.location.lng != null ? report.location.lng.toFixed(6) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reported At</label>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-900">{formatTimestamp(report.timestamp)}</p>
                </div>
              </div>

              {report.remarks && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks</label>
                  <p className="text-sm text-gray-900 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm leading-relaxed">
                    {report.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAttachments(!showAttachments)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <ImageIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  Attachments ({attachments.length})
                </h3>
                {showAttachments ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            {attachmentsError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {attachmentsError}
              </div>
            )}

            {showAttachments && (
              <div className="mt-4">
                {attachmentsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No attachments uploaded for this report.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {attachments.map((m) => (
                      <div
                        key={m.media_id}
                        className="rounded-lg bg-white/60 border border-gray-200 p-2 overflow-hidden"
                      >
                        {m.file_type === 'image' ? (
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={m.file_url}
                              alt="attachment"
                              className="w-full h-28 object-cover rounded-md"
                            />
                          </a>
                        ) : (
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-700 hover:underline"
                          >
                            Open video
                          </a>
                        )}
                        <div className="mt-2 text-xs text-gray-500 break-all">{m.file_url}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Backward compatibility: if report.attachments exists (old mock data), show it too */}
          {Array.isArray(report.attachments) && report.attachments.length > 0 && (
            <div className="glass-card">
              <button
                onClick={() => setShowAttachments(!showAttachments)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <ImageIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  Attachments ({report.attachments.length})
                </h3>
                {showAttachments ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {showAttachments && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.attachments.map((attachment, index) => (
                    <div key={index} className="aspect-video rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-600">
                      {attachment}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add notes about this report (e.g., actions taken, observations)..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field max-w-[200px]"
            >
              {getStatusOptions().map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleStatusChange} className="btn-primary">
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetailsModal
