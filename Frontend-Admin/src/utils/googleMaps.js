let googleMapsPromise = null
let isLoading = false

/**
 * Load the Google Maps JavaScript API once and reuse the promise.
 */
export function loadGoogleMapsApi(apiKey, options = {}) {
  // Return existing promise if already loading/loaded
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  // If already loaded, return immediately
  if (window.google?.maps) {
    googleMapsPromise = Promise.resolve(window.google.maps)
    return googleMapsPromise
  }

  if (!apiKey) {
    console.warn('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY.')
    googleMapsPromise = Promise.resolve(null)
    return googleMapsPromise
  }

  isLoading = true

  googleMapsPromise = new Promise((resolve, reject) => {
    // Timeout after 20 seconds
    const timeoutId = setTimeout(() => {
      isLoading = false
      reject(new Error('Google Maps API load timed out after 20 seconds'))
    }, 20000)

    const finish = (result) => {
      clearTimeout(timeoutId)
      isLoading = false
      resolve(result)
    }

    const fail = (err) => {
      clearTimeout(timeoutId)
      isLoading = false
      reject(err)
    }

    // Check if script already exists in HTML
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    
    if (existingScript) {
      // If already loaded
      if (window.google?.maps) {
        finish(window.google.maps)
        return
      }

      // Poll for window.google.maps
      let attempts = 0
      const maxAttempts = 200 // 20 seconds at 100ms intervals
      
      const checkInterval = setInterval(() => {
        attempts++
        
        if (window.google?.maps) {
          clearInterval(checkInterval)
          finish(window.google.maps)
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          fail(new Error('Google Maps API failed to load - script exists but API not available'))
        }
      }, 100)

      return
    }

    // Create callback function name
    const callbackName = `initGoogleMaps_${Date.now()}`
    let callbackFired = false
    
    // Set up global callback
    window[callbackName] = () => {
      callbackFired = true
      if (window.google?.maps) {
        delete window[callbackName]
        finish(window.google.maps)
      } else {
        delete window[callbackName]
        fail(new Error('Google Maps callback fired but maps object not available. Check API key permissions.'))
      }
    }

    // Build URL with callback
    const params = new URLSearchParams({
      key: apiKey,
      libraries: (options.libraries || ['places']).join(','),
      callback: callbackName,
    })

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.defer = true
    
    // Fallback: poll for window.google.maps if callback doesn't fire
    let pollAttempts = 0
    const maxPollAttempts = 100 // 10 seconds
    const pollInterval = setInterval(() => {
      pollAttempts++
      if (window.google?.maps && !callbackFired) {
        clearInterval(pollInterval)
        delete window[callbackName]
        finish(window.google.maps)
      } else if (pollAttempts >= maxPollAttempts) {
        clearInterval(pollInterval)
        if (!window.google?.maps) {
          delete window[callbackName]
          fail(new Error('Google Maps API failed to load. Callback did not fire and API not available after 10 seconds.'))
        }
      }
    }, 100)
    
    script.onload = () => {
      // Give callback a moment to fire
      setTimeout(() => {
        if (!callbackFired && window.google?.maps) {
          clearInterval(pollInterval)
          delete window[callbackName]
          finish(window.google.maps)
        }
      }, 500)
    }
    
    script.onerror = () => {
      clearInterval(pollInterval)
      delete window[callbackName]
      fail(new Error('Failed to load Google Maps script. Check API key, enable Maps JavaScript API, and check domain restrictions in Google Cloud Console.'))
    }
    
    document.head.appendChild(script)
  })

  return googleMapsPromise
}
