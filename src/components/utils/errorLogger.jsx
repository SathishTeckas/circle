import { base44 } from '@/api/base44Client';

/**
 * Log an error to the backend
 * @param {Object} options - Error logging options
 * @param {string} options.error - Error message or Error object
 * @param {string} options.action - What the user was trying to do
 * @param {string} options.severity - 'low', 'medium', 'high', or 'critical'
 * @param {string} options.page - Optional page name (defaults to current path)
 */
export async function logError({ error, action, severity = 'medium', page = null }) {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;

    await base44.functions.invoke('logError', {
      error_message: errorMessage,
      error_stack: errorStack,
      page: page || window.location.pathname,
      action,
      severity,
      browser_info: navigator.userAgent
    });
  } catch (e) {
    // Fail silently - don't break the app if logging fails
    console.error('Failed to log error:', e);
  }
}

/**
 * Wrap an async function with error logging
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Error logging options
 * @returns {Function} Wrapped function
 */
export function withErrorLogging(fn, { action, severity = 'medium' }) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      await logError({ error, action, severity });
      throw error; // Re-throw so the error can still be handled by the caller
    }
  };
}