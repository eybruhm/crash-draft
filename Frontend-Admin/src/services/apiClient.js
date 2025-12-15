/**
 * Admin API Client (Axios)
 *
 * - Uses VITE_API_BASE_URL (should be: http://127.0.0.1:8000/api/v1)
 * - Attaches JWT access token from sessionStorage
 * - On 401: clears auth and redirects to /login
 */
import axios from 'axios'
import { STORAGE_KEYS } from '../constants'
import { clearAuth } from '../utils/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''

    // If login fails, do not auto-redirect (let UI show the error)
    if (url.includes('/auth/login/') || url.includes('/auth/refresh/')) {
      return Promise.reject(error)
    }

    if (status === 401) {
      clearAuth()
      // Avoid throwing user into a redirect loop if they're already on /login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient


