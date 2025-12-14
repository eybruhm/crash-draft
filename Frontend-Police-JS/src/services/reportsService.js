/**
 * Reports Service
 * 
 * Handles all API calls related to crime reports:
 * - Fetching active reports list
 * - Getting single report details
 * - Updating report status
 * - Managing report lifecycle (pending → acknowledged → en-route → on-scene → resolved)
 * 
 * Backend endpoints used:
 * - GET  /api/v1/reports/           - List active reports
 * - GET  /api/v1/reports/{id}/      - Get single report details
 * - PATCH /api/v1/reports/{id}/     - Update report status
 * - GET  /api/v1/reports/summary_resolved/ - List resolved reports
 */

import apiClient from './api';

/**
 * Fetch all resolved reports
 * 
 * Used by: ResolvedCases page
 * Returns: Array of resolved report objects
 * 
 * @returns {Promise<Array>} Array of resolved reports
 */
export const getResolvedReports = async () => {
  try {
    const response = await apiClient.get('/reports/summary_resolved/');
    return response.data;
  } catch (error) {
    console.error('Error fetching resolved reports:', error);
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error('Unable to load resolved cases. Please try again.');
  }
};

/**
 * Fetch all active reports (excludes resolved and canceled)
 * 
 * Used by: Dashboard, Map pages
 * Returns: Array of report objects with reporter names, assigned office, location
 * 
 * @param {Object} filters - Optional query parameters
 * @param {string} filters.status - Filter by status (pending, acknowledged, en-route, on-scene)
 * @param {string} filters.category - Filter by crime category (Robbery, Theft, etc.)
 * @returns {Promise<Array>} Array of active reports
 */
export const getActiveReports = async (filters = {}) => {
  try {
    // Build query string from filters
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    
    const queryString = params.toString();
    const url = queryString ? `/reports/?${queryString}` : '/reports/';
    
    const response = await apiClient.get(url);
    
    // Backend returns array of reports
    // Each report has: report_id, category, status, created_at, latitude, longitude,
    // description, assigned_office_name, reporter_full_name, incident_address
    return response.data;
    
  } catch (error) {
    console.error('Error fetching active reports:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    } else if (error.response?.status === 403) {
      throw new Error('You do not have permission to view reports.');
    } else {
      throw new Error('Unable to load reports. Please try again.');
    }
  }
};

/**
 * Fetch detailed information for a single report
 * 
 * Used by: Report details modal when user clicks "View"
 * Returns: Full report object including complete reporter info (emergency contact, phone)
 * 
 * @param {string} reportId - UUID of the report
 * @returns {Promise<Object>} Complete report object with nested reporter data
 */
export const getReportDetail = async (reportId) => {
  try {
    const response = await apiClient.get(`/reports/${reportId}/`);
    
    // Backend returns full report with nested reporter object:
    // {
    //   report_id, category, status, created_at, latitude, longitude,
    //   description, assigned_office_name, incident_address,
    //   reporter: {
    //     user_id, email, phone, first_name, last_name,
    //     emergency_contact_name, emergency_contact_number
    //   }
    // }
    return response.data;
    
  } catch (error) {
    console.error('Error fetching report detail:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Report not found.');
    } else if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    } else {
      throw new Error('Unable to load report details. Please try again.');
    }
  }
};

/**
 * Update report status (police action)
 * 
 * Used by: Dashboard, Map pages when officer changes status or adds remarks
 * Flow: pending → acknowledged → en-route → on-scene → resolved
 * 
 * @param {string} reportId - UUID of the report to update
 * @param {string} status - New status (pending, acknowledged, en-route, on-scene, resolved, canceled)
 * @param {string} remarks - Optional notes from the officer (e.g., "Officers dispatched")
 * @returns {Promise<Object>} Updated report object
 */
export const updateReportStatus = async (reportId, status, remarks = '') => {
  try {
    const response = await apiClient.patch(`/reports/${reportId}/`, {
      status,
      remarks,
    });
    
    // Backend returns the updated report object
    return response.data;
    
  } catch (error) {
    console.error('Error updating report status:', error);
    
    if (error.response?.status === 400) {
      // Validation error (e.g., invalid status value)
      throw new Error(error.response.data?.detail || 'Invalid status update.');
    } else if (error.response?.status === 404) {
      throw new Error('Report not found.');
    } else if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    } else {
      throw new Error('Unable to update report status. Please try again.');
    }
  }
};

/**
 * Get route/directions for a report
 * 
 * Used by: Directions modal when officer needs navigation to incident location
 * Backend endpoint: GET /reports/{id}/route/
 * 
 * @param {string} reportId - UUID of the report
 * @returns {Promise<Object>} Route data with polyline, distance, ETA
 */
export const getReportRoute = async (reportId) => {
  try {
    const response = await apiClient.get(`/reports/${reportId}/route/`);
    
    // Backend returns:
    // {
    //   distance_text: "5.2 km",
    //   duration_text: "12 mins",
    //   polyline: "encoded_polyline_string",
    //   qr_code_url: "https://..."
    // }
    return response.data;
    
  } catch (error) {
    console.error('Error fetching report route:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Report not found.');
    } else if (error.response?.status === 500) {
      throw new Error('Unable to calculate route. Check your location services.');
    } else {
      throw new Error('Unable to load directions. Please try again.');
    }
  }
};

/**
 * Get messages for a specific report (police-citizen chat)
 * 
 * Used by: Report chat modal
 * Backend endpoint: GET /reports/{id}/messages/
 * 
 * @param {string} reportId - UUID of the report
 * @returns {Promise<Array>} Array of message objects
 */
export const getReportMessages = async (reportId) => {
  try {
    const response = await apiClient.get(`/reports/${reportId}/messages/`);
    
    // Backend returns array of messages:
    // [
    //   {
    //     message_id, content, timestamp, sender_type (citizen/police),
    //     sender_id, report_id
    //   }
    // ]
    return response.data;
    
  } catch (error) {
    console.error('Error fetching report messages:', error);
    throw new Error('Unable to load messages. Please try again.');
  }
};

/**
 * Send a message in report chat (police response)
 * 
 * Used by: Report chat modal when officer sends a message
 * Backend endpoint: POST /reports/{id}/messages/
 * 
 * @param {string} reportId - UUID of the report
 * @param {string} content - Message text content
 * @param {string} senderId - UUID of the sending officer/office
 * @returns {Promise<Object>} Created message object
 */
export const sendReportMessage = async (reportId, content, senderId) => {
  try {
    const response = await apiClient.post(`/reports/${reportId}/messages/`, {
      content,
      sender_type: 'police',  // Must match backend SENDER_TYPE_CHOICES enum
      sender_id: senderId,
      report: reportId,
    });
    
    return response.data;
    
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Unable to send message. Please try again.');
  }
};
