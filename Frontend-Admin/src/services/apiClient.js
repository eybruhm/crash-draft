/**
 * Admin API Client (Axios)
 *
 * - Uses VITE_API_BASE_URL (should be: http://127.0.0.1:8000/api/v1)
 * - Attaches JWT access token from localStorage
 * - On 401:
 *   - tries refresh via POST /auth/refresh/
 *   - if refresh fails, clears auth and redirects to /login
 */
import axios from 'axios'
import { STORAGE_KEYS } from '../constants'
import { clearAuth, getStoredRefreshToken, getStoredToken, storeToken } from '../utils/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

let refreshPromise = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config
    const url = originalRequest?.url || ''

    // If login fails, do not auto-redirect (let UI show the error)
    if (url.includes('/auth/login/') || url.includes('/auth/refresh/')) {
      return Promise.reject(error)
    }

    // Attempt refresh once per request
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      const refresh = getStoredRefreshToken()
      if (refresh) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_BASE_URL}/auth/refresh/`, { refresh })
              .then((res) => {
                const access = res?.data?.access
                if (!access) {
                  throw new Error('Refresh succeeded but no access token returned.')
                }
                storeToken(access)
                return access
              })
              .finally(() => {
                refreshPromise = null
              })
          }

          const newAccess = await refreshPromise
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return apiClient(originalRequest)
        } catch (refreshErr) {
          clearAuth()
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          return Promise.reject(refreshErr)
        }
      }

      // No refresh token → force logout
      clearAuth()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient


