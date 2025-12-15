/**
 * Admin API Service
 *
 * Day 1: remove all mock/localStorage behavior.
 * Only keep real backend calls that already exist.
 */
import apiClient from './apiClient'

function unwrapListResponse(data) {
  return data?.results || data
}

export const api = {
  /**
   * Admin login (email + password).
   * Backend returns: { role, user, access, refresh, message }
   */
  async loginAdmin({ email, password }) {
    const res = await apiClient.post('/auth/login/', { email, password })
    return res.data
  },

  /**
   * Police office list (Admin).
   * Serializer: office_id, office_name, email, head_officer, contact_number, latitude, longitude
   */
  async listPolice(params = {}) {
    const res = await apiClient.get('/admin/police-offices/', { params })
    const data = unwrapListResponse(res.data)
    return Array.isArray(data) ? data : []
  },

  /**
   * Create police office (Admin).
   * Backend requires: created_by (admin_id) and password (plain) for hashing.
   */
  async addPolice(payload) {
    const res = await apiClient.post('/admin/police-offices/', payload)
    return res.data
  },

  /**
   * Update police office (Admin).
   * Uses PATCH so you can send only fields that changed.
   * Password is optional for updates; send it only if you want to change it.
   */
  async updatePolice(officeId, payload) {
    const res = await apiClient.patch(`/admin/police-offices/${officeId}/`, payload)
    return res.data
  },

  async removePolice(officeId) {
    const res = await apiClient.delete(`/admin/police-offices/${officeId}/`)
    return res.data
  },

  /**
   * Admin dashboard map data (offices + checkpoints + reports).
   * Backend: GET /admin/map/data/
   */
  async getAdminMapData(params = {}) {
    const res = await apiClient.get('/admin/map/data/', { params })
    return res.data
  },

  /**
   * Public reverse geocode helper.
   * Backend: GET /geocode/reverse/?lat=X&lng=Y
   */
  async reverseGeocode(lat, lng) {
    const res = await apiClient.get('/geocode/reverse/', { params: { lat, lng } })
    return res.data
  },

  /**
   * Admin manual report creation (Admin1 tool).
   * Backend: POST /admin/reports/manual/
   */
  async createManualReport(payload) {
    const res = await apiClient.post('/admin/reports/manual/', payload)
    return res.data
  },

  /**
   * Admin user lookup helper (for manual report insertion).
   * Backend: GET /admin/users/search/?q=...
   */
  async searchUsers(q) {
    const res = await apiClient.get('/admin/users/search/', { params: { q } })
    return res.data
  },

  // ------------------------------------------------------------------
  // Not integrated yet (Day 1 cleanup: no more fake/mock responses)
  // ------------------------------------------------------------------
  listUsers() {
    return Promise.reject(new Error('Not available yet: user listing endpoint not integrated.'))
  },
  searchUser() {
    return Promise.reject(new Error('Not available yet: user search endpoint not integrated.'))
  },
  searchPoliceOffice() {
    return Promise.reject(new Error('Not available yet: police office search endpoint not integrated.'))
  },
  createReport() {
    return Promise.reject(new Error('Not available yet: manual report endpoint not integrated.'))
  },
  getAdminProfile() {
    return Promise.reject(new Error('Not available yet: admin profile endpoint not integrated.'))
  },
  updateAdminProfile() {
    return Promise.reject(new Error('Not available yet: admin profile endpoint not integrated.'))
  },
  changePassword() {
    return Promise.reject(new Error('Not available yet: admin password change endpoint not integrated.'))
  },
}


