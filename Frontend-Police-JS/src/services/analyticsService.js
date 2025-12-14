/**
 * Analytics Service
 * 
 * Handles all analytics-related API calls:
 * - Overview statistics (total reports, avg resolution time)
 * - Location hotspots (top crime locations)
 * - Category statistics (crime types breakdown)
 * - PDF export for analytics reports
 * 
 * All endpoints support filtering by:
 * - days: Timeframe (7, 30, 90, 365)
 * - scope: 'our_office' or 'all'
 * - office_id: Specific police office
 * - city: Filter by city
 * - barangay: Filter by barangay
 * - category: Filter by crime category
 */

import apiClient from './api';

/**
 * Build query string from filter parameters
 * Only includes non-null, non-'all' values
 * 
 * @param {Object} filters - Filter parameters
 * @returns {string} Query string (e.g., "?days=30&city=Manila")
 */
const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.days) params.append('days', filters.days);
  if (filters.scope && filters.scope !== 'all') params.append('scope', filters.scope);
  if (filters.office_id) params.append('office_id', filters.office_id);
  if (filters.city && filters.city !== 'all') params.append('city', filters.city);
  if (filters.barangay && filters.barangay !== 'all') params.append('barangay', filters.barangay);
  // Capitalize first letter of category to match database format (Violence, Theft, etc.)
  if (filters.category && filters.category !== 'all') {
    const capitalizedCategory = filters.category.charAt(0).toUpperCase() + filters.category.slice(1).toLowerCase();
    params.append('category', capitalizedCategory);
  }
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Get overview statistics
 * 
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} { total_assigned, average_resolution_time, filters }
 * 
 * Example response:
 * {
 *   "filters": { "days": 30, "scope": "all", ... },
 *   "total_assigned": 150,
 *   "average_resolution_time": "2d 03:45:30"
 * }
 */
export const getOverview = async (filters = {}) => {
  try {
    const queryString = buildQueryString(filters);
    // URL pattern: /analytics/summary/overview/ (with trailing slash)
    // queryString already includes '?' if not empty
    const url = queryString 
      ? `/analytics/summary/overview/${queryString}` 
      : '/analytics/summary/overview/';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch analytics overview:', error);
    throw new Error(error.response?.data?.detail || 'Failed to load overview statistics');
  }
};

/**
 * Get location hotspots (top crime locations)
 * 
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} { total_resolved, results: [{location_city, location_barangay, report_count, report_percent}] }
 * 
 * Example response:
 * {
 *   "filters": {...},
 *   "total_resolved": 150,
 *   "results": [
 *     { "location_city": "Manila", "location_barangay": "Malate", "report_count": 45, "report_percent": 30.0 }
 *   ]
 * }
 */
export const getLocationHotspots = async (filters = {}) => {
  try {
    const queryString = buildQueryString(filters);
    // URL pattern: /analytics/hotspots/locations/ (with trailing slash)
    // queryString already includes '?' if not empty
    const url = queryString 
      ? `/analytics/hotspots/locations/${queryString}` 
      : '/analytics/hotspots/locations/';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch location hotspots:', error);
    throw new Error(error.response?.data?.detail || 'Failed to load location data');
  }
};

/**
 * Get category statistics (crime types breakdown)
 * 
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} { total_resolved, results: [{category, report_count, percentage}] }
 * 
 * Example response:
 * {
 *   "filters": {...},
 *   "total_resolved": 150,
 *   "results": [
 *     { "category": "Robbery", "report_count": 65, "percentage": 43.3 }
 *   ]
 * }
 */
export const getCategoryStats = async (filters = {}) => {
  try {
    const queryString = buildQueryString(filters);
    // URL pattern: /analytics/hotspots/categories/ (with trailing slash)
    // queryString already includes '?' if not empty
    const url = queryString 
      ? `/analytics/hotspots/categories/${queryString}` 
      : '/analytics/hotspots/categories/';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch category statistics:', error);
    throw new Error(error.response?.data?.detail || 'Failed to load category data');
  }
};

/**
 * Export analytics report as PDF
 * Opens the PDF in a new browser tab with Chrome's built-in PDF viewer
 * 
 * @param {Object} filters - Filter parameters (same as other endpoints)
 * @returns {void} Opens PDF in new tab
 */
export const exportAnalyticsPDF = async (filters = {}) => {
  try {
    const queryString = buildQueryString(filters);
    // IMPORTANT: Use apiClient so Authorization header is included.
    // window.open() doesn't send JWT headers, so backend replies "Authentication credentials were not provided."
    const url = queryString ? `/analytics/export/${queryString}` : '/analytics/export/';
    const response = await apiClient.get(url, { responseType: 'blob' });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');
    if (!win) {
      // Popup blocked fallback
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }

    // Revoke later to avoid memory leaks
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    console.error('Failed to export analytics PDF:', error);
    throw new Error(error.response?.data?.detail || 'Failed to export analytics PDF');
  }
};

/**
 * Rebuild analytics cache table (tbl_summary_analytics)
 * Calls backend: POST /admin/analytics/update/
 *
 * @returns {Promise<{detail: string}>}
 */
export const rebuildAnalyticsCache = async () => {
  try {
    const response = await apiClient.post('/admin/analytics/update/');
    return response.data;
  } catch (error) {
    console.error('Failed to rebuild analytics cache:', error);
    throw new Error(error.response?.data?.detail || 'Failed to rebuild analytics cache');
  }
};

/**
 * Get all analytics data in one call (convenience function)
 * Fetches overview, hotspots, and category stats in parallel
 * 
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} { overview, hotspots, categories }
 */
export const getAllAnalytics = async (filters = {}) => {
  try {
    const [overview, hotspots, categories] = await Promise.all([
      getOverview(filters),
      getLocationHotspots(filters),
      getCategoryStats(filters),
    ]);
    
    return {
      overview,
      hotspots,
      categories,
    };
  } catch (error) {
    console.error('Failed to fetch all analytics:', error);
    throw error; // Re-throw the original error
  }
};
