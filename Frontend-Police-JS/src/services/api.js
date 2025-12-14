/**
 * API Service Layer
 * 
 * Centralized Axios configuration for all API calls to the Django backend.
 * Handles:
 * - Base URL configuration
 * - JWT token attachment to requests
 * - Request/response interceptors
 * - Token refresh logic
 */

import axios from 'axios';

// Base URL for Django backend (update for production deployment)
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create Axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Request Interceptor
 * Automatically attaches JWT access token to every request (if available)
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get access token from localStorage
    const accessToken = localStorage.getItem('access_token');
    
    if (accessToken) {
      // Attach Bearer token to Authorization header
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token expiration and automatic refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return successful response as-is
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Don't try token refresh for auth endpoints.
    // If login fails (401), we should show the error, not attempt refresh or redirect-loop.
    const url = originalRequest?.url || '';
    if (url.includes('/auth/login/') || url.includes('/auth/refresh/')) {
      return Promise.reject(error);
    }
    
    // If 401 Unauthorized and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the access token
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // No refresh token available, redirect to login
          throw new Error('No refresh token available');
        }
        
        // Call refresh endpoint (you'll need to create this in Django)
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        
        const { access } = response.data;
        
        // Store new access token
        localStorage.setItem('access_token', access);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
