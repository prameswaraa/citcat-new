/**
 * Template Cache Service
 * 
 * Provides Redis caching for template-related data:
 * - Template list per user
 * - Variable mappings per template
 * 
 * Requirements: Performance optimization for template operations
 */

import { getCache, setCache, deleteCache, deleteCachePattern, CACHE_TTL } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

// Cache TTL constants (in seconds)
export const TEMPLATE_CACHE_TTL = {
  TEMPLATE_LIST: 300,      // 5 minutes for template list
  VARIABLE_MAPPINGS: 600,  // 10 minutes for variable mappings
  VARIABLE_LIST: 300,      // 5 minutes for variable list
} as const;

// Cache key builders
export const TEMPLATE_CACHE_KEYS = {
  templateList: (userId: string, filters?: { status?: string; category?: string }) => {
    const filterKey = filters 
      ? `:${filters.status || 'all'}:${filters.category || 'all'}`
      : ':all:all';
    return `templates:list:${userId}${filterKey}`;
  },
  variableMappings: (userId: string, templateName: string) => 
    `templates:mappings:${userId}:${templateName}`,
  variableList: (userId: string) => 
    `templates:variables:${userId}`,
} as const;

/**
 * TemplateCacheService
 * 
 * Handles caching for template-related data to improve performance.
 */
export class TemplateCacheService {
  // ============================================
  // Template List Caching
  // ============================================

  /**
   * Get cached template list
   */
  async getTemplateList<T>(
    userId: string, 
    filters?: { status?: string; category?: string }
  ): Promise<T | null> {
    try {
      const key = TEMPLATE_CACHE_KEYS.templateList(userId, filters);
      const cached = await getCache<T>(key);
      if (cached) {
        logger.debug('Template list cache hit', { userId, filters });
      }
      return cached;
    } catch (error) {
      logger.error('Error getting template list from cache:', error);
      return null;
    }
  }

  /**
   * Set cached template list
   */
  async setTemplateList<T>(
    userId: string, 
    data: T,
    filters?: { status?: string; category?: string }
  ): Promise<void> {
    try {
      const key = TEMPLATE_CACHE_KEYS.templateList(userId, filters);
      await setCache(key, data, TEMPLATE_CACHE_TTL.TEMPLATE_LIST);
      logger.debug('Template list cached', { userId, filters });
    } catch (error) {
      logger.error('Error setting template list cache:', error);
    }
  }

  /**
   * Invalidate template list cache for a user
   * Call this when templates are created, updated, or deleted
   */
  async invalidateTemplateList(userId: string): Promise<void> {
    try {
      // Delete all template list cache entries for this user
      await deleteCachePattern(`templates:list:${userId}:*`);
      logger.debug('Template list cache invalidated', { userId });
    } catch (error) {
      logger.error('Error invalidating template list cache:', error);
    }
  }

  // ============================================
  // Variable Mappings Caching
  // ============================================

  /**
   * Get cached variable mappings for a template
   */
  async getVariableMappings<T>(userId: string, templateName: string): Promise<T | null> {
    try {
      const key = TEMPLATE_CACHE_KEYS.variableMappings(userId, templateName);
      const cached = await getCache<T>(key);
      if (cached) {
        logger.debug('Variable mappings cache hit', { userId, templateName });
      }
      return cached;
    } catch (error) {
      logger.error('Error getting variable mappings from cache:', error);
      return null;
    }
  }

  /**
   * Set cached variable mappings for a template
   */
  async setVariableMappings<T>(
    userId: string, 
    templateName: string, 
    data: T
  ): Promise<void> {
    try {
      const key = TEMPLATE_CACHE_KEYS.variableMappings(userId, templateName);
      await setCache(key, data, TEMPLATE_CACHE_TTL.VARIABLE_MAPPINGS);
      logger.debug('Variable mappings cached', { userId, templateName });
    } catch (error) {
      logger.error('Error setting variable mappings cache:', error);
    }
  }

  /**
   * Invalidate variable mappings cache for a template
   * Call this when mappings are created, updated, or deleted
   */
  async invalidateVariableMappings(userId: string, templateName: string): Promise<void> {
    try {
      const key = TEMPLATE_CACHE_KEYS.variableMappings(userId, templateName);
      await deleteCache(key);
      logger.debug('Variable mappings cache invalidated', { userId, templateName });
    } catch (error) {
      logger.error('Error invalidating variable mappings cache:', error);
    }
  }

  /**
   * Invalidate all variable mappings cache for a user
   * Call this when a variable is deleted (affects all templates using it)
   */
  async invalidateAllVariableMappings(userId: string): Promise<void> {
    try {
      await deleteCachePattern(`templates:mappings:${userId}:*`);
      logger.debug('All variable mappings cache invalidated', { userId });
    } catch (error) {
      logger.error('Error invalidating all variable mappings cache:', error);
    }
  }

  // ============================================
  // Variable List Caching
  // ============================================

  /**
   * Get cached variable list for a user
   */
  async getVariableList<T>(userId: string): Promise<T | null> {
    try {
      const key = TEMPLATE_CACHE_KEYS.variableList(userId);
      const cached = await getCache<T>(key);
      if (cached) {
        logger.debug('Variable list cache hit', { userId });
      }
      return cached;
    } catch (error) {
      logger.error('Error getting variable list from cache:', error);
      return null;
    }
  }

  /**
   * Set cached variable list for a user
   */
  async setVariableList<T>(userId: string, data: T): Promise<void> {
    try {
      const key = TEMPLATE_CACHE_KEYS.variableList(userId);
      await setCache(key, data, TEMPLATE_CACHE_TTL.VARIABLE_LIST);
      logger.debug('Variable list cached', { userId });
    } catch (error) {
      logger.error('Error setting variable list cache:', error);
    }
  }

  /**
   * Invalidate variable list cache for a user
   * Call this when variables are created, updated, or deleted
   */
  async invalidateVariableList(userId: string): Promise<void> {
    try {
      const key = TEMPLATE_CACHE_KEYS.variableList(userId);
      await deleteCache(key);
      logger.debug('Variable list cache invalidated', { userId });
    } catch (error) {
      logger.error('Error invalidating variable list cache:', error);
    }
  }
}

// Export singleton instance
export const templateCacheService = new TemplateCacheService();
