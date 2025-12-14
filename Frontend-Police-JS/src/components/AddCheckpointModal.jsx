import { MapPin, Minus, Phone, Plus, Users, X } from 'lucide-react'
import { useState } from 'react'

const AddCheckpointModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    assignedOfficers: [''],
    schedule: '',
    timeStart: '08:00',
    timeEnd: '20:00',
    contactNumber: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.contactNumber.trim()) return
    const checkpoint = {
      name: formData.name.trim(),
      location: {
        lat: parseFloat(formData.lat) || 14.5995,
        lng: parseFloat(formData.lng) || 120.9842,
        address: formData.schedule.trim() || `Lat ${formData.lat || '14.5995'}, Lng ${formData.lng || '120.9842'}`,
      },
      assignedOfficers: formData.assignedOfficers
        .map((o) => o.trim())
        .filter(Boolean),
      schedule: formData.schedule.trim() || `${formData.timeStart} - ${formData.timeEnd}`,
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      contactNumber: formData.contactNumber.trim(),
    }
    onAdd(checkpoint)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }
  const handleTimeChange = (field, value) => {
    let cleaned = value.replace(/[^\d:]/g, '')
    if (cleaned.length > 5) cleaned = cleaned.substring(0, 5)
    if (cleaned.length === 2 && !cleaned.includes(':')) cleaned = `${cleaned}:`
    setFormData((prev) => ({ ...prev, [field]: cleaned }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">
              <MapPin className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Add Checkpoint</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Checkpoint Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter checkpoint name"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Checkpoint Contact Number *</label>
            <div className="relative">
              <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                placeholder="e.g., +63 912 345 6789"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => handleInputChange('lat', e.target.value)}
                placeholder="14.5995"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => handleInputChange('lng', e.target.value)}
                placeholder="120.9842"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Officers</label>
            <div className="space-y-2">
              {formData.assignedOfficers.map((officer, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Users className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={officer}
                      onChange={(e) => {
                        const next = [...formData.assignedOfficers]
                        next[index] = e.target.value
                        setFormData((prev) => ({ ...prev, assignedOfficers: next }))
                      }}
                      placeholder={`Officer ${index + 1} name`}
                      className="input-field pl-10"
                    />
                  </div>
                  {formData.assignedOfficers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = formData.assignedOfficers.filter((_, i) => i !== index)
                        setFormData((prev) => ({ ...prev, assignedOfficers: next }))
                      }}
                      className="p-2 text-red-600 hover:bg-red-50/80 rounded-2xl border border-red-200/50"
                      title="Remove officer"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, assignedOfficers: [...prev.assignedOfficers, ''] }))}
                className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300/60 rounded-2xl text-gray-600 bg-white/50 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Officer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Time Start (HH:MM)</label>
              <input
                type="text"
                value={formData.timeStart}
                onChange={(e) => handleTimeChange('timeStart', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Time End (HH:MM)</label>
              <input
                type="text"
                value={formData.timeEnd}
                onChange={(e) => handleTimeChange('timeEnd', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Checkpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCheckpointModal
