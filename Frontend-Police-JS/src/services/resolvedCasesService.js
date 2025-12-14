/**
 * Resolved Cases Service
 * 
 * Handles all resolved cases related API calls:
 * - Fetch resolved cases with filters
 * - Export resolved cases list as PDF
 * - Export single case detail as PDF
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
 * @returns {string} Query string
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
 * Fetch all resolved cases with optional filters
 * 
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} { filters, count, results: [{report_id, category, resolution_time_str, ...}] }
 * 
 * Example response:
 * {
 *   "filters": { "days": 30, ... },
 *   "count": 15,
 *   "results": [
 *     {
 *       "report_id": "...",
 *       "category": "Robbery",
 *       "created_at": "2025-12-01T10:30:00Z",
 *       "updated_at": "2025-12-01T14:30:00Z",
 *       "location_city": "Manila",
 *       "location_barangay": "Malate",
 *       "remarks": "Suspects apprehended",
 *       "resolution_time_str": "4h 00m 00s"
 *     }
 *   ]
 * }
 */
export const getResolvedCases = async (filters = {}) => {
  try {
    const queryString = buildQueryString(filters);
    // URL pattern: /reports/resolved/ (with trailing slash)
    // queryString already includes '?' if not empty
    const url = queryString 
      ? `/reports/resolved/${queryString}` 
      : '/reports/resolved/';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch resolved cases:', error);
    throw new Error(error.response?.data?.detail || 'Failed to load resolved cases');
  }
};

/**
 * Export resolved cases list as PDF
 * Opens the PDF in a new browser tab with Chrome's built-in PDF viewer
 * 
 * @param {Object} filters - Filter parameters (same as getResolvedCases)
 * @returns {void} Opens PDF in new tab
 */
export const exportResolvedCasesPDF = async (filters = {}) => {
  try {
    const queryString = buildQueryString(filters);
    // IMPORTANT: Use apiClient so Authorization header is included.
    const url = queryString ? `/reports/resolved/export/${queryString}` : '/reports/resolved/export/';
    const response = await apiClient.get(url, { responseType: 'blob' });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }

    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    console.error('Failed to export resolved cases PDF:', error);
    throw new Error(error.response?.data?.detail || 'Failed to export resolved cases PDF');
  }
};

/**
 * Export a single resolved case as detailed PDF
 * Opens the PDF in a new browser tab with Chrome's built-in PDF viewer
 * 
 * @param {string} reportId - UUID of the report to export
 * @returns {void} Opens PDF in new tab
 */
export const exportSingleCasePDF = (reportId) => {
  // This endpoint currently doesn't require auth on backend, so window.open works.
  // If you later protect it, convert it to the same blob + apiClient flow as above.
  const pdfUrl = `http://localhost:8000/api/v1/reports/${reportId}/export/`;
  window.open(pdfUrl, '_blank');
};

/**
 * Transform backend resolved case to frontend format
 * 
 * @param {Object} backendCase - Raw case from backend API
 * @returns {Object} Transformed case for frontend display
 */
export const mapResolvedCaseToFrontend = (backendCase) => {
  return {
    id: backendCase.report_id,
    reporterName: backendCase.reporter_full_name || 'Anonymous',
    category: backendCase.category,
    city: backendCase.location_city || '',
    barangay: backendCase.location_barangay || '',
    description: backendCase.description || 'No description provided',
    location: {
      lat: Number(backendCase.latitude) || 0,
      lng: Number(backendCase.longitude) || 0,
      address: backendCase.location_barangay && backendCase.location_city 
        ? `${backendCase.location_barangay}, ${backendCase.location_city}`
        : 'Address Pending',
    },
    createdAt: backendCase.created_at,
    resolvedAt: backendCase.updated_at,
    dateResolved: backendCase.updated_at,
    resolutionTime: backendCase.resolution_time_str || 'N/A',
    remarks: backendCase.remarks || '',
    assignedOfficeName: backendCase.assigned_office_name || 'Unassigned',
  };
};
