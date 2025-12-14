/**
 * Map Service
 * 
 * Handles fetching combined map data from the backend:
 * - Active reports (pins on map)
 * - Police offices (stations)
 * - Active checkpoints
 * 
 * Backend endpoint: GET /api/v1/admin/map/data/
 */

import apiClient from './api';

/**
 * Fetch all map data in one call
 * 
 * Used by: Map.jsx for real-time visualization
 * Returns: { active_reports, police_offices, active_checkpoints }
 * 
 * @param {Object} options - Optional filter parameters
 * @param {string} options.scopeReports - 'our_office' or 'all' (default: 'our_office')
 * @param {string} options.scopeCheckpoints - 'our_office' or 'all' (default: 'our_office')
 * @returns {Promise<Object>} Combined map data
 */
export const getMapData = async (options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.scopeReports) params.append('scope_reports', options.scopeReports);
    if (options.scopeCheckpoints) params.append('scope_checkpoints', options.scopeCheckpoints);
    
    const queryString = params.toString();
    const url = queryString ? `/admin/map/data/?${queryString}` : '/admin/map/data/';
    
    const response = await apiClient.get(url);
    
    // Backend returns:
    // {
    //   active_reports: [...],      // Reports filtered by scope
    //   police_offices: [...],      // All police stations
    //   active_checkpoints: [...]   // Checkpoints filtered by scope
    // }
    return response.data;
    
  } catch (error) {
    console.error('Error fetching map data:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    } else {
      throw new Error('Unable to load map data. Please try again.');
    }
  }
};

/**
 * Transform backend report to frontend marker format
 * 
 * @param {Object} backendReport - Report from API
 * @returns {Object} Frontend-compatible report object
 */
export const mapReportToMarker = (backendReport) => {
  const [barangay, city] = backendReport.incident_address?.split(', ') || ['', ''];
  
  return {
    id: backendReport.report_id,
    reporterId: backendReport.reporter?.user_id || null, // Needed for chat messages
    reporterName: backendReport.reporter_full_name || 'Anonymous',
    reporterPhone: backendReport.reporter?.phone || 'N/A',
    reporterEmail: backendReport.reporter?.email || 'N/A',
    category: backendReport.category,
    status: backendReport.status,
    description: backendReport.description || '',
    city: city || backendReport.location_city || '',
    barangay: barangay || backendReport.location_barangay || '',
    location: {
      lat: Number(backendReport.latitude),
      lng: Number(backendReport.longitude),
      address: backendReport.incident_address || 'Address Pending',
    },
    timestamp: backendReport.created_at,
    assignedOfficeName: backendReport.assigned_office_name,
    emergencyContact: {
      name: backendReport.reporter?.emergency_contact_name || 'N/A',
      phone: backendReport.reporter?.emergency_contact_number || 'N/A',
    },
    reporterAddress: {
      region: backendReport.reporter?.region || null,
      city: backendReport.reporter?.city || null,
      barangay: backendReport.reporter?.barangay || null,
    },
  };
};

/**
 * Transform backend checkpoint to frontend format
 * 
 * @param {Object} backendCheckpoint - Checkpoint from API
 * @returns {Object} Frontend-compatible checkpoint object
 */
export const mapCheckpointToMarker = (backendCheckpoint) => {
  // Format time fields (backend returns "HH:MM:SS", frontend expects "HH:MM")
  const formatTime = (timeStr) => {
    if (!timeStr) return '00:00';
    return timeStr.substring(0, 5); // "14:30:00" -> "14:30"
  };
  
  const timeStart = formatTime(backendCheckpoint.time_start);
  const timeEnd = formatTime(backendCheckpoint.time_end);
  
  return {
    id: backendCheckpoint.checkpoint_id,
    name: backendCheckpoint.checkpoint_name,
    contactNumber: backendCheckpoint.contact_number || '',
    timeStart,
    timeEnd,
    schedule: `${timeStart} - ${timeEnd}`,
    location: {
      lat: Number(backendCheckpoint.latitude),
      lng: Number(backendCheckpoint.longitude),
      address: backendCheckpoint.location || 'Address not set',
    },
    assignedOfficers: backendCheckpoint.assigned_officers || [],
    officeId: backendCheckpoint.office,
    officeName: backendCheckpoint.office_name,
    status: 'active', // Will be calculated by frontend based on time
  };
};

/**
 * Transform backend police office to frontend format
 * 
 * @param {Object} backendOffice - Police office from API
 * @returns {Object} Frontend-compatible office object
 */
export const mapOfficeToMarker = (backendOffice) => {
  return {
    id: backendOffice.office_id,
    name: backendOffice.office_name,
    headOfficer: backendOffice.head_officer,
    contactNumber: backendOffice.contact_number,
    location: {
      lat: Number(backendOffice.latitude),
      lng: Number(backendOffice.longitude),
    },
  };
};

/**
 * Reverse geocode coordinates to full address
 * 
 * Used by: Context menu on Map to show full address when right-clicking
 * Returns: { address_line, barangay, city, full_address }
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Geocoded address components
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await apiClient.get('/geocode/reverse/', {
      params: { lat, lng },
    });
    
    // Backend returns:
    // {
    //   address_line: "123 Main St, Brgy. Sample",
    //   barangay: "Brgy. Sample",
    //   city: "Manila",
    //   full_address: "123 Main St, Brgy. Sample, Manila"
    // }
    return response.data;
    
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    // Return fallback - just coordinates
    return {
      address_line: null,
      barangay: null,
      city: null,
      full_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    };
  }
};
