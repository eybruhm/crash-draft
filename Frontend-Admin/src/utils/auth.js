/**
 * Authentication Utility Functions
 * 
 * Handles user authentication operations
 */

import { STORAGE_KEYS } from '../constants'

export function getStoredUser() {
  const userJson = sessionStorage.getItem(STORAGE_KEYS.ADMIN_USER)
  return userJson ? JSON.parse(userJson) : null
}

export function storeUser(user) {
  sessionStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user))
}

export function getStoredToken() {
  return sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)
}

export function storeToken(token) {
  sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token)
}

export function clearAuth() {
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_USER)
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN)
}

export function isAuthenticated() {
  return getStoredUser() !== null
}
