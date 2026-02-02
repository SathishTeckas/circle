/**
 * Capacitor Payment Utilities
 * 
 * This file provides utilities for handling Cashfree payments in a Capacitor mobile app.
 * Uses in-app browser for payment with HTTPS return URLs (Cashfree doesn't support custom schemes).
 * Polls for payment completion and closes browser automatically.
 * 
 * NOTE: Capacitor packages are dynamically imported only when running in native environment.
 * This allows the code to build in web environments without Capacitor installed.
 */

import { isCapacitor } from './capacitorAuth';
import { base44 } from '@/api/base44Client';

// Your app's web URL for payment callbacks
const APP_BASE_URL = 'https://circle-eb51a399.base44.app';

// Dynamic import helper for Capacitor Browser
const getBrowser = async () => {
  if (!isCapacitor()) return null;
  try {
    const module = await import('@capacitor/browser');
    return module.Browser;
  } catch (e) {
    console.warn('Capacitor Browser not available');
    return null;
  }
};

/**
 * Create a payment using Payment Links API (mobile-compatible)
 * This creates a hosted checkout URL that works in any browser
 * @param {Object} params - Payment parameters
 * @param {string} params.bookingId - Booking ID
 * @param {number} params.amount - Payment amount
 * @param {function} onSuccess - Success callback
 * @param {function} onFailure - Failure callback
 */
export const createMobilePayment = async ({ bookingId, amount }, onSuccess, onFailure) => {
  try {
    // Create payment link (works in any browser including Capacitor WebView)
    const { data } = await base44.functions.invoke('createPaymentOrder', {
      booking_id: bookingId,
      amount: amount,
      use_payment_link: true, // Use Payment Links API instead of Orders API
      return_url: `${APP_BASE_URL}/PaymentCallback?booking_id=${bookingId}&order_id={order_id}`
    });

    if (!data.success || !data.link_url) {
      if (onFailure) onFailure({ error: data.error || 'Failed to create payment link' });
      return null;
    }

    return {
      orderId: data.order_id,
      linkUrl: data.link_url, // This is the hosted checkout URL
      linkId: data.link_id
    };
  } catch (error) {
    console.error('Failed to create mobile payment:', error);
    if (onFailure) onFailure({ error: error.message });
    return null;
  }
};

/**
 * Open Cashfree payment in Capacitor browser
 * Uses HTTPS return URL and polls for payment completion
 * 
 * @param {string} paymentSessionId - Cashfree payment session ID (can be null if using linkUrl)
 * @param {string} orderId - Order ID for tracking
 * @param {string} bookingId - Booking ID for callback
 * @param {function} onSuccess - Callback when payment succeeds
 * @param {function} onFailure - Callback when payment fails or is cancelled
 * @param {string} linkUrl - Direct payment link URL from Payment Links API (optional)
 */
export const openCashfreePayment = async (paymentSessionId, orderId, bookingId, onSuccess, onFailure, linkUrl = null) => {
  // Return URL points to your web app's PaymentCallback page
  const returnUrl = `${APP_BASE_URL}/PaymentCallback?order_id=${orderId}&booking_id=${bookingId}`;
  
  // If linkUrl is provided (Payment Links API), use it directly - works in any browser
  // Otherwise, build URL from payment session ID (Orders API) - may have WebView issues
  let paymentUrl;
  if (linkUrl) {
    paymentUrl = linkUrl;
  } else {
    paymentUrl = `https://cashfree.com/pg/view/order/${paymentSessionId}?return_url=${encodeURIComponent(returnUrl)}`;
  }

  if (!isCapacitor()) {
    // For web, redirect to payment page
    window.location.href = paymentUrl;
    return;
  }

  try {
    const Browser = await getBrowser();
    if (!Browser) {
      window.location.href = paymentUrl;
      return;
    }
    
    let pollInterval = null;
    let browserClosed = false;
    let paymentVerified = false;
    
    // Start polling to check if payment completed
    pollInterval = setInterval(async () => {
      try {
        const { data } = await base44.functions.invoke('verifyPayment', { order_id: orderId });
        
        if (data.is_paid) {
          paymentVerified = true;
          clearInterval(pollInterval);
          browserClosed = true;
          await Browser.close();
          if (onSuccess) onSuccess({ orderId, bookingId });
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          clearInterval(pollInterval);
          browserClosed = true;
          await Browser.close();
          if (onFailure) onFailure({ orderId, status: data.status });
        }
      } catch (e) {
        // Ignore polling errors, continue checking
      }
    }, 2000); // Check every 2 seconds
    
    // Listen for browser close event
    const closeListener = await Browser.addListener('browserFinished', () => {
      clearInterval(pollInterval);
      closeListener.remove();
      
      // If browser closed without payment verified, treat as cancelled
      if (!browserClosed && !paymentVerified) {
        // Do one final check
        setTimeout(async () => {
          try {
            const { data } = await base44.functions.invoke('verifyPayment', { order_id: orderId });
            if (data.is_paid) {
              if (onSuccess) onSuccess({ orderId, bookingId });
            } else {
              if (onFailure) onFailure({ orderId, status: 'CANCELLED' });
            }
          } catch (e) {
            if (onFailure) onFailure({ orderId, status: 'UNKNOWN' });
          }
        }, 1000);
      }
    });

    await Browser.open({
      url: paymentUrl,
      presentationStyle: 'fullscreen',
      toolbarColor: '#FFD93D'
    });
    
    // Timeout after 10 minutes
    setTimeout(() => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    }, 10 * 60 * 1000);
    
  } catch (error) {
    console.error('Failed to open payment browser:', error);
    // Fallback to regular redirect
    window.location.href = paymentUrl;
  }
};

/**
 * Close payment browser manually
 */
export const closePaymentBrowser = async () => {
  if (!isCapacitor()) return;

  try {
    const Browser = await getBrowser();
    if (Browser) await Browser.close();
  } catch (error) {
    console.error('Failed to close payment browser:', error);
  }
};