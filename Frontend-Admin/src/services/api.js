// ============================================================================
// API SERVICE: Frontend to Django Backend Integration
// ============================================================================
// 
// This file contains all API functions that communicate with the Django backend.
// Currently using localStorage for mock data - REPLACE with real API calls.
//
// INTEGRATION STEPS:
// 1. Create src/config/apiClient.js (see DJANGO_BACKEND_INTEGRATION.md)
// 2. Import apiClient: import apiClient from '../config/apiClient'
// 3. Replace each function below with real axios calls
// 4. Update response handling to match Django REST Framework format
//
// DJANGO ENDPOINT MAPPING:
// - All endpoints are under /api/ prefix
// - Django typically runs on http://localhost:8000
// - See docs/DJANGO_BACKEND_INTEGRATION.md for full guide
// ============================================================================

import mockData from '../data/mockData.json'

const STORAGE_KEY = 'crash_admin_data_v1'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Centralized mock data structure
 * All sample data is loaded from mockData.json and persisted to localStorage
 * This is the temporary database for the application
 */
export const MOCK_DATA = mockData

function initData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      // Ensure all required top-level keys exist
      if (!parsed.admins) parsed.admins = MOCK_DATA.admins
      if (!parsed.police) parsed.police = MOCK_DATA.police
      if (!parsed.reports || parsed.reports.length === 0) {
        // Initialize with mock reports if empty
        parsed.reports = JSON.parse(JSON.stringify(MOCK_DATA.reports))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      }
      if (!parsed.users || parsed.users.length === 0) {
        // Initialize with mock users if empty
        parsed.users = JSON.parse(JSON.stringify(MOCK_DATA.users))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      } else {
        // Update existing users with new fields from MOCK_DATA if they're missing
        const mockUsersMap = new Map(MOCK_DATA.users.map(u => [u.id, u]))
        let updated = false
        parsed.users = parsed.users.map(user => {
          const mockUser = mockUsersMap.get(user.id)
          if (mockUser) {
            // Check if user is missing any of the new fields
            const needsUpdate = !user.region || !user.city || !user.barangay || !user.gender || user.age === undefined
            if (needsUpdate) {
              updated = true
              // Merge existing user with mock data, preserving any existing data but adding missing fields
              return {
                ...user,
                region: user.region || mockUser.region || '',
                city: user.city || mockUser.city || '',
                barangay: user.barangay || mockUser.barangay || '',
                gender: user.gender || mockUser.gender || '',
                age: user.age !== undefined ? user.age : (mockUser.age !== undefined ? mockUser.age : null),
              }
            }
          }
          return user
        })
        if (updated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        }
      }
      
      // Ensure Metro Police Station exists with valid coordinates
      const metroStation = parsed.police.find(p => p.officeName === 'Metro Police Station' || p.email === 'officer@example.com')
      if (!metroStation) {
        const metroEntry = MOCK_DATA.police.find(p => p.id === 'police-metro')
        if (metroEntry) {
          parsed.police.push(metroEntry)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        }
      } else if (metroStation && (!metroStation.location || metroStation.location.lat === 0 || metroStation.location.lng === 0)) {
        // Update existing entry with valid coordinates if missing
        metroStation.location = { lat: 14.6900, lng: 121.0500 }
        metroStation.isActive = true
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      }
      
      return parsed
    } catch (e) {
      console.error('Error parsing stored data, resetting to defaults:', e)
    }
  }
  // Initialize with mock data if no data exists
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA))
  return JSON.parse(JSON.stringify(MOCK_DATA)) // Return a copy
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const api = {
  /**
   * ========================================================================
   * AUTHENTICATION ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: POST /api/auth/login/
   * Django View: LoginAPIView
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * import apiClient from '../config/apiClient'
   * 
   * loginAdmin({ usernameOrEmail, password }) {
   *   return apiClient.post('/auth/login/', { 
   *     username: usernameOrEmail,  // Adjust field name based on Django
   *     password: password 
   *   })
   *     .then(res => {
   *       // Django may return: { user: {...}, token: "..." }
   *       // OR: { access: "...", refresh: "..." } for JWT
   *       const user = res.data.user || res.data
   *       const token = res.data.token || res.data.access
   *       
   *       // Store token if provided
   *       if (token) {
   *         sessionStorage.setItem('crash_admin_token', token)
   *       }
   *       
   *       return user
   *     })
   * }
   * 
   * USED IN: src/pages/Login.jsx
   * ========================================================================
   */
  loginAdmin({ usernameOrEmail, password }) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const admin = data.admins.find(
        (a) => (a.email === usernameOrEmail || a.username === usernameOrEmail) && a.password === password,
      )
      setTimeout(() => {
        if (admin) resolve({ ...admin })
        else reject(new Error('Invalid credentials'))
      }, 300)
    })
  },

  /**
   * ========================================================================
   * DASHBOARD STATISTICS ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: GET /api/analytics/summary/overview/
   * Django View: AnalyticsOverviewSummaryAPIView
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * getStats() {
   *   return apiClient.get('/analytics/summary/overview/')
   *     .then(res => {
   *       // Django response structure may vary
   *       // Adjust based on actual response:
   *       // { total_reports, avg_resolution_time, ... }
   *       return res.data
   *     })
   * }
   * 
   * NOTE: Currently not used in Dashboard.jsx, but available for future use
   * Alternative: Use /api/admin/map/data/ for map-specific data
   * ========================================================================
   */
  getStats() {
    return new Promise((resolve) => {
      const data = initData()
      const totalPolice = data.police.length
      const totalAdmins = data.admins.length
      const last5 = [...data.police].slice(-5).reverse()
      setTimeout(() => resolve({ totalPolice, totalAdmins, last5 }), 200)
    })
  },

  /**
   * ========================================================================
   * LIST POLICE OFFICES ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: GET /api/admin/police-offices/
   * Django ViewSet: PoliceOfficeAdminViewSet.list()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * listPolice() {
   *   return apiClient.get('/admin/police-offices/')
   *     .then(res => {
   *       // Django REST Framework may return paginated response:
   *       // { count, next, previous, results: [...] }
   *       // OR simple array: [...]
   *       return res.data.results || res.data
   *     })
   * }
   * 
   * USED IN: 
   * - src/pages/Dashboard.jsx (for map markers)
   * - src/pages/PoliceAccountManagement.jsx (for table display)
   * ========================================================================
   */
  listPolice() {
    return new Promise((resolve) => {
      const data = initData()
      setTimeout(() => resolve([...data.police]), 200)
    })
  },

  /**
   * ========================================================================
   * CREATE POLICE OFFICE ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: POST /api/admin/police-offices/
   * Django ViewSet: PoliceOfficeAdminViewSet.create()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * addPolice(payload) {
   *   // Transform payload to match Django model fields
   *   const djangoPayload = {
   *     office_name: payload.officeName,  // Adjust field names
   *     email: payload.email,
   *     password: payload.password,
   *     contact: payload.contact,
   *     head_name: payload.headName,
   *     city: payload.city,
   *     barangay: payload.barangay,
   *     location: {
   *       lat: payload.location.lat,
   *       lng: payload.location.lng
   *     }
   *   }
   *   
   *   return apiClient.post('/admin/police-offices/', djangoPayload)
   *     .then(res => res.data)
   * }
   * 
   * USED IN: src/pages/PoliceAccountManagement.jsx (Add modal)
   * 
   * PAYLOAD STRUCTURE:
   * {
   *   email: string (required)
   *   password: string (required)
   *   officeName: string
   *   location: { lat: number, lng: number }
   *   contact: string
   *   headName: string
   *   city: string
   *   barangay: string
   * }
   * ========================================================================
   */
  addPolice(payload) {
    return new Promise((resolve) => {
      const data = initData()
      const location = payload.location || { lat: 0, lng: 0 }
      const lat = location.lat
      const lng = location.lng
      const hasValidCoordinates = lat && lng && lat !== 0 && lng !== 0 &&
        typeof lat === 'number' && typeof lng === 'number' &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      
      const newPolice = {
        id: uid(),
        email: payload.email,
        password: payload.password || 'changeme',
        officeName: payload.officeName || '',
        location: location,
        contact: payload.contact || '',
        headName: payload.headName || '',
        city: payload.city || '',
        barangay: payload.barangay || '',
        createdAt: new Date().toISOString(),
        isActive: hasValidCoordinates,
      }
      data.police.push(newPolice)
      saveData(data)
      setTimeout(() => resolve({ ...newPolice }), 300)
    })
  },

  /**
   * ========================================================================
   * DELETE POLICE OFFICE ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: DELETE /api/admin/police-offices/{id}/
   * Django ViewSet: PoliceOfficeAdminViewSet.destroy()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * removePolice(id) {
   *   return apiClient.delete(`/admin/police-offices/${id}/`)
   *     .then(() => true)  // Django returns 204 No Content on success
   *     .catch(err => {
   *       throw new Error(err.response?.data?.detail || 'Failed to delete')
   *     })
   * }
   * 
   * USED IN: src/pages/PoliceAccountManagement.jsx (Delete button)
   * 
   * NOTE: Django uses UUID format for IDs, ensure frontend passes correct format
   * ========================================================================
   */
  removePolice(id) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const idx = data.police.findIndex((p) => p.id === id)
      if (idx === -1) return reject(new Error('Not found'))
      data.police.splice(idx, 1)
      saveData(data)
      setTimeout(() => resolve(true), 200)
    })
  },

  /**
   * ========================================================================
   * UPDATE POLICE OFFICE ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: PUT /api/admin/police-offices/{id}/
   * Django ViewSet: PoliceOfficeAdminViewSet.update()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * updatePolice(id, updates) {
   *   // Transform updates to match Django model fields
   *   const djangoUpdates = {
   *     office_name: updates.officeName,
   *     contact: updates.contact,
   *     head_name: updates.headName,
   *     city: updates.city,
   *     barangay: updates.barangay,
   *     location: {
   *       lat: updates.location?.lat,
   *       lng: updates.location?.lng
   *     }
   *   }
   *   
   *   return apiClient.put(`/admin/police-offices/${id}/`, djangoUpdates)
   *     .then(res => res.data)
   * }
   * 
   * USED IN: src/pages/PoliceAccountManagement.jsx (Edit modal)
   * 
   * UPDATABLE FIELDS:
   * - officeName
   * - location: { lat, lng }
   * - contact
   * - headName
   * - city
   * - barangay
   * ========================================================================
   */
  updatePolice(id, updates) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const idx = data.police.findIndex((p) => p.id === id)
      if (idx === -1) return reject(new Error('Not found'))
      
      // Update location and recalculate isActive status
      const updatedLocation = updates.location || data.police[idx].location || { lat: 0, lng: 0 }
      const lat = updatedLocation.lat
      const lng = updatedLocation.lng
      const hasValidCoordinates = lat && lng && lat !== 0 && lng !== 0 &&
        typeof lat === 'number' && typeof lng === 'number' &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      
      data.police[idx] = { 
        ...data.police[idx], 
        ...updates,
        isActive: hasValidCoordinates,
      }
      saveData(data)
      setTimeout(() => resolve({ ...data.police[idx] }), 200)
    })
  },

  /**
   * ========================================================================
   * GET ADMIN PROFILE ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: (Not in provided urls.py - may need to be created)
   * OR: Use current user endpoint if available
   * 
   * INTEGRATION OPTIONS:
   * 
   * Option 1: If Django has /api/admin/profile/{email}/
   * getAdminProfile(email) {
   *   return apiClient.get(`/admin/profile/${email}/`)
   *     .then(res => res.data)
   * }
   * 
   * Option 2: Use current authenticated user endpoint
   * getAdminProfile(email) {
   *   return apiClient.get('/admin/me/')  // Or similar endpoint
   *     .then(res => res.data)
   * }
   * 
   * USED IN: src/pages/Profile.jsx
   * 
   * NOTE: This endpoint may need to be created in Django backend
   * ========================================================================
   */
  getAdminProfile(email) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const admin = data.admins.find((a) => a.email === email)
      setTimeout(() => {
        if (!admin) reject(new Error('Not found'))
        else resolve({ ...admin })
      }, 200)
    })
  },

  /**
   * ========================================================================
   * CHANGE PASSWORD ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: (Not in provided urls.py - may need to be created)
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * changePassword(email, newPassword) {
   *   return apiClient.post('/admin/change-password/', {
   *     email: email,
   *     new_password: newPassword  // Adjust field name based on Django
   *   })
   *     .then(() => true)
   * }
   * 
   * USED IN: src/pages/Profile.jsx
   * 
   * NOTE: This endpoint may need to be created in Django backend
   * ========================================================================
   */
  changePassword(email, newPassword) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const idx = data.admins.findIndex((a) => a.email === email)
      if (idx === -1) return reject(new Error('Not found'))
      data.admins[idx].password = newPassword
      saveData(data)
      setTimeout(() => resolve(true), 200)
    })
  },

  /**
   * ========================================================================
   * UPDATE ADMIN PROFILE ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: (Not in provided urls.py - may need to be created)
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * updateAdminProfile(email, updates) {
   *   return apiClient.put(`/admin/profile/${email}/`, updates)
   *     .then(res => res.data)
   * }
   * 
   * USED IN: src/pages/Profile.jsx
   * 
   * NOTE: This endpoint may need to be created in Django backend
   * ========================================================================
   */
  updateAdminProfile(email, updates) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const idx = data.admins.findIndex((a) => a.email === email)
      if (idx === -1) return reject(new Error('Not found'))
      data.admins[idx] = { ...data.admins[idx], ...updates }
      saveData(data)
      setTimeout(() => resolve({ ...data.admins[idx] }), 200)
    })
  },

  /**
   * ========================================================================
   * SEARCH USER ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: (Not in provided urls.py - may need to be created)
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * searchUser(query) {
   *   return apiClient.get('/users/search/', {
   *     params: { q: query }
   *   })
   *     .then(res => res.data)
   * }
   * 
   * USED IN: src/pages/ManualReport.jsx (Search user tool)
   * 
   * NOTE: This endpoint may need to be created in Django backend
   * Alternative: Use /api/reports/ with filters if users are reporters
   * ========================================================================
   */
  searchUser(query) {
    return new Promise((resolve, reject) => {
      const data = initData()
      if (!data.users) data.users = []
      const queryLower = query.toLowerCase()
      const user = data.users.find(
        (u) => 
          u.id === query || 
          u.id?.toLowerCase() === queryLower ||
          u.uuid === query ||
          u.uuid?.toLowerCase() === queryLower ||
          u.uuid?.toLowerCase().includes(queryLower) ||
          u.name?.toLowerCase().includes(queryLower) || 
          u.username?.toLowerCase().includes(queryLower) ||
          u.email?.toLowerCase().includes(queryLower) ||
          u.phone?.includes(query) ||
          u.contact?.includes(query)
      )
      setTimeout(() => {
        if (user) resolve({ ...user })
        else reject(new Error('User not found'))
      }, 200)
    })
  },

  /**
   * ========================================================================
   * SEARCH POLICE OFFICE ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: GET /api/admin/police-offices/?search={query}
   * Django ViewSet: PoliceOfficeAdminViewSet.list() with search filter
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * searchPoliceOffice(query) {
   *   return apiClient.get('/admin/police-offices/', {
   *     params: { search: query }  // Django REST Framework search param
   *   })
   *     .then(res => {
   *       const results = res.data.results || res.data
   *       // Return first match or all results
   *       return results.find(p => 
   *         p.id === query || 
   *         p.office_name?.toLowerCase().includes(query.toLowerCase())
   *       ) || results[0]
   *     })
   * }
   * 
   * USED IN: src/pages/ManualReport.jsx (Search police office tool)
   * ========================================================================
   */
  searchPoliceOffice(query) {
    return new Promise((resolve, reject) => {
      const data = initData()
      const queryLower = query.toLowerCase()
      const office = data.police.find(
        (p) => 
          p.id === query ||
          p.id?.toLowerCase() === queryLower ||
          p.uuid === query ||
          p.uuid?.toLowerCase() === queryLower ||
          p.uuid?.toLowerCase().includes(queryLower) ||
          p.officeName?.toLowerCase().includes(queryLower) ||
          p.name?.toLowerCase().includes(queryLower)
      )
      setTimeout(() => {
        if (office) resolve({ ...office })
        else reject(new Error('Police office not found'))
      }, 200)
    })
  },

  /**
   * ========================================================================
   * CREATE REPORT ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: POST /api/reports/
   * Django ViewSet: ReportViewSet.create()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * createReport(payload) {
   *   // Transform payload to match Django model fields
   *   const djangoPayload = {
   *     reporter_id: payload.reporter_id,
   *     assigned_office_id: payload.assigned_office_id,
   *     category: payload.category,
   *     status: payload.status || 'Pending',
   *     lat: parseFloat(payload.lat) || 0,
   *     lng: parseFloat(payload.lng) || 0,
   *     city: payload.city,
   *     barangay: payload.barangay,
   *     remarks: payload.remarks
   *     // created_at and updated_at are usually auto-generated by Django
   *   }
   *   
   *   return apiClient.post('/reports/', djangoPayload)
   *     .then(res => res.data)
   * }
   * 
   * USED IN: src/pages/ManualReport.jsx (Submit report form)
   * 
   * PAYLOAD STRUCTURE:
   * {
   *   report_id: string (optional, Django may auto-generate)
   *   reporter_id: string (UUID)
   *   assigned_office_id: string (UUID)
   *   category: string
   *   status: string (default: 'Pending')
   *   lat: number
   *   lng: number
   *   city: string
   *   barangay: string
   *   remarks: string
   *   created_at: string (optional, Django auto-generates)
   *   updated_at: string (optional, Django auto-generates)
   * }
   * ========================================================================
   */
  createReport(payload) {
    return new Promise((resolve) => {
      const data = initData()
      if (!data.reports) data.reports = []
      const newReport = {
        report_id: payload.report_id || uid(),
        reporter_id: payload.reporter_id || '',
        assigned_office_id: payload.assigned_office_id || '',
        category: payload.category || '',
        status: payload.status || 'Pending',
        lat: parseFloat(payload.lat) || 0,
        lng: parseFloat(payload.lng) || 0,
        city: payload.city || '',
        barangay: payload.barangay || '',
        remarks: payload.remarks || '',
        created_at: payload.created_at || new Date().toISOString(),
        updated_at: payload.updated_at || new Date().toISOString(),
      }
      data.reports.push(newReport)
      saveData(data)
      setTimeout(() => resolve({ ...newReport }), 300)
    })
  },

  /**
   * ========================================================================
   * LIST REPORTS ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: GET /api/reports/
   * Django ViewSet: ReportViewSet.list()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * listReports() {
   *   return apiClient.get('/reports/')
   *     .then(res => {
   *       // Handle Django pagination if present: res.data.results || res.data
   *       return res.data.results || res.data
   *     })
   * }
   * 
   * USED IN: src/pages/ManualReport.jsx (for visualization)
   * ========================================================================
   */
  listReports() {
    return new Promise((resolve) => {
      const data = initData()
      const reports = data.reports || []
      setTimeout(() => resolve(reports), 200)
    })
  },

  /**
   * ========================================================================
   * LIST ALL USERS ENDPOINT
   * ========================================================================
   * 
   * DJANGO ENDPOINT: GET /api/users/
   * Django ViewSet: UserViewSet.list()
   * 
   * INTEGRATION:
   * Replace this function with:
   * 
   * listUsers() {
   *   return apiClient.get('/users/')
   *     .then(res => {
   *       // Handle Django pagination if present: res.data.results || res.data
   *       return res.data.results || res.data
   *     })
   * }
   * 
   * USED IN: src/pages/ManualReport.jsx (User tab - display all users)
   * ========================================================================
   */
  listUsers() {
    return new Promise((resolve) => {
      const data = initData()
      const users = data.users || []
      setTimeout(() => resolve(users), 200)
    })
  },

}

export default api
