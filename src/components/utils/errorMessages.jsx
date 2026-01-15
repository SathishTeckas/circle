import { toast } from 'sonner';
import { logError } from './errorLogger';

/**
 * User-friendly error messages for common errors
 */
const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  auth: 'Please sign in to continue.',
  permission: 'You don\'t have permission to do this.',
  notFound: 'The requested item was not found.',
  validation: 'Please check your input and try again.',
  payment: 'Payment failed. Please try again.',
  timeout: 'Request timed out. Please try again.',
  default: 'Something went wrong. Please try again.'
};

/**
 * Show a user-friendly error toast and log the error
 * @param {Error|string} error - The error to handle
 * @param {Object} options - Additional options
 * @param {string} options.action - What the user was trying to do
 * @param {string} options.severity - Error severity (default: 'medium')
 * @param {string} options.customMessage - Custom message to show user
 */
export async function handleError(error, { action, severity = 'medium', customMessage = null } = {}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Determine user-friendly message
  let userMessage = customMessage;
  if (!userMessage) {
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = ERROR_MESSAGES.network;
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      userMessage = ERROR_MESSAGES.auth;
      severity = 'low';
    } else if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      userMessage = ERROR_MESSAGES.permission;
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      userMessage = ERROR_MESSAGES.notFound;
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      userMessage = ERROR_MESSAGES.validation;
      severity = 'low';
    } else if (errorMessage.includes('payment') || errorMessage.includes('stripe')) {
      userMessage = ERROR_MESSAGES.payment;
      severity = 'high';
    } else if (errorMessage.includes('timeout')) {
      userMessage = ERROR_MESSAGES.timeout;
    } else {
      userMessage = ERROR_MESSAGES.default;
    }
  }

  // Show toast
  toast.error(userMessage);

  // Log error
  if (action) {
    await logError({ error, action, severity });
  }
}

/**
 * Wrap a mutation with error handling
 * @param {Function} mutationFn - The mutation function
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped mutation function
 */
export function withErrorHandling(mutationFn, options = {}) {
  return async (...args) => {
    try {
      return await mutationFn(...args);
    } catch (error) {
      await handleError(error, options);
      throw error;
    }
  };
}