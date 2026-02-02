/**
 * Capacitor Payment Utilities
 * 
 * This file provides utilities for handling Cashfree payments in a Capacitor mobile app.
 * Uses in-app browser for payment with HTTPS return URLs (Cashfree doesn't support custom schemes).
 * Polls for payment completion and closes browser automatically.
 */

import { isCapacitor } from './capacitorAuth';
import { base44 } from '@/api/base44Client';

// Your app's web URL for payment callbacks
const APP_BASE_URL = 'https://circle-eb51a399.base44.app';

/**
 * Open Cashfree payment in Capacitor browser
 * Uses HTTPS return URL and polls for payment completion
 * 
 * @param {string} paymentSessionId - Cashfree payment session ID
 * @param {string} orderId - Order ID for tracking
 * @param {string} bookingId - Booking ID for callback
 * @param {function} onSuccess - Callback when payment succeeds
 * @param {function} onFailure - Callback when payment fails or is cancelled
 */
export const openCashfreePayment = async (paymentSessionId, orderId, bookingId, onSuccess, onFailure) => {
  // Return URL points to your web app's PaymentCallback page
  const returnUrl = `${APP_BASE_URL}/PaymentCallback?order_id=${orderId}&booking_id=${bookingId}`;
  
  // Build Cashfree payment URL
  const paymentUrl = `https://cashfree.com/pg/view/order/${paymentSessionId}?return_url=${encodeURIComponent(returnUrl)}`;

  if (!isCapacitor()) {
    // For web, redirect to payment page
    window.location.href = paymentUrl;
    return;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    
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
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch (error) {
    console.error('Failed to close payment browser:', error);
  }
};