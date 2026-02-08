/**
 * Settings Cache Service
 * 
 * Provides caching for admin settings with TTL support.
 * Used by services to avoid frequent database queries.
 * 
 * Requirements: 6.3 - Cache settings with TTL
 */

import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support
 */
class SettingsCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number = 60 * 1000; // 60 seconds default

  /**
   * Get cached value
   * @param key - Cache key
   * @returns Cached value or null if expired/not found
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug('Cache entry expired', { key });
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlMs - Time to live in milliseconds (default: 60s)
   */
  set<T>(key: string, data: T, ttlMs: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
    logger.debug('Cache entry set', { key, ttlMs });
  }

  /**
   * Invalidate cache entry
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache entry invalidated', { key });
  }

  /**
   * Invalidate all entries matching a prefix
   * @param prefix - Key prefix to match
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    logger.debug('Cache entries invalidated by prefix', { prefix });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const settingsCache = new SettingsCache();

// Cache key generators
export const CACHE_KEYS = {
  smtp: () => 'settings:smtp',
  whatsapp: () => 'settings:whatsapp',
  instagram: () => 'settings:instagram',
  openai: () => 'settings:openai',
  category: (category: string) => `settings:${category}`,
};

// Default TTL values (in milliseconds)
export const CACHE_TTL = {
  settings: 60 * 1000, // 60 seconds for settings
  shortLived: 30 * 1000, // 30 seconds
  longLived: 5 * 60 * 1000, // 5 minutes
};
