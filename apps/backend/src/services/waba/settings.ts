// ============================================================================
// WABA Settings Management
// ============================================================================

import { settingsCache, CACHE_KEYS, CACHE_TTL } from '../settings-cache.js';
import { logger } from '../../utils/logger.js';
import { WABAServiceError, WABAErrorCode } from './errors.js';
import type { WABAConfig } from './types.js';
import type { WhatsAppSettings } from '../../types/admin-settings.js';

/**
 * WABASettings
 * 
 * Centralized settings management for WABA service.
 * Implements database-first with environment variable fallback.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export class WABASettings {
  private config: WABAConfig;
  private initialized: boolean = false;
  private lastConfigHash: string = '';

  constructor() {
    // Initialize with env defaults
    this.config = {
      apiVersion: 'v23.0',
      appId: process.env.META_APP_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      configId: process.env.META_CONFIG_ID || '',
      redirectUri: process.env.OAUTH_REDIRECT_URI || '',
      webhookBaseUrl: process.env.WEBHOOK_BASE_URL || '',
    };
  }

  /**
   * Update service configuration from WhatsApp settings
   */
  private updateFromSettings(settings: WhatsAppSettings): void {
    const newAppId = settings.appId || this.config.appId;
    const newAppSecret = settings.appSecret || this.config.appSecret;
    const newConfigId = settings.configId || this.config.configId;
    const newRedirectUri = settings.oauthRedirectUri || this.config.redirectUri;
    const newWebhookBaseUrl = settings.webhookBaseUrl || this.config.webhookBaseUrl;

    // Only update if values changed
    const newHash = `${newAppId}:${newAppSecret}:${newConfigId}:${newRedirectUri}`;
    if (newHash !== this.lastConfigHash) {
      this.config = {
        ...this.config,
        appId: newAppId,
        appSecret: newAppSecret,
        configId: newConfigId,
        redirectUri: newRedirectUri,
        webhookBaseUrl: newWebhookBaseUrl,
      };
      this.lastConfigHash = newHash;
      this.initialized = true;
    }
  }

  /**
   * Ensure settings are loaded before operations
   * Database-first with env fallback
   * 
   * Requirements: 8.1, 8.2
   */
  async ensureLoaded(): Promise<WABAConfig> {
    await this.refresh();

    if (!this.config.appId || !this.config.appSecret) {
      throw new WABAServiceError(
        WABAErrorCode.SETTINGS_NOT_CONFIGURED,
        'META_APP_ID and META_APP_SECRET are required'
      );
    }

    return this.config;
  }

  /**
   * Refresh settings from database with caching
   * 
   * Requirements: 8.2, 8.3
   */
  async refresh(): Promise<void> {
    try {
      // Check cache first
      const cachedSettings = settingsCache.get<WhatsAppSettings>(CACHE_KEYS.whatsapp());

      if (cachedSettings) {
        this.updateFromSettings(cachedSettings);
        return;
      }

      // Fetch from database using dynamic import to avoid circular dependency
      const { adminSettingsService } = await import('../admin/settings-service.js');
      const response = await adminSettingsService.getSettings<WhatsAppSettings>('whatsapp', false);

      // Cache the settings
      settingsCache.set(CACHE_KEYS.whatsapp(), response.data, CACHE_TTL.settings);

      // Update service config
      this.updateFromSettings(response.data);
      logger.info('WhatsApp settings refreshed from database', { source: response.source });
    } catch (error) {
      logger.warn('Failed to refresh WhatsApp settings from database, using current config', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with existing config (env fallback)
    }
  }

  /**
   * Invalidate settings cache
   * Call when settings are updated externally
   * 
   * Requirements: 8.4
   */
  invalidateCache(): void {
    settingsCache.invalidate(CACHE_KEYS.whatsapp());
    this.initialized = false;
    logger.info('WhatsApp settings cache invalidated');
  }

  /**
   * Get current configuration
   */
  getConfig(): WABAConfig {
    return { ...this.config };
  }

  /**
   * Get current app ID
   */
  getAppId(): string {
    return this.config.appId;
  }

  /**
   * Get current app secret
   */
  getAppSecret(): string {
    return this.config.appSecret;
  }

  /**
   * Get current config ID
   */
  getConfigId(): string {
    return this.config.configId;
  }

  /**
   * Get current redirect URI
   */
  getRedirectUri(): string {
    return this.config.redirectUri;
  }

  /**
   * Get current webhook base URL
   */
  getWebhookBaseUrl(): string {
    return this.config.webhookBaseUrl;
  }

  /**
   * Get API version
   */
  getApiVersion(): string {
    return this.config.apiVersion;
  }

  /**
   * Check if settings are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const wabaSettings = new WABASettings();
