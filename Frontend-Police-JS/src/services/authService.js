/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls:
 * - Login (police officers and admins)
 * - Logout
 * - Token management
 * - User data persistence
 */

import apiClient from './api';

/**
 * Login user (police officer or admin)
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} role - User role ('police' or 'admin')
 * @returns {Promise<Object>} User data and tokens
 */
export const login = async (email, password, role) => {
  try {
    // Call Django login endpoint
    const response = await apiClient.post('/auth/login/', {
      email,
      password,
      role,
    });
    
    const { access, refresh, user } = response.data;
    
    // Store tokens in localStorage
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    // Store user data (for quick access without decoding JWT)
    localStorage.setItem('user', JSON.stringify(user));
    
    return {
      success: true,
      user,
      access,
      refresh,
    };
    
  } catch (error) {
    // Handle login errors
    console.error('Login error:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid email or password');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid request');
    } else {
      throw new Error('Unable to connect to server. Please try again.');
    }
  }
};

/**
 * Logout user
 * Clears all stored tokens and user data
 */
export const logout = () => {
  // Clear all authentication data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Redirect to login page
  window.location.href = '/login';
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid tokens
 */
export const isAuthenticated = () => {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  return !!(accessToken && refreshToken);
};

/**
 * Get current user data from localStorage
 * @returns {Object|null} User object or null if not logged in
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Refresh access token using refresh token
 * Note: This is also handled automatically by the API interceptor
 * 
 * @returns {Promise<string>} New access token
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiClient.post('/auth/refresh/', {
      refresh: refreshToken,
    });
    
    const { access } = response.data;
    
    // Store new access token
    localStorage.setItem('access_token', access);
    
    return access;
    
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // If refresh fails, logout user
    logout();
    
    throw error;
  }
};
