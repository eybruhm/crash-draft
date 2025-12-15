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
  // Axios / HTTP errors: prefer server-provided validation details
  const data = error?.response?.data
  if (data) {
    if (typeof data === 'string') return data
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.message === 'string') return data.message

    // DRF validation errors are often: { field: ["msg1", "msg2"], ... }
    if (typeof data === 'object') {
      const parts = Object.entries(data).flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((v) => `${key}: ${String(v)}`)
        }
        if (value && typeof value === 'object') {
          return [`${key}: ${JSON.stringify(value)}`]
        }
        return [`${key}: ${String(value)}`]
      })
      if (parts.length) return parts.join(' | ')
    }
  }

  if (error?.message) return error.message
  if (error?.response?.statusText) return error.response.statusText
  return 'An unexpected error occurred. Please try again.'
}

