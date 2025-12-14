/**
 * Checkpoints Service
 * 
 * Handles CRUD operations for police checkpoints:
 * - List all checkpoints
 * - Get active checkpoints only
 * - Create new checkpoint
 * - Update existing checkpoint
 * - Delete checkpoint
 * 
 * Backend endpoints:
 * - GET    /api/v1/checkpoints/          - List all
 * - GET    /api/v1/checkpoints/active/   - List active only
 * - POST   /api/v1/checkpoints/          - Create
 * - GET    /api/v1/checkpoints/{id}/     - Get single
 * - PATCH  /api/v1/checkpoints/{id}/     - Update
 * - DELETE /api/v1/checkpoints/{id}/     - Delete
 */

import apiClient from './api';

/**
 * Fetch all checkpoints
 * 
 * @returns {Promise<Array>} Array of checkpoint objects
 */
export const getAllCheckpoints = async () => {
  try {
    const response = await apiClient.get('/checkpoints/');
    return response.data;
  } catch (error) {
    console.error('Error fetching checkpoints:', error);
    throw new Error('Unable to load checkpoints. Please try again.');
  }
};

/**
 * Fetch only active checkpoints (based on current time)
 * Backend calculates active status using time_start/time_end
 * 
 * @returns {Promise<Array>} Array of active checkpoint objects
 */
export const getActiveCheckpoints = async () => {
  try {
    const response = await apiClient.get('/checkpoints/active/');
    return response.data;
  } catch (error) {
    console.error('Error fetching active checkpoints:', error);
    throw new Error('Unable to load active checkpoints. Please try again.');
  }
};

/**
 * Get single checkpoint by ID
 * 
 * @param {string} checkpointId - UUID of the checkpoint
 * @returns {Promise<Object>} Checkpoint object
 */
export const getCheckpoint = async (checkpointId) => {
  try {
    const response = await apiClient.get(`/checkpoints/${checkpointId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching checkpoint:', error);
    if (error.response?.status === 404) {
      throw new Error('Checkpoint not found.');
    }
    throw new Error('Unable to load checkpoint. Please try again.');
  }
};

/**
 * Create a new checkpoint
 * 
 * @param {Object} checkpointData - Checkpoint data
 * @param {string} checkpointData.checkpoint_name - Name of checkpoint
 * @param {string} checkpointData.contact_number - Contact phone
 * @param {string} checkpointData.time_start - Start time "HH:MM"
 * @param {string} checkpointData.time_end - End time "HH:MM"
 * @param {number} checkpointData.latitude - GPS latitude
 * @param {number} checkpointData.longitude - GPS longitude
 * @param {string} checkpointData.location - Address string
 * @param {string[]} checkpointData.assigned_officers - Array of officer names
 * @param {string} checkpointData.office - Office UUID (foreign key)
 * @returns {Promise<Object>} Created checkpoint object
 */
export const createCheckpoint = async (checkpointData) => {
  try {
    const response = await apiClient.post('/checkpoints/', checkpointData);
    return response.data;
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Invalid checkpoint data.');
    }
    throw new Error('Unable to create checkpoint. Please try again.');
  }
};

/**
 * Update an existing checkpoint
 * 
 * @param {string} checkpointId - UUID of the checkpoint
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated checkpoint object
 */
export const updateCheckpoint = async (checkpointId, updateData) => {
  try {
    const response = await apiClient.patch(`/checkpoints/${checkpointId}/`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating checkpoint:', error);
    if (error.response?.status === 404) {
      throw new Error('Checkpoint not found.');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Invalid checkpoint data.');
    }
    throw new Error('Unable to update checkpoint. Please try again.');
  }
};

/**
 * Delete a checkpoint
 * 
 * @param {string} checkpointId - UUID of the checkpoint
 * @returns {Promise<void>}
 */
export const deleteCheckpoint = async (checkpointId) => {
  try {
    await apiClient.delete(`/checkpoints/${checkpointId}/`);
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    if (error.response?.status === 404) {
      throw new Error('Checkpoint not found.');
    }
    throw new Error('Unable to delete checkpoint. Please try again.');
  }
};

/**
 * Transform frontend checkpoint format to backend format
 * Frontend uses camelCase; backend expects snake_case
 * 
 * @param {Object} frontendData - Frontend checkpoint object
 * @param {string} officeId - Police office UUID to assign
 * @returns {Object} Backend-compatible checkpoint data
 */
export const toBackendFormat = (frontendData, officeId) => {
  return {
    checkpoint_name: frontendData.name,
    contact_number: frontendData.contactNumber || '',
    time_start: frontendData.timeStart || '00:00',
    time_end: frontendData.timeEnd || '23:59',
    latitude: frontendData.location?.lat || frontendData.latitude,
    longitude: frontendData.location?.lng || frontendData.longitude,
    location: frontendData.location?.address || frontendData.address || '',
    assigned_officers: frontendData.assignedOfficers || [],
    office: officeId,
  };
};
