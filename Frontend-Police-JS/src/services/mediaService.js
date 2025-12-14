/**
 * Media Service
 *
 * Handles evidence uploads and retrieval for reports.
 *
 * Backend endpoints:
 * - GET  /media/?report_id=<uuid>     (list media for a report)
 * - POST /media/                      (upload a new media file)
 *
 * Notes:
 * - Upload uses multipart/form-data (FormData).
 * - Backend requires JWT (Authorization header) which apiClient adds automatically.
 */

import apiClient from './api'

export const getReportMedia = async (reportId) => {
  try {
    const response = await apiClient.get('/media/', { params: { report_id: reportId } })
    return response.data
  } catch (error) {
    console.error('Failed to fetch report media:', error)
    throw new Error(error.response?.data?.detail || 'Failed to load attachments')
  }
}

export const uploadMedia = async ({ reportId, file, fileType, senderId, onProgress }) => {
  try {
    const formData = new FormData()
    formData.append('uploaded_file', file)
    formData.append('report', reportId)
    formData.append('file_type', fileType)
    formData.append('sender_id', senderId)

    const response = await apiClient.post('/media/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (!onProgress) return
        const total = evt.total || 0
        const percent = total ? Math.round((evt.loaded / total) * 100) : null
        onProgress(percent)
      },
    })

    return response.data
  } catch (error) {
    console.error('Failed to upload media:', error)
    throw new Error(error.response?.data?.detail || 'Failed to upload file')
  }
}


