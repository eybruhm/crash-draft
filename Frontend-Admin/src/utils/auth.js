/**
 * Authentication Utility Functions
 * 
 * Handles user authentication operations
 */

import { STORAGE_KEYS } from '../constants'

export function getStoredUser() {
  const userJson = localStorage.getItem(STORAGE_KEYS.ADMIN_USER)
  return userJson ? JSON.parse(userJson) : null
}

export function storeUser(user) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user))
}

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)
}

export function storeToken(token) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token)
}

export function getStoredRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_REFRESH)
}

export function storeRefreshToken(token) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_REFRESH, token)
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.ADMIN_USER)
  localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.ADMIN_REFRESH)
}

export function isAuthenticated() {
  return getStoredUser() !== null
}
