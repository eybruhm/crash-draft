import { Info, MapPin, X } from 'lucide-react'

const MapLegendModal = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">
              <Info className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Map Legend</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Cases</h3>
            <div className="space-y-3">
              <LegendItem color="#4f46e5" label="Threat (indigo)" />
              <LegendItem color="#f59e0b" label="Violence (gold)" />
              <LegendItem color="#8b5cf6" label="Vandalism (violet)" />
              <LegendItem color="#94a3b8" label="Theft (silver)" />
              <LegendItem color="#ef4444" label="Emergency (red)" />
              <LegendItem color="#14b8a6" label="Suspicious (teal)" />
              <LegendItem color="#22d3ee" label="Others (turquoise)" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Police Checkpoints</h3>
            <div className="space-y-3">
              <LegendItem color="#22c55e" label="Checkpoint Active (neon green)" />
              <LegendItem color="#6b7280" label="Checkpoint Inactive (gray)" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200/50">
            <p className="text-xs text-gray-500">Click on any pin on the map to view details.</p>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200/50">
          <button onClick={onClose} className="btn-primary px-6">Close</button>
        </div>
      </div>
    </div>
  )
}

const LegendItem = ({ color, label }) => (
  <div className="flex items-center space-x-3">
    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
    <span className="text-sm text-gray-700">{label}</span>
  </div>
)

export default MapLegendModal
