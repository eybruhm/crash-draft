/**
 * Error Handling Utilities
 * 
 * Standard error handling and user feedback
 */

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}

export function getErrorMessage(error) {
  if (error.message) {
    return error.message
  }
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.response?.statusText) {
    return error.response.statusText
  }
  return 'An unexpected error occurred. Please try again.'
}

