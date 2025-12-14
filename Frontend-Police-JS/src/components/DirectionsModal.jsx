import { AlertTriangle, Clock, Copy, ExternalLink, MapPin, Navigation, QrCode, X } from 'lucide-react'
import { GoogleMap, Marker, DirectionsRenderer, useLoadScript } from '@react-google-maps/api'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getReportRoute } from '../services/reportsService'

/**
 * Haversine formula to calculate distance between two coordinates
 * Used as fallback when Google Directions API fails
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const mapContainerStyle = { width: '100%', height: '320px' }

// Marker icons for police office and report categories
const markerIcons = {
  policeOffice: new URL('../assets/markers/checkpoint-active.png', import.meta.url).href,
  violence: new URL('../assets/markers/violence.png', import.meta.url).href,
  threat: new URL('../assets/markers/threat.png', import.meta.url).href,
  theft: new URL('../assets/markers/theft.png', import.meta.url).href,
  vandalism: new URL('../assets/markers/vandalism.png', import.meta.url).href,
  suspicious: new URL('../assets/markers/suspicious.png', import.meta.url).href,
  emergency: new URL('../assets/markers/emergency.png', import.meta.url).href,
  others: new URL('../assets/markers/others.png', import.meta.url).href,
}

// Get appropriate icon based on report category
const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase()
  return markerIcons[cat] || markerIcons.others
}

/**
 * DirectionsModal - Shows route from police office to incident location
 * 
 * Features:
 * - Fetches route data from backend API (includes QR code)
 * - Shows Google Maps with route visualization
 * - Displays distance and ETA (from backend or frontend fallback)
 * - Provides QR code for mobile navigation
 */
const DirectionsModal = ({ report, onClose, onDistanceEtaUpdate }) => {
  const { user } = useAuth()
  const [distance, setDistance] = useState(report.distance || '')
  const [eta, setEta] = useState(report.eta || '')
  const [directions, setDirections] = useState(null)
  const [backendQrCode, setBackendQrCode] = useState(null)
  const [backendDirectionsUrl, setBackendDirectionsUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Get police office location from user context
  const policeStationLocation = useMemo(() => ({
    lat: user?.latitude ? Number(user.latitude) : 14.5995,
    lng: user?.longitude ? Number(user.longitude) : 120.9842,
  }), [user?.latitude, user?.longitude])
  
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY || '' })

  const origin = useMemo(
    () => ({ lat: policeStationLocation.lat, lng: policeStationLocation.lng }),
    [policeStationLocation.lat, policeStationLocation.lng],
  )

  const destination = useMemo(
    () => ({ lat: report.location.lat, lng: report.location.lng }),
    [report.location.lat, report.location.lng],
  )

  const mapCenter = useMemo(() => ({ lat: destination.lat, lng: destination.lng }), [destination])

  const mapOptions = useMemo(
    () => ({
      clickableIcons: false,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
    }),
    [],
  )

  // Fetch route data from backend API
  useEffect(() => {
    const fetchRouteFromBackend = async () => {
      if (!report?.id) return
      
      try {
        setLoading(true)
        const routeData = await getReportRoute(report.id)
        
        // Backend returns: { directions_url, qr_code_base64 }
        if (routeData.directions_url) {
          setBackendDirectionsUrl(routeData.directions_url)
        }
        if (routeData.qr_code_base64) {
          setBackendQrCode(routeData.qr_code_base64)
        }
        
        // If backend provides distance/duration (future enhancement)
        if (routeData.distance) {
          setDistance(routeData.distance)
        }
        if (routeData.duration) {
          setEta(routeData.duration)
        }
        
        setError(null)
      } catch (err) {
        console.error('Failed to fetch route from backend:', err)
        setError(err.message)
        // Continue with frontend fallback
      } finally {
        setLoading(false)
      }
    }
    
    fetchRouteFromBackend()
  }, [report?.id])

  // Calculate fallback distance/ETA using haversine formula
  useEffect(() => {
    // Only use fallback if we don't already have distance/eta
    if (distance && eta) return
    if (report.distance && report.eta) {
      setDistance(report.distance)
      setEta(report.eta)
      return
    }
    
    // Haversine fallback calculation
    const km = haversineKm(
      policeStationLocation.lat,
      policeStationLocation.lng,
      report.location.lat,
      report.location.lng,
    )
    const etaMins = Math.round(km * 2) || 1 // Rough estimate: 2 mins per km
    const distanceText = `${km.toFixed(1)} km`
    const etaText = `${etaMins} mins`
    setDistance(distanceText)
    setEta(etaText)
    if (onDistanceEtaUpdate) onDistanceEtaUpdate(report.id, distanceText, etaText)
  }, [report, onDistanceEtaUpdate, policeStationLocation.lat, policeStationLocation.lng, distance, eta])

  // Fetch Google Directions for map visualization (and more accurate distance/eta)
  useEffect(() => {
    if (!isLoaded || !GOOGLE_MAPS_API_KEY || !window.google) return

    const svc = new window.google.maps.DirectionsService()
    svc.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0]
          // Use Google's more accurate distance/duration if available
          if (leg.distance?.text && leg.duration?.text) {
            setDistance(leg.distance.text)
            setEta(leg.duration.text)
            if (onDistanceEtaUpdate) onDistanceEtaUpdate(report.id, leg.distance.text, leg.duration.text)
          }
          setDirections(result)
        }
      },
    )
  }, [destination, origin, isLoaded, report.id, onDistanceEtaUpdate])

  // Generate directions URL (prefer backend, fallback to frontend-generated)
  const directionsUrl = () => {
    if (backendDirectionsUrl) return backendDirectionsUrl
    return `https://www.google.com/maps/dir/${policeStationLocation.lat},${policeStationLocation.lng}/${report.location.lat},${report.location.lng}`
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(directionsUrl())
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">
              <Navigation className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Directions to Incident</h2>
              <p className="text-sm text-gray-600 font-medium">Report #{report.id?.slice(0, 8)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center text-yellow-700">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error} (using fallback calculation)</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <MapPin className="h-5 w-5 text-primary-600" />
                  </div>
                  Route Map
                </h3>
                <div className="bg-white/40 backdrop-blur-sm rounded-lg border border-white/50 shadow-inner">
                  {!GOOGLE_MAPS_API_KEY ? (
                    <div className="h-[320px] flex items-center justify-center text-sm text-red-600 text-center px-4">
                      Set VITE_GOOGLE_MAPS_API_KEY in .env and restart the dev server to view the map.
                    </div>
                  ) : loadError ? (
                    <div className="h-[320px] flex items-center justify-center text-sm text-red-600">
                      Error loading Google Maps
                    </div>
                  ) : !isLoaded ? (
                    <div className="h-[320px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={13}
                      options={mapOptions}
                    >
                      {directions && (
                        <DirectionsRenderer
                          directions={directions}
                          options={{ suppressMarkers: true, preserveViewport: true }}
                        />
                      )}
                      {/* Police Office marker - uses active checkpoint icon */}
                      <Marker 
                        position={origin} 
                        icon={{
                          url: markerIcons.policeOffice,
                          scaledSize: window.google ? new window.google.maps.Size(40, 40) : undefined,
                        }}
                        title="Police Office"
                      />
                      {/* Incident marker - uses category-specific icon */}
                      <Marker 
                        position={destination} 
                        icon={{
                          url: getCategoryIcon(report.category),
                          scaledSize: window.google ? new window.google.maps.Size(40, 40) : undefined,
                        }}
                        title={`${report.category} Incident`}
                      />
                    </GoogleMap>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => window.open(directionsUrl(), '_blank')} className="btn-primary flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" /> Open in Google Maps
                  </button>
                  <button onClick={handleCopy} className="btn-secondary flex items-center">
                    <Copy className="h-4 w-4 mr-2" /> Copy URL
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="glass-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                      <QrCode className="h-5 w-5 text-indigo-600" />
                    </div>
                    QR Code
                  </h3>
                  {!backendQrCode && <span className="text-xs text-gray-500">(loading...)</span>}
                </div>
                {/* QR Code Container - Adjust w-52 h-52 below to change size */}
                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-6 mb-4 border border-white/50 shadow-inner text-center">
                  {backendQrCode ? (
                    <img 
                      src={backendQrCode} 
                      alt="QR Code for directions" 
                      className="w-52 h-52 mx-auto rounded-lg"
                    />
                  ) : loading ? (
                    <div className="w-52 h-52 mx-auto flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
                    </div>
                  ) : (
                    <div className="w-52 h-52 bg-white/80 backdrop-blur-md rounded-lg mx-auto flex items-center justify-center border-2 border-white/60 shadow-md">
                      <QrCode className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 text-center mb-4">
                  Scan to open directions in Google Maps
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="glass-card bg-blue-50/50 border-blue-200/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Distance</p>
                        <p className="text-lg font-bold text-gray-900">{distance || 'N/A'}</p>
                      </div>
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="glass-card bg-green-50/50 border-green-200/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Estimated Time</p>
                        <p className="text-lg font-bold text-gray-900">{eta || 'N/A'}</p>
                      </div>
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

export default DirectionsModal
