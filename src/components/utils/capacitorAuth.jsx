/**
 * Capacitor Authentication Utilities
 * 
 * This file provides utilities for handling authentication in a Capacitor mobile app.
 * Uses in-app browser with polling to detect when login completes.
 * 
 * NOTE: Capacitor packages are dynamically imported only when running in native environment.
 * This allows the code to build in web environments without Capacitor installed.
 */

import { base44 } from '@/api/base44Client';

// Check if running in Capacitor native environment
export const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         window.Capacitor.isNativePlatform();
};

// Dynamic import helper for Capacitor Browser
// Using Function constructor to completely hide the import from bundler
const getBrowser = async () => {
  if (!isCapacitor()) return null;
  try {
    // Hide from bundler - Capacitor packages only exist in native builds
    const importFn = new Function('specifier', 'return import(specifier)');
    const module = await importFn('@capacitor/browser');
    return module.Browser;
  } catch (e) {
    console.warn('Capacitor Browser not available');
    return null;
  }
};

// Dynamic import helper for Capacitor Preferences
const getPreferences = async () => {
  if (!isCapacitor()) return null;
  try {
    // Hide from bundler - Capacitor packages only exist in native builds
    const importFn = new Function('specifier', 'return import(specifier)');
    const module = await importFn('@capacitor/preferences');
    return module.Preferences;
  } catch (e) {
    console.warn('Capacitor Preferences not available');
    return null;
  }
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

// Deep link URLs (for payments)
export const DEEP_LINKS = {
  PAYMENT_CALLBACK: `${APP_SCHEME}://payment/callback`,
  PAYMENT_SUCCESS: `${APP_SCHEME}://payment/success`,
  PAYMENT_FAILURE: `${APP_SCHEME}://payment/failure`,
};

/**
 * Open login in Capacitor browser and poll for auth completion
 * @param {string} loginUrl - The Base44 login URL
 * @param {function} onSuccess - Callback when login succeeds
 * @param {function} onCancel - Callback when browser is closed without login
 */
export const openCapacitorLogin = async (loginUrl, onSuccess, onCancel) => {
  if (!isCapacitor()) {
    // Fallback to regular redirect for web
    window.location.href = loginUrl;
    return;
  }

  try {
    const Browser = await getBrowser();
    if (!Browser) {
      window.location.href = loginUrl;
      return;
    }
    
    let pollInterval = null;
    let browserClosed = false;
    
    // Start polling to check if user logged in
    pollInterval = setInterval(async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          clearInterval(pollInterval);
          browserClosed = true;
          await Browser.close();
          if (onSuccess) onSuccess();
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 1500); // Check every 1.5 seconds
    
    // Listen for browser close event
    const closeListener = await Browser.addListener('browserFinished', () => {
      clearInterval(pollInterval);
      closeListener.remove();
      if (!browserClosed && onCancel) {
        onCancel();
      }
    });
    
    // Open login URL - Base44 will redirect back to the app URL after login
    // The app URL is already whitelisted in Base44's OAuth
    await Browser.open({
      url: loginUrl,
      presentationStyle: 'fullscreen',
      toolbarColor: '#FFD93D'
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    }, 5 * 60 * 1000);
    
  } catch (error) {
    console.error('Failed to open Capacitor browser:', error);
    // Fallback to regular redirect
    window.location.href = loginUrl;
  }
};

/**
 * Close Capacitor browser
 */
export const closeCapacitorBrowser = async () => {
  if (!isCapacitor()) return;

  try {
    const Browser = await getBrowser();
    if (Browser) await Browser.close();
  } catch (error) {
    console.error('Failed to close Capacitor browser:', error);
  }
};

/**
 * Store data securely in Capacitor
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
export const storeSecure = async (key, value) => {
  if (!isCapacitor()) {
    localStorage.setItem(key, value);
    return;
  }

  try {
    const Preferences = await getPreferences();
    if (Preferences) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('Failed to store data:', error);
    localStorage.setItem(key, value);
  }
};

/**
 * Retrieve data from Capacitor storage
 * @param {string} key - Storage key
 * @returns {Promise<string|null>}
 */
export const getSecure = async (key) => {
  if (!isCapacitor()) {
    return localStorage.getItem(key);
  }

  try {
    const Preferences = await getPreferences();
    if (Preferences) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Failed to get data:', error);
    return localStorage.getItem(key);
  }
};

/**
 * Remove data from storage
 * @param {string} key - Storage key
 */
export const removeSecure = async (key) => {
  if (!isCapacitor()) {
    localStorage.removeItem(key);
    return;
  }

  try {
    const Preferences = await getPreferences();
    if (Preferences) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to remove data:', error);
    localStorage.removeItem(key);
  }
};

/**
 * Capacitor-compatible logout
 * @param {string} redirectUrl - URL to redirect after logout
 */
export const capacitorLogout = async (redirectUrl) => {
  await base44.auth.logout(redirectUrl);
};