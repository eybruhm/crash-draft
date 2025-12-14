/**
 * Constants for routing configuration
 */

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  POLICE_ACCOUNTS: '/police-accounts',
  PROFILE: '/profile',
  MANUAL_REPORT: '/manual-report',
}

export const STORAGE_KEYS = {
  ADMIN_USER: 'crash_admin_user',
  ADMIN_TOKEN: 'crash_admin_token',
}

// Django backend typically runs on port 8000
// Update this in .env file: VITE_API_BASE_URL=http://localhost:8000/api
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// Google Maps API key used across the app
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyDH2oAs9HoUj5BueJRfrAfeZiSkhmMWCok'
