import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { GOOGLE_API_KEY } from './constants'
import { loadGoogleMapsApi } from './utils/googleMaps'

// Start loading Google Maps API early with required libraries
loadGoogleMapsApi(GOOGLE_API_KEY, { libraries: ['places', 'geometry'] }).catch((error) => {
  console.error('Failed to load Google Maps API', error)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
