import { useEffect, useState } from 'react'
import { MapPin, Map } from 'lucide-react'
import { api } from '../services/api'
import GoogleMap from '../components/GoogleMap'

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
  const [police, setPolice] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)

  useEffect(() => {
    const loadPolice = () => {
      // ====================================================================
      // BACKEND INTEGRATION NOTE:
      // ====================================================================
      // Currently using: api.listPolice() -> GET /api/admin/police-offices/
      // 
      // RECOMMENDED: Use dedicated map endpoint for better data:
      // api.getMapData() -> GET /api/admin/map/data/
      // This endpoint returns: { offices: [...], reports: [...], checkpoints: [...] }
      // 
      // To switch, uncomment the getMapData() function in api.js and use:
      // api.getMapData().then(data => setPolice(data.offices || []))
      // ====================================================================
      api.listPolice()
        .then((data) => {
          // Handle Django pagination if present: data.results || data
          const offices = data.results || data
          setPolice(Array.isArray(offices) ? offices : [])
        })
        .catch((err) => {
          console.error('[Dashboard] Error loading police:', err)
        })
    }
    
    loadPolice()
    // Refresh every 5 seconds to catch new additions (reduced frequency to avoid map glitches)
    const interval = setInterval(loadPolice, 5000)
    
    return () => clearInterval(interval)
  }, [])

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
          </div>
        </div>
        <div className="glass-elevated overflow-hidden border-2 border-white/10">
          <div className="h-[calc(100vh-400px)] min-h-[600px] relative">
            <GoogleMap
              markers={police}
              onMarkerClick={setSelectedPin}
              onInfoWindowClose={() => setSelectedPin(null)}
              selectedMarker={selectedPin}
              defaultCenter={{ lat: 14.5995, lng: 120.9842 }} // Manila, Philippines
              defaultZoom={10}
            />
            {police.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="text-center glass-elevated p-8 max-w-md">
                  <Map className="text-slate-400 mx-auto mb-4" size={48} />
                  <p className="text-white text-lg font-semibold mb-2">No police offices registered</p>
                  <p className="text-slate-400 text-sm">Add police accounts to see them on the map</p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Pin Details - Premium Design */}
          {selectedPin && (
            <div className="border-t border-white/15 p-8 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-2xl">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600/40 to-blue-500/30 rounded-xl flex items-center justify-center border border-blue-400/30 shadow-lg">
                    <MapPin className="text-blue-300" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Police Office Details</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Complete station information</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPin(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 border border-transparent hover:border-white/20"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="info-card group hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Office Name</p>
                  <p className="font-bold text-white text-lg">{selectedPin.officeName}</p>
                </div>
                <div className="info-card group hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">City</p>
                  <p className="font-bold text-white text-lg">{selectedPin.city || 'N/A'}</p>
                </div>
                <div className="info-card group hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Barangay</p>
                  <p className="font-bold text-white text-lg">{selectedPin.barangay || 'N/A'}</p>
                </div>
                <div className="info-card group hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Head Officer</p>
                  <p className="font-bold text-white text-lg">{selectedPin.headName || 'N/A'}</p>
                </div>
                <div className="info-card group hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">UUID</p>
                  <p className="font-mono text-sm text-slate-200 break-all font-semibold">{selectedPin.id}</p>
                </div>
                <div className="info-card group hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Location</p>
                  <p className="font-mono text-sm text-slate-200 font-semibold">
                    {selectedPin.location?.lat?.toFixed(4)}, {selectedPin.location?.lng?.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
