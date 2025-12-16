/**
 * Constants for Police Web Application
 */

/**
 * Polling Intervals (in milliseconds)
 * 
 * These intervals control how often the app fetches new data from the backend.
 * All polling intervals are centralized here for easy adjustment.
 * 
 * Search for "polling interval" in code to find all usages.
 */
export const POLLING_INTERVALS = {
  // Global Report Notifier: Polls for new reports to play sound notification
  // Dashboard: Polls for new reports assigned to this office
  // Both use the same interval so notifications and dashboard stay in sync
  GLOBAL_NOTIFIER_AND_DASHBOARD: 5000, // 15 seconds - DO NOT set below 10 seconds (causes server overload and UI glitches)
  
  // Report Chat: Polls for new messages in the report chat
  REPORT_CHAT: 3000, // 3 seconds

  // Live Map: Polls for map data (reports, offices, checkpoints)
  LIVE_MAP: 15000, // 15 seconds
}

