import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Phone,
  User,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getReportDetail } from '../services/reportsService'
import { getReportMedia } from '../services/mediaService'

const ResolvedCaseDetailsModal = ({ case_, onClose }) => {
  const [fullReport, setFullReport] = useState(null)
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Manila',
        })
      : 'N/A'

  useEffect(() => {
    const load = async () => {
      if (!case_?.id) return
      try {
        setLoading(true)
        setLoadError(null)
        const detail = await getReportDetail(case_.id)
        setFullReport(detail)
        const m = await getReportMedia(case_.id)
        setMedia(Array.isArray(m) ? m : [])
      } catch (e) {
        setLoadError(e.message || 'Failed to load full report details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [case_?.id])

  const reporter = fullReport?.reporter || null
  const finalStatus = fullReport?.status || case_?.finalStatus || 'Resolved'
  const dateReported = fullReport?.created_at || case_?.createdAt || case_?.dateReported
  const lat = fullReport?.latitude != null ? Number(fullReport.latitude) : case_?.location?.lat
  const lng = fullReport?.longitude != null ? Number(fullReport.longitude) : case_?.location?.lng
  const incidentAddress =
    fullReport?.incident_address ||
    (case_?.barangay && case_?.city ? `${case_.barangay}, ${case_.city}` : case_?.location?.address) ||
    'Address Pending'

  const images = useMemo(() => media.filter((m) => m.file_type === 'image'), [media])
  const videos = useMemo(() => media.filter((m) => m.file_type === 'video'), [media])

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'violence':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
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
      <div className="modal-content max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">{getCategoryIcon(case_.category)}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resolved Case #{case_.id}</h2>
              <p className="text-sm text-gray-600 font-medium">{case_.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {loadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {loadError}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            </div>
          )}

          <div className="glass-card bg-status-resolved-50/80 backdrop-blur-lg border-2 border-status-resolved-300/50">
            <div className="flex items-start">
              <div className="p-3 bg-status-resolved-100 rounded-lg mr-4">
                <CheckCircle className="h-6 w-6 text-status-resolved-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-status-resolved-900 mb-2">Resolution Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date Resolved</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                      <p className="text-sm font-medium text-gray-900">{formatDate(case_.dateResolved)}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resolution Time</label>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-500 mr-2" />
                      <p className="text-sm font-semibold text-status-resolved-700">{case_.resolutionTime}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Final Status</label>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-status-resolved-100 text-status-resolved-800 border border-status-resolved-300">
                      {finalStatus}
                    </span>
                  </div>
                  {case_.resolutionNotes && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resolution Notes</label>
                      <p className="text-sm text-gray-900 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm leading-relaxed">
                        {case_.resolutionNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              Initial Report Details
            </h3>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Reporter Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                  <p className="text-sm font-medium text-gray-900">{case_.reporterName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 text-gray-500 mr-1" />
                    <p className="text-sm font-medium text-gray-900">{reporter?.phone || case_?.reporterPhone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                  <p className="text-sm font-medium text-gray-900">{reporter?.email || case_?.reporterEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date Reported</label>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 text-gray-500 mr-1" />
                    <p className="text-sm font-medium text-gray-900">{formatDate(dateReported)}</p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Emergency Contact</label>
                  <p className="text-sm font-medium text-gray-900">
                    {reporter?.emergency_contact_name || 'N/A'} ({reporter?.emergency_contact_number || 'N/A'})
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Incident Information
              </h4>
              <div className="space-y-3 pl-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                  <p className="text-sm font-medium text-gray-900">{case_.category}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
                  <div className="flex items-start">
                    <MapPin className="h-3 w-3 text-gray-500 mr-1 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{incidentAddress}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {case_.city}, {case_.barangay}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Coordinates: {lat != null ? lat.toFixed(6) : 'N/A'}, {lng != null ? lng.toFixed(6) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                  <p className="text-sm text-gray-900 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm leading-relaxed">
                    {case_.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <ImageIcon className="h-5 w-5 text-purple-600" />
              </div>
              Attachments ({media.length})
            </h3>
            {media.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No attachments uploaded for this report.</div>
            ) : (
              <div className="space-y-4">
                {images.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Images</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {images.map((m) => (
                        <a key={m.media_id} href={m.file_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={m.file_url}
                            alt="attachment"
                            className="w-full h-28 object-cover rounded-md border border-gray-200 bg-white/60"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {videos.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Videos</div>
                    <ul className="list-disc pl-5 text-sm">
                      {videos.map((m) => (
                        <li key={m.media_id}>
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">
                            Open video
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-3 h-3 rounded-full bg-status-pending-500 border-2 border-white"></div>
                  <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Report Submitted</p>
                  <p className="text-xs text-gray-500">{formatDate(dateReported)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-3 h-3 rounded-full bg-status-resolved-500 border-2 border-white"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Case Resolved</p>
                  <p className="text-xs text-gray-500">{formatDate(case_.dateResolved)}</p>
                  <p className="text-xs text-status-resolved-700 font-medium mt-1">Resolution Time: {case_.resolutionTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResolvedCaseDetailsModal
