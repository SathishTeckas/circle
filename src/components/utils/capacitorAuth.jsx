/**
 * Capacitor Authentication Utilities
 * 
 * This file provides utilities for handling authentication in a Capacitor mobile app.
 * It detects the platform and uses appropriate login methods.
 */

// Check if running in Capacitor native environment
export const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         window.Capacitor.isNativePlatform();
};

// Check if running on iOS
export const isIOS = () => {
  return isCapacitor() && window.Capacitor.getPlatform() === 'ios';
};

// Check if running on Android
export const isAndroid = () => {
  return isCapacitor() && window.Capacitor.getPlatform() === 'android';
};

// App URL scheme for deep linking
export const APP_SCHEME = 'circle';

// Deep link URLs
export const DEEP_LINKS = {
  AUTH_CALLBACK: `${APP_SCHEME}://auth/callback`,
  PAYMENT_CALLBACK: `${APP_SCHEME}://payment/callback`,
  PAYMENT_SUCCESS: `${APP_SCHEME}://payment/success`,
  PAYMENT_FAILURE: `${APP_SCHEME}://payment/failure`,
};

/**
 * Initialize Capacitor auth listener
 * Call this in your app's entry point (e.g., Layout.js or App.js)
 */
export const initCapacitorAuthListener = async (onAuthCallback) => {
  if (!isCapacitor()) return null;

  try {
    const { App } = await import('@capacitor/app');
    
    // Listen for deep link events
    const listener = await App.addListener('appUrlOpen', (event) => {
      const url = event.url;
      
      // Handle auth callback
      if (url.startsWith(DEEP_LINKS.AUTH_CALLBACK)) {
        const urlParams = new URL(url.replace(`${APP_SCHEME}://`, 'https://'));
        const token = urlParams.searchParams.get('token');
        const error = urlParams.searchParams.get('error');
        
        if (onAuthCallback) {
          onAuthCallback({ token, error });
        }
      }
    });

    return listener;
  } catch (error) {
    console.error('Failed to initialize Capacitor auth listener:', error);
    return null;
  }
};

/**
 * Open login page in Capacitor browser
 * @param {string} loginUrl - The Base44 login URL
 * @param {string} redirectUrl - The deep link URL to redirect after login
 */
export const openCapacitorLogin = async (loginUrl, redirectUrl) => {
  if (!isCapacitor()) {
    // Fallback to regular redirect for web
    window.location.href = loginUrl;
    return;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    
    // Append redirect URL to login URL
    const fullLoginUrl = `${loginUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
    
    await Browser.open({
      url: fullLoginUrl,
      presentationStyle: 'popover', // iOS specific
      windowName: '_blank'
    });
  } catch (error) {
    console.error('Failed to open Capacitor browser:', error);
    // Fallback to regular redirect
    window.location.href = loginUrl;
  }
};

/**
 * Close Capacitor browser (call after successful auth)
 */
export const closeCapacitorBrowser = async () => {
  if (!isCapacitor()) return;

  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch (error) {
    console.error('Failed to close Capacitor browser:', error);
  }
};

/**
 * Store auth token securely in Capacitor
 * @param {string} token - The auth token to store
 */
export const storeAuthToken = async (token) => {
  if (!isCapacitor()) {
    // Fallback to localStorage for web
    localStorage.setItem('auth_token', token);
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({
      key: 'auth_token',
      value: token
    });
  } catch (error) {
    console.error('Failed to store auth token:', error);
    localStorage.setItem('auth_token', token);
  }
};

/**
 * Retrieve auth token from Capacitor storage
 * @returns {Promise<string|null>}
 */
export const getAuthToken = async () => {
  if (!isCapacitor()) {
    return localStorage.getItem('auth_token');
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'auth_token' });
    return value;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return localStorage.getItem('auth_token');
  }
};

/**
 * Remove auth token (for logout)
 */
export const removeAuthToken = async () => {
  if (!isCapacitor()) {
    localStorage.removeItem('auth_token');
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: 'auth_token' });
  } catch (error) {
    console.error('Failed to remove auth token:', error);
    localStorage.removeItem('auth_token');
  }
};