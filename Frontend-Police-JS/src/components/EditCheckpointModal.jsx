import { MapPin, Phone, Trash2, Users, X } from 'lucide-react'
import { useState } from 'react'

const EditCheckpointModal = ({ checkpoint, onClose, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({
    name: checkpoint.name,
    address: checkpoint.location.address,
    lat: checkpoint.location.lat.toString(),
    lng: checkpoint.location.lng.toString(),
    assignedOfficers: checkpoint.assignedOfficers.join(', '),
    schedule: checkpoint.schedule,
    timeStart: checkpoint.timeStart || '08:00',
    timeEnd: checkpoint.timeEnd || '20:00',
    contactNumber: checkpoint.contactNumber || '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.address.trim() || !formData.contactNumber.trim()) return

    const updatedCheckpoint = {
      ...checkpoint,
      name: formData.name.trim(),
      location: {
        lat: parseFloat(formData.lat) || checkpoint.location.lat,
        lng: parseFloat(formData.lng) || checkpoint.location.lng,
        address: formData.address.trim(),
      },
      assignedOfficers: formData.assignedOfficers
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      schedule: formData.schedule.trim() || `${formData.timeStart} - ${formData.timeEnd}`,
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      contactNumber: formData.contactNumber.trim(),
    }

    onUpdate(updatedCheckpoint)
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

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(checkpoint.id)
      onClose()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">
              <MapPin className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Edit Checkpoint</h2>
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
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Location Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => handleInputChange('lat', e.target.value)}
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
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Officers</label>
            <div className="relative">
              <Users className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={formData.assignedOfficers}
                onChange={(e) => handleInputChange('assignedOfficers', e.target.value)}
                className="input-field pl-10"
                placeholder="Officer 1, Officer 2"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Separate multiple officers with commas</p>
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

          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-red-600 hover:bg-red-50/80 px-3 py-2 rounded-lg border border-red-200/60">
              <Trash2 className="h-4 w-4" /> {confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCheckpointModal
