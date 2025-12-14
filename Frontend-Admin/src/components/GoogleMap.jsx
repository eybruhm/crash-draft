import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsApi } from '../utils/googleMaps'
import { GOOGLE_API_KEY } from '../constants'

/**
 * GoogleMap Component
 * 
 * Displays a Google Maps instance with markers for police office locations
 * 
 * @param {Object} props
 * @param {Array} props.markers - Array of marker objects with {id, lat, lng, officeName, ...}
 * @param {Function} props.onMarkerClick - Callback when a marker is clicked
 * @param {Function} props.onInfoWindowClose - Callback when info window is closed
 * @param {Object} props.selectedMarker - Currently selected marker object
 * @param {Object} props.defaultCenter - Default center coordinates {lat, lng}
 * @param {number} props.defaultZoom - Default zoom level
 */
export default function GoogleMap({ 
  markers = [], 
  onMarkerClick,
  onInfoWindowClose,
  selectedMarker,
  defaultCenter = { lat: 14.5995, lng: 120.9842 }, // Default to Manila, Philippines
  defaultZoom = 10 
}) {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [googleMaps, setGoogleMaps] = useState(null)
  const [mapMarkers, setMapMarkers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const hasInitialBoundsSet = useRef(false)
  const userHasInteracted = useRef(false)
  const lastMarkerIds = useRef(new Set())

  // Timeout to show error if loading takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && !map && !error) {
        console.error('[GoogleMap] Loading timeout - showing error')
        setError('Google Maps is taking too long to load. Please check: 1) Your internet connection, 2) API key is valid, 3) Maps JavaScript API is enabled in Google Cloud Console, 4) No domain restrictions blocking localhost. Check browser console (F12) for details.')
        setIsLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading, map, error])

  // Load Google Maps API and initialize map
  useEffect(() => {
    let isMounted = true
    let initTimeout = null
    let retryCount = 0
    const maxRetries = 10

    if (map) {
      setIsLoading(false)
      return
    }

    const loadMap = () => {
      loadGoogleMapsApi(GOOGLE_API_KEY, { libraries: ['places', 'geometry'] })
        .then((maps) => {
          if (!isMounted || map) {
            return
          }
          
          if (!maps) {
            setError('Failed to load Google Maps API - maps object is null. Check console for details.')
            setIsLoading(false)
            return
          }

          setGoogleMaps(maps)

          // Wait for mapRef to be ready
          const tryInit = () => {
            if (!isMounted || map) return

            if (!mapRef.current) {
              retryCount++
              if (retryCount < maxRetries) {
                initTimeout = setTimeout(tryInit, 100)
              } else {
                console.error('[GoogleMap] Map ref never became available')
                setError('Map container not found. Please refresh the page.')
                setIsLoading(false)
              }
              return
            }

            try {
              const mapInstance = new maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: defaultZoom,
                styles: [
                  {
                    featureType: 'all',
                    elementType: 'geometry',
                    stylers: [{ color: '#242f3e' }]
                  },
                  {
                    featureType: 'all',
                    elementType: 'labels.text.stroke',
                    stylers: [{ visibility: 'on' }, { color: '#242f3e' }, { weight: 2 }]
                  },
                  {
                    featureType: 'all',
                    elementType: 'labels.text.fill',
                    stylers: [{ visibility: 'on' }, { color: '#746855' }]
                  },
                  {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#17263c' }]
                  },
                  {
                    featureType: 'road',
                    elementType: 'geometry',
                    stylers: [{ color: '#38414e' }]
                  },
                  {
                    featureType: 'poi',
                    elementType: 'geometry',
                    stylers: [{ color: '#1f2937' }]
                  }
                ],
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: true,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: true
              })

              setMap(mapInstance)
              setIsLoading(false)
            } catch (err) {
              console.error('[GoogleMap] Error initializing map:', err)
              setError(`Error initializing map: ${err.message}. Check browser console for details.`)
              setIsLoading(false)
            }
          }

          tryInit()
        })
        .catch((err) => {
          if (!isMounted) return
          console.error('[GoogleMap] Error loading Google Maps:', err)
          console.error('[GoogleMap] Full error:', err)
          setError(`Failed to load Google Maps: ${err.message}. Check browser console (F12) for details.`)
          setIsLoading(false)
        })
    }

    loadMap()

    return () => {
      isMounted = false
      if (initTimeout) clearTimeout(initTimeout)
    }
  }, []) // Only run once on mount

  // Track user interaction with the map
  useEffect(() => {
    if (!map || !googleMaps) return

    const handleDragStart = () => {
      userHasInteracted.current = true
    }

    const handleZoomChanged = () => {
      if (map.getZoom() !== defaultZoom) {
        userHasInteracted.current = true
      }
    }

    const dragListener = map.addListener('dragstart', handleDragStart)
    const zoomListener = map.addListener('zoom_changed', handleZoomChanged)

    return () => {
      if (dragListener) googleMaps.event.removeListener(dragListener)
      if (zoomListener) googleMaps.event.removeListener(zoomListener)
    }
  }, [map, googleMaps, defaultZoom])

  // Update map center and zoom only on initial load or when new markers are added
  useEffect(() => {
    if (!map || !googleMaps || markers.length === 0) return

    // Get current marker IDs
    const currentMarkerIds = new Set(markers.map(m => m.id).filter(Boolean))
    
    // Check if there are actually new markers (not just array reference change)
    const hasNewMarkers = Array.from(currentMarkerIds).some(id => !lastMarkerIds.current.has(id))
    const markerCountChanged = currentMarkerIds.size !== lastMarkerIds.current.size

    // Only adjust bounds if:
    // 1. Initial load (bounds haven't been set)
    // 2. New markers were actually added
    // 3. User hasn't manually moved the map
    if (!hasInitialBoundsSet.current || (hasNewMarkers && !userHasInteracted.current)) {
      const bounds = new googleMaps.LatLngBounds()
      let hasValidLocations = false

      markers.forEach((marker) => {
        const lat = marker.location?.lat || marker.lat
        const lng = marker.location?.lng || marker.lng
        
        if (lat && lng && lat !== 0 && lng !== 0) {
          bounds.extend(new googleMaps.LatLng(lat, lng))
          hasValidLocations = true
        }
      })

      if (hasValidLocations) {
        if (markers.length === 1) {
          const singleMarker = markers[0]
          const lat = singleMarker.location?.lat || singleMarker.lat
          const lng = singleMarker.location?.lng || singleMarker.lng
          if (lat && lng && lat !== 0 && lng !== 0) {
            map.setCenter(new googleMaps.LatLng(lat, lng))
            map.setZoom(15)
            hasInitialBoundsSet.current = true
          }
        } else {
          map.fitBounds(bounds, { padding: 50 })
          hasInitialBoundsSet.current = true
        }
      }
    }

    // Update last known marker IDs
    lastMarkerIds.current = currentMarkerIds
  }, [map, googleMaps, markers])

  // Create/update markers on the map
  useEffect(() => {
    if (!map || !googleMaps) {
      return
    }
    
    // Clear existing markers
    mapMarkers.forEach((marker) => marker.setMap(null))
    const newMarkers = []
    let validMarkers = 0
    let skippedMarkers = 0

    markers.forEach((markerData, index) => {
      const lat = markerData.location?.lat ?? markerData.lat
      const lng = markerData.location?.lng ?? markerData.lng

      // Check if coordinates are valid (not 0,0 and within valid range)
      if (!lat || !lng || lat === 0 || lng === 0 || 
          typeof lat !== 'number' || typeof lng !== 'number' ||
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn(`[GoogleMap] Skipping marker ${index + 1} (${markerData.officeName || 'Unknown'}): Invalid coordinates`, { lat, lng })
        skippedMarkers++
        return
      }

      try {
        const position = new googleMaps.LatLng(lat, lng)
        const isSelected = selectedMarker?.id === markerData.id

        // Use uploaded PNG image for pin
        // Normal size: 32x32 pixels
        // Large size: 40x40 pixels (selected)
        const normalSize = 32
        const largeSize = 40
        const iconSize = isSelected ? largeSize : normalSize
        
        // Anchor point at bottom center of the pin (typical for location pins)
        const anchorX = iconSize / 2
        const anchorY = iconSize
        
        // Create marker with PNG image
        const marker = new googleMaps.Marker({
          position,
          map,
          title: markerData.officeName || 'Police Office',
          icon: {
            url: '/police-pin.png', // Image from public folder
            scaledSize: new googleMaps.Size(iconSize, iconSize), // Size of the icon
            anchor: new googleMaps.Point(anchorX, anchorY), // Anchor at bottom center
          },
          label: {
            text: '',
            color: '#ffffff',
            fontSize: '0px',
          },
          animation: isSelected ? googleMaps.Animation.BOUNCE : null,
          zIndex: isSelected ? 1000 : 1
        })

        // Add info window
        const infoWindow = new googleMaps.InfoWindow({
          content: `
            <div style="color: #000; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${markerData.officeName || 'Police Office'}</h3>
              ${markerData.city ? `<p style="margin: 0; font-size: 12px; color: #666;">${markerData.city}</p>` : ''}
              ${markerData.barangay ? `<p style="margin: 0; font-size: 12px; color: #666;">${markerData.barangay}</p>` : ''}
              ${markerData.headName ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Head: ${markerData.headName}</p>` : ''}
            </div>
          `
        })

        // Add click listener
        marker.addListener('click', () => {
          // Close all other info windows
          newMarkers.forEach((m) => {
            if (m.infoWindow && m !== marker) {
              m.infoWindow.close()
            }
          })
          // Don't open info window here - let the selectedMarker effect handle it
          // This prevents double opening
          if (onMarkerClick) {
            onMarkerClick(markerData)
          }
        })

        // Add close listener for info window
        infoWindow.addListener('closeclick', () => {
          // When info window is closed, also close the detail panel
          if (onInfoWindowClose) {
            onInfoWindowClose()
          }
        })

        marker.infoWindow = infoWindow
        marker.markerData = markerData
        newMarkers.push(marker)
        validMarkers++
      } catch (err) {
        console.error(`[GoogleMap] Error creating marker for ${markerData.officeName || 'Unknown'}:`, err)
        skippedMarkers++
      }
    })

    setMapMarkers(newMarkers)
  }, [map, googleMaps, markers, onMarkerClick, onInfoWindowClose])

  // Update marker appearance when selection changes (without recreating markers)
  useEffect(() => {
    if (!googleMaps || mapMarkers.length === 0) return

    // Use uploaded PNG image for pin
    const normalSize = 32
    const largeSize = 40

    mapMarkers.forEach((marker) => {
      const markerData = marker.markerData
      if (!markerData) return

      const isSelected = selectedMarker?.id === markerData.id
      const iconSize = isSelected ? largeSize : normalSize
      
      // Anchor point at bottom center of the pin
      const anchorX = iconSize / 2
      const anchorY = iconSize

      // Create new icon object with PNG image
      const newIcon = {
        url: '/police-pin.png', // Image from public folder
        scaledSize: new googleMaps.Size(iconSize, iconSize), // Size of the icon
        anchor: new googleMaps.Point(anchorX, anchorY), // Anchor at bottom center
      }

      // Update icon
      marker.setIcon(newIcon)

      // Update label - no text needed, design speaks for itself
      const newLabel = {
        text: '',
        color: '#ffffff',
        fontSize: '0px',
      }
      marker.setLabel(newLabel)

      // Update animation
      if (isSelected) {
        marker.setAnimation(googleMaps.Animation.BOUNCE)
      } else {
        marker.setAnimation(null)
      }

      // Update z-index
      marker.setZIndex(isSelected ? 1000 : 1)
    })
  }, [selectedMarker, mapMarkers, googleMaps])

  // Open info window for selected marker
  useEffect(() => {
    if (!selectedMarker || mapMarkers.length === 0 || !map) return

    const selectedMapMarker = mapMarkers.find(
      (m) => m.markerData?.id === selectedMarker.id
    )

    if (selectedMapMarker?.infoWindow) {
      // Close all other info windows first
      mapMarkers.forEach((m) => {
        if (m.infoWindow && m !== selectedMapMarker) {
          m.infoWindow.close()
        }
      })
      // Open the selected marker's info window
      selectedMapMarker.infoWindow.open(map, selectedMapMarker)
      // Center map on selected marker (this is intentional, so don't mark as user interaction)
      if (selectedMapMarker.getPosition()) {
        const currentCenter = map.getCenter()
        const markerPos = selectedMapMarker.getPosition()
        
        // Only center if marker is not already in view or far away
        // Use geometry library if available, otherwise just center if no current center
        try {
          if (!currentCenter) {
            map.setCenter(markerPos)
            map.setZoom(15)
          } else if (googleMaps?.geometry?.spherical?.computeDistanceBetween) {
            const distance = googleMaps.geometry.spherical.computeDistanceBetween(currentCenter, markerPos)
            if (distance > 5000) {
              map.setCenter(markerPos)
              map.setZoom(15)
            }
          } else {
            // Geometry library not available, just center if we don't have a center
            map.setCenter(markerPos)
            map.setZoom(15)
          }
        } catch (err) {
          console.error('[GoogleMap] Error centering on selected marker:', err)
          // Fallback: just center the map
          map.setCenter(markerPos)
          map.setZoom(15)
        }
      }
    }
  }, [selectedMarker, mapMarkers, map, googleMaps])

  // Always render the map container so ref is available
  // Show loading/error overlays on top if needed
  return (
    <div className="w-full h-full relative" style={{ minHeight: '600px' }}>
      {/* Map container - always rendered so ref works */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
      
      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading Google Maps...</p>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 backdrop-blur-sm z-10">
          <div className="text-center text-white max-w-md px-4">
            <p className="text-red-400 mb-2 text-lg">⚠️ {error}</p>
            <p className="text-sm text-slate-400 mb-4">Please check your Google Maps API key and browser console (F12) for details</p>
            <button
              onClick={() => {
                setError(null)
                setIsLoading(true)
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

