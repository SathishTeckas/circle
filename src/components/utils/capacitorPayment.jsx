/**
 * Capacitor Payment Utilities
 * 
 * This file provides utilities for handling Cashfree payments in a Capacitor mobile app.
 * Uses in-app browser for payment with deep link callbacks.
 */

import { isCapacitor, APP_SCHEME, DEEP_LINKS } from './capacitorAuth';

/**
 * Initialize payment deep link listener
 * Call this in your payment page or app entry point
 */
export const initPaymentListener = async (onPaymentCallback) => {
  if (!isCapacitor()) return null;

  try {
    const { App } = await import('@capacitor/app');
    
    const listener = await App.addListener('appUrlOpen', (event) => {
      const url = event.url;
      
      // Handle payment callbacks
      if (url.startsWith(`${APP_SCHEME}://payment`)) {
        const urlObj = new URL(url.replace(`${APP_SCHEME}://`, 'https://'));
        const orderId = urlObj.searchParams.get('order_id');
        const status = urlObj.searchParams.get('status');
        const transactionId = urlObj.searchParams.get('transaction_id');
        
        if (onPaymentCallback) {
          onPaymentCallback({
            orderId,
            status,
            transactionId,
            success: url.includes('/success') || status === 'SUCCESS'
          });
        }
      }
    });

    return listener;
  } catch (error) {
    console.error('Failed to initialize payment listener:', error);
    return null;
  }
};

/**
 * Open Cashfree payment in Capacitor browser
 * @param {string} paymentSessionId - Cashfree payment session ID
 * @param {string} orderId - Order ID for tracking
 * @param {string} environment - 'sandbox' or 'production'
 */
export const openCashfreePayment = async (paymentSessionId, orderId, environment = 'production') => {
  // Cashfree payment link format
  const baseUrl = environment === 'sandbox' 
    ? 'https://sandbox.cashfree.com/pg/view/order'
    : 'https://cashfree.com/pg/view/order';
  
  // Return URLs for deep linking
  const returnUrl = `${DEEP_LINKS.PAYMENT_SUCCESS}?order_id=${orderId}`;
  const cancelUrl = `${DEEP_LINKS.PAYMENT_FAILURE}?order_id=${orderId}`;
  
  // Build payment URL
  const paymentUrl = `${baseUrl}/${paymentSessionId}?return_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

  if (!isCapacitor()) {
    // For web, redirect to payment page
    window.location.href = paymentUrl;
    return;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    
    // Add listener to close browser when returning to app
    const { App } = await import('@capacitor/app');
    
    const closeListener = await App.addListener('appUrlOpen', async (event) => {
      if (event.url.startsWith(`${APP_SCHEME}://payment`)) {
        await Browser.close();
        closeListener.remove();
      }
    });

    await Browser.open({
      url: paymentUrl,
      presentationStyle: 'fullscreen',
      toolbarColor: '#FFD93D' // Match your app theme
    });
  } catch (error) {
    console.error('Failed to open payment browser:', error);
    window.location.href = paymentUrl;
  }
};

/**
 * Alternative: Open payment using Cashfree's hosted payment page
 * Use this if you have a web checkout URL from your backend
 */
export const openPaymentUrl = async (paymentUrl, orderId) => {
  if (!isCapacitor()) {
    window.location.href = paymentUrl;
    return;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    const { App } = await import('@capacitor/app');
    
    // Close browser when deep link is received
    const closeListener = await App.addListener('appUrlOpen', async (event) => {
      if (event.url.startsWith(`${APP_SCHEME}://payment`)) {
        await Browser.close();
        closeListener.remove();
      }
    });

    await Browser.open({
      url: paymentUrl,
      presentationStyle: 'fullscreen',
      toolbarColor: '#FFD93D'
    });
  } catch (error) {
    console.error('Failed to open payment URL:', error);
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