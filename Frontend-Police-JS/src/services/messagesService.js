/**
 * Messages Service
 * 
 * Handles all API calls related to chat messages between police and reporters.
 * Messages are nested under reports in the API.
 * 
 * Backend endpoints used:
 * - GET  /api/v1/reports/{report_id}/messages/     - List messages for a report
 * - POST /api/v1/reports/{report_id}/messages/     - Send a new message
 */

import apiClient from './api';

// Backend enum expects lowercase sender_type values matching the database enum
const normalizeSenderTypeForBackend = (senderType) => {
  const lower = (senderType || '').toLowerCase();
  if (lower === 'police' || lower === 'police_office') return 'police';
  if (lower === 'user') return 'user';
  return 'police';
};

/**
 * Fetch all messages for a specific report
 * 
 * Used by: ReportChatModal
 * Returns: Array of message objects sorted by timestamp (oldest first)
 * 
 * @param {string} reportId - UUID of the report
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (reportId) => {
  try {
    const response = await apiClient.get(`/reports/${reportId}/messages/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    if (error.response?.status === 404) {
      throw new Error('Report not found.');
    }
    throw new Error('Unable to load messages. Please try again.');
  }
};

/**
 * Send a new message for a specific report
 * 
 * Used by: ReportChatModal when police sends a message
 * 
 * @param {string} reportId - UUID of the report
 * @param {string} content - Message text content
 * @param {string} senderId - UUID of sender (police office ID)
 * @param {string} senderType - Either 'police' or 'user'
 * @param {string} receiverId - UUID of receiver (reporter user ID)
 * @returns {Promise<Object>} Created message object
 */
export const sendMessage = async (reportId, content, senderId, senderType, receiverId) => {
  try {
    const backendSenderType = normalizeSenderTypeForBackend(senderType);
    const response = await apiClient.post(`/reports/${reportId}/messages/`, {
      message_content: content,
      sender_id: senderId,
      sender_type: backendSenderType,
      receiver_id: receiverId,
    });
    return response.data;
  } catch (error) {
    // Log detailed error info to help diagnose why sending fails
    console.error('Error sending message:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    if (error.response?.status === 404) {
      throw new Error('Report not found.');
    }
    const backendDetail = error.response?.data?.detail || error.response?.data?.message;
    throw new Error(backendDetail ? `Unable to send message: ${backendDetail}` : 'Unable to send message. Please try again.');
  }
};

/**
 * Transform backend message to frontend format
 * 
 * @param {Object} backendMessage - Message from API
 * @returns {Object} Frontend-compatible message object
 */
export const mapMessageToFrontend = (backendMessage) => {
  return {
    id: backendMessage.message_id,
    text: backendMessage.message_content,
    timestamp: new Date(backendMessage.timestamp),
    // Normalize to lowercase for consistent UI handling
    senderType: (backendMessage.sender_type || '').toLowerCase(),
    senderId: backendMessage.sender_id,
    receiverId: backendMessage.receiver_id,
  };
};
