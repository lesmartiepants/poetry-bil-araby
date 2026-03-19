/**
 * IndexedDB cache layer for audio, insights, and poems.
 */

import { FEATURES } from '../constants/index.js';

export const CACHE_CONFIG = {
  dbName: 'poetry-cache-v1',
  version: 1,
  stores: {
    audio: 'audio-cache',
    insights: 'insights-cache',
    poems: 'poems-cache',
  },
  expiry: {
    audio: 7 * 24 * 60 * 60 * 1000, // 7 days
    insights: 30 * 24 * 60 * 60 * 1000, // 30 days
    poems: null, // Never expire
  },
  maxSize: 500 * 1024 * 1024, // 500MB
};

/**
 * Initialize IndexedDB cache database.
 * Creates object stores for audio, insights, and poems if they don't exist.
 */
export const initCache = () => {
  return new Promise((resolve, reject) => {
    if (!FEATURES.caching) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(CACHE_CONFIG.dbName, CACHE_CONFIG.version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.audio)) {
        db.createObjectStore(CACHE_CONFIG.stores.audio, { keyPath: 'poemId' });
      }
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.insights)) {
        db.createObjectStore(CACHE_CONFIG.stores.insights, { keyPath: 'poemId' });
      }
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.poems)) {
        db.createObjectStore(CACHE_CONFIG.stores.poems, { keyPath: 'poemId' });
      }
    };
  });
};

/**
 * Cache operations for IndexedDB.
 * Provides get, set, delete, and clear operations with expiry checking.
 */
export const cacheOperations = {
  /**
   * Get an item from cache with expiry check.
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @returns {Promise<Object|null>} Cached data or null if expired/missing
   */
  async get(storeName, poemId) {
    if (!FEATURES.caching) return null;

    try {
      const db = await initCache();
      if (!db) return null;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(poemId);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check expiry
          const expiryTime =
            storeName === CACHE_CONFIG.stores.audio
              ? CACHE_CONFIG.expiry.audio
              : storeName === CACHE_CONFIG.stores.insights
                ? CACHE_CONFIG.expiry.insights
                : CACHE_CONFIG.expiry.poems;

          if (expiryTime && result.timestamp) {
            const age = Date.now() - result.timestamp;
            if (age > expiryTime) {
              // Expired - delete and return null
              cacheOperations.delete(storeName, poemId);
              resolve(null);
              return;
            }
          }

          resolve(result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set an item in cache with timestamp.
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @param {Object} data - Data to cache (will be wrapped with poemId and timestamp)
   * @returns {Promise<boolean>} Success status
   */
  async set(storeName, poemId, data) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const record = {
          poemId,
          timestamp: Date.now(),
          ...data,
        };
        const request = store.put(record);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * Delete an item from cache.
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @returns {Promise<boolean>} Success status
   */
  async delete(storeName, poemId) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(poemId);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  /**
   * Clear all items from a store.
   * @param {string} storeName - Name of the object store
   * @returns {Promise<boolean>} Success status
   */
  async clear(storeName) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  },
};
