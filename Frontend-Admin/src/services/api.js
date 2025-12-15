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
  async listPolice() {
    const res = await apiClient.get('/admin/police-offices/')
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
   * NOTE: backend currently uses PoliceOfficeCreateSerializer for updates,
   * so password + created_by may be required.
   */
  async updatePolice(officeId, payload) {
    const res = await apiClient.put(`/admin/police-offices/${officeId}/`, payload)
    return res.data
  },

  async removePolice(officeId) {
    const res = await apiClient.delete(`/admin/police-offices/${officeId}/`)
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


