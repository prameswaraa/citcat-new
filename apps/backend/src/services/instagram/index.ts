/**
 * Instagram Service - Main Module
 * 
 * This is the main entry point for Instagram service functionality.
 * Uses composition pattern to delegate to specialized modules.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { TokenEncryptionService } from '../../utils/tokenEncryption.js';
import { prisma } from '../../utils/database.js';
import { settingsCache, CACHE_KEYS, CACHE_TTL } from '../settings-cache.js';
import { logger } from '../../utils/logger.js';
import type { InstagramSettings } from '../../types/admin-settings.js';

// Re-export all types
export * from './types.js';

// Re-export all errors
export * from './errors.js';

// Import helper modules
import * as oauth from './oauth.js';
import * as tokenManager from './token-manager.js';
import * as messaging from './messaging.js';
import * as webhook from './webhook.js';
import * as profile from './profile.js';

// Import types for method signatures
import type {
  AuthUrlResponse,
  TokenResponse,
  LongLivedTokenResponse,
  IGAccountProfile,
  IGUserProfile,
  SendMessageResponse,
  SenderActionResponse,
  SenderAction,
  MediaType,
} from './types.js';
import { IGErrorCode, InstagramError } from './errors.js';

// ============================================================================
// InstagramService Class
// ============================================================================

/**
 * InstagramService
 * 
 * Handles Instagram Business Account operations including:
 * - OAuth flow
 * - Messaging
 * - Webhook handling
 * 
 * Settings Priority:
 * 1. Database settings (cached with TTL)
 * 2. Environment variables (.env fallback)
 * 
 * Requirements: 6.3, 6.4 - Check database first, fallback to .env, cache with TTL
 */
export class InstagramService {
  private client: AxiosInstance;
  private tokenEncryption: TokenEncryptionService;
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private webhookVerifyToken: string;
  private settingsInitialized: boolean = false;
  private lastConfigHash: string = '';

  constructor() {
    // Initialize with env values, will be updated from DB on first use
    this.appId = process.env.INSTAGRAM_APP_ID || '';
    this.appSecret = process.env.INSTAGRAM_APP_SECRET || '';
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || '';
    this.webhookVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || '';

    console.log('[InstagramService] Config:', {
      appId: this.appId ? `${this.appId.substring(0, 5)}...` : 'NOT SET',
      appSecret: this.appSecret ? 'SET' : 'NOT SET',
      redirectUri: this.redirectUri || 'NOT SET'
    });

    // Create HTTPS agent that forces IPv4 (IPv6 often fails on some servers)
    const httpsAgent = new https.Agent({
      family: 4, // Force IPv4
      rejectUnauthorized: true,
    });

    this.client = axios.create({
      timeout: 60000, // Increased to 60 seconds for slow networks
      headers: {
        'Content-Type': 'application/json',
      },
      httpsAgent,
    });

    this.tokenEncryption = new TokenEncryptionService();
  }

  // ==========================================================================
  // Settings Management Methods
  // ==========================================================================

  /**
   * Generate a hash of the config for comparison
   */
  private hashConfig(): string {
    return `${this.appId}:${this.appSecret}:${this.redirectUri}`;
  }

  /**
   * Refresh Instagram settings from database with caching
   * Requirements: 6.3, 6.4
   */
  private async refreshSettingsFromDb(): Promise<void> {
    try {
      // Check cache first
      const cachedSettings = settingsCache.get<InstagramSettings>(CACHE_KEYS.instagram());
      
      if (cachedSettings) {
        this.updateFromSettings(cachedSettings);
        return;
      }

      // Fetch from database using dynamic import to avoid circular dependency
      const { adminSettingsService } = await import('../admin/settings-service.js');
      const response = await adminSettingsService.getSettings<InstagramSettings>('instagram', false);
      
      // Cache the settings
      settingsCache.set(CACHE_KEYS.instagram(), response.data, CACHE_TTL.settings);
      
      // Update service config
      this.updateFromSettings(response.data);
      logger.info('Instagram settings refreshed from database', { source: response.source });
    } catch (error) {
      logger.warn('Failed to refresh Instagram settings from database, using current config', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with existing config (env fallback)
    }
  }

  /**
   * Update service configuration from settings
   */
  private updateFromSettings(settings: InstagramSettings): void {
    const newAppId = settings.appId || this.appId;
    const newAppSecret = settings.appSecret || this.appSecret;
    const newRedirectUri = settings.redirectUri || this.redirectUri;
    const newWebhookVerifyToken = settings.webhookVerifyToken || this.webhookVerifyToken;

    // Only update if values changed
    const newHash = `${newAppId}:${newAppSecret}:${newRedirectUri}`;
    if (newHash !== this.lastConfigHash) {
      this.appId = newAppId;
      this.appSecret = newAppSecret;
      this.redirectUri = newRedirectUri;
      this.webhookVerifyToken = newWebhookVerifyToken;
      this.lastConfigHash = newHash;
      this.settingsInitialized = true;
    }
  }

  /**
   * Ensure settings are loaded before operations
   */
  private async ensureSettings(): Promise<void> {
    await this.refreshSettingsFromDb();
    
    if (!this.appId || !this.appSecret) {
      throw new Error('INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are required');
    }
  }

  /**
   * Invalidate settings cache (call when settings are updated)
   */
  invalidateCache(): void {
    settingsCache.invalidate(CACHE_KEYS.instagram());
    this.settingsInitialized = false;
    logger.info('Instagram settings cache invalidated');
  }

  /**
   * Get current app ID (for external use)
   */
  getAppId(): string {
    return this.appId;
  }

  /**
   * Get current app secret (for external use)
   */
  getAppSecret(): string {
    return this.appSecret;
  }

  // ==========================================================================
  // Helper Methods for Dependencies
  // ==========================================================================

  /**
   * Get OAuth dependencies for oauth module functions
   */
  private getOAuthDeps(): oauth.OAuthDependencies {
    return {
      client: this.client,
      tokenEncryption: this.tokenEncryption,
      appId: this.appId,
      appSecret: this.appSecret,
      redirectUri: this.redirectUri,
    };
  }

  /**
   * Get token manager dependencies
   */
  private getTokenManagerDeps(): tokenManager.TokenManagerDependencies {
    return {
      client: this.client,
      tokenEncryption: this.tokenEncryption,
      prisma,
    };
  }

  /**
   * Get messaging dependencies
   */
  private getMessagingDeps(): messaging.MessagingDependencies {
    return {
      client: this.client,
      getDecryptedTokenByIgId: this.getDecryptedTokenByIgId.bind(this),
    };
  }

  /**
   * Get decrypted token by Instagram Professional Account ID (igId)
   * Used internally by messaging module
   */
  private async getDecryptedTokenByIgId(igId: string): Promise<string> {
    const igAccount = await prisma.instagramAccount.findUnique({
      where: { igId },
      select: {
        accessToken: true,
        accessTokenIV: true,
        accessTokenTag: true,
        connectionStatus: true,
      },
    });

    if (!igAccount) {
      throw new InstagramError(
        IGErrorCode.INTERNAL_ERROR,
        'Instagram account not found',
        404,
        false
      );
    }

    if (igAccount.connectionStatus !== 'connected') {
      throw new InstagramError(
        IGErrorCode.TOKEN_INVALID,
        'Instagram account is not connected',
        401,
        false,
        'Please reconnect your Instagram account'
      );
    }

    return this.tokenEncryption.decrypt({
      ciphertext: igAccount.accessToken,
      iv: igAccount.accessTokenIV,
      authTag: igAccount.accessTokenTag,
      algorithm: 'aes-256-gcm',
    });
  }

  // ==========================================================================
  // OAuth Methods - Delegates to oauth module
  // ==========================================================================

  /**
   * Generate Instagram OAuth authorization URL
   */
  async generateAuthUrl(userId: string, redirectUri?: string): Promise<AuthUrlResponse> {
    await this.ensureSettings();
    return oauth.generateAuthUrl(this.getOAuthDeps(), userId, redirectUri);
  }

  /**
   * Exchange authorization code for short-lived access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<TokenResponse & { userId: string }> {
    await this.ensureSettings();
    return oauth.exchangeCodeForToken(this.getOAuthDeps(), code, state);
  }

  /**
   * Exchange short-lived token for long-lived token (60 days validity)
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
    await this.ensureSettings();
    return oauth.exchangeForLongLivedToken(this.getOAuthDeps(), shortLivedToken);
  }

  /**
   * Decrypt and validate state parameter from OAuth callback
   */
  decryptState(state: string): { userId: string; nonce: string; timestamp: number } {
    return oauth.decryptState(this.tokenEncryption, state);
  }

  // ==========================================================================
  // Token Management Methods - Delegates to token-manager module
  // ==========================================================================

  /**
   * Refresh a long-lived access token
   */
  async refreshAccessToken(igAccountId: string): Promise<LongLivedTokenResponse & { expiresAt: Date }> {
    return tokenManager.refreshAccessToken(this.getTokenManagerDeps(), igAccountId);
  }

  /**
   * Check if token is expiring soon (within 7 days)
   */
  async isTokenExpiringSoon(igAccountId: string): Promise<boolean> {
    return tokenManager.isTokenExpiringSoon(prisma, igAccountId);
  }

  /**
   * Check if token is at least 24 hours old (required for refresh)
   */
  async canRefreshToken(igAccountId: string): Promise<boolean> {
    return tokenManager.canRefreshToken(prisma, igAccountId);
  }

  /**
   * Get all Instagram accounts with tokens expiring soon
   */
  async getAccountsWithExpiringTokens(): Promise<string[]> {
    return tokenManager.getAccountsWithExpiringTokens(prisma);
  }

  /**
   * Encrypt an access token for storage
   */
  encryptToken(token: string): { ciphertext: string; iv: string; authTag: string } {
    return tokenManager.encryptToken(this.tokenEncryption, token);
  }

  /**
   * Decrypt an access token from storage
   */
  async getDecryptedToken(igAccountId: string): Promise<string> {
    return tokenManager.getDecryptedToken(
      { tokenEncryption: this.tokenEncryption, prisma },
      igAccountId
    );
  }

  // ==========================================================================
  // Profile Methods - Delegates to profile module
  // ==========================================================================

  /**
   * Get the connected Instagram account profile
   */
  async getAccountProfile(accessToken: string, igUserId: string): Promise<IGAccountProfile> {
    return profile.getAccountProfile(this.client, accessToken, igUserId);
  }

  /**
   * Get an Instagram user's profile (message sender)
   */
  async getUserProfile(accessToken: string, igsid: string): Promise<IGUserProfile | null> {
    return profile.getUserProfile(this.client, accessToken, igsid);
  }

  // ==========================================================================
  // Messaging Methods - Delegates to messaging module
  // ==========================================================================

  /**
   * Send a text message to an Instagram user
   */
  async sendTextMessage(igId: string, recipientId: string, text: string): Promise<SendMessageResponse> {
    return messaging.sendTextMessage(this.getMessagingDeps(), igId, recipientId, text);
  }

  /**
   * Send a media message (image, video, or audio)
   */
  async sendMediaMessage(
    igId: string,
    recipientId: string,
    mediaType: MediaType,
    mediaUrl: string
  ): Promise<SendMessageResponse> {
    return messaging.sendMediaMessage(this.getMessagingDeps(), igId, recipientId, mediaType, mediaUrl);
  }

  /**
   * Send a heart sticker (like_heart)
   */
  async sendHeartSticker(igId: string, recipientId: string): Promise<SendMessageResponse> {
    return messaging.sendHeartSticker(this.getMessagingDeps(), igId, recipientId);
  }

  /**
   * React to a message with 'love' reaction
   */
  async sendReaction(igId: string, recipientId: string, messageId: string): Promise<SendMessageResponse> {
    return messaging.sendReaction(this.getMessagingDeps(), igId, recipientId, messageId);
  }

  /**
   * Validate media size before upload
   */
  validateMediaSize(mediaType: MediaType, sizeInBytes: number): void {
    messaging.validateMediaSize(mediaType, sizeInBytes);
  }

  /**
   * Send a sender action to an Instagram user
   */
  async sendSenderAction(igId: string, recipientId: string, action: SenderAction): Promise<SenderActionResponse> {
    return messaging.sendSenderAction(this.getMessagingDeps(), igId, recipientId, action);
  }

  /**
   * Send typing indicator (typing_on)
   */
  async sendTypingOn(igId: string, recipientId: string): Promise<SenderActionResponse> {
    return messaging.sendTypingOn(this.getMessagingDeps(), igId, recipientId);
  }

  /**
   * Send typing off indicator
   */
  async sendTypingOff(igId: string, recipientId: string): Promise<SenderActionResponse> {
    return messaging.sendTypingOff(this.getMessagingDeps(), igId, recipientId);
  }

  /**
   * Send mark_seen indicator
   */
  async sendMarkSeen(igId: string, recipientId: string): Promise<SenderActionResponse> {
    return messaging.sendMarkSeen(this.getMessagingDeps(), igId, recipientId);
  }

  // ==========================================================================
  // Webhook Methods - Delegates to webhook module
  // ==========================================================================

  /**
   * Verify webhook signature using HMAC-SHA256 (sync version)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Get app secret from cache or env
    const cachedSettings = settingsCache.get<InstagramSettings>(CACHE_KEYS.instagram());
    const appSecret = cachedSettings?.appSecret && !cachedSettings.appSecret.includes('****')
      ? cachedSettings.appSecret
      : this.appSecret;

    return webhook.verifyWebhookSignature(appSecret, payload, signature);
  }

  /**
   * Verify webhook signature (async version with database refresh)
   */
  async verifyWebhookSignatureAsync(payload: string, signature: string): Promise<boolean> {
    await this.refreshSettingsFromDb();
    return this.verifyWebhookSignature(payload, signature);
  }

  /**
   * Verify webhook challenge for initial webhook setup (sync version)
   */
  verifyWebhookChallenge(mode: string, token: string, challenge: string): string | null {
    // Check cache first for database settings
    const cachedSettings = settingsCache.get<InstagramSettings>(CACHE_KEYS.instagram());
    const verifyToken = cachedSettings?.webhookVerifyToken && !cachedSettings.webhookVerifyToken.includes('****')
      ? cachedSettings.webhookVerifyToken
      : process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

    return webhook.verifyWebhookChallenge(verifyToken || '', mode, token, challenge);
  }

  /**
   * Verify webhook challenge (async version with database refresh)
   */
  async verifyWebhookChallengeAsync(mode: string, token: string, challenge: string): Promise<string | null> {
    await this.refreshSettingsFromDb();
    return this.verifyWebhookChallenge(mode, token, challenge);
  }

  /**
   * Enable webhook subscriptions for an Instagram professional account
   */
  async enableWebhookSubscriptions(
    accessToken: string,
    igId: string,
    fields: string[] = ['messages']
  ): Promise<boolean> {
    return webhook.enableWebhookSubscriptions(this.client, accessToken, igId, fields);
  }

  /**
   * Get current webhook subscriptions for an Instagram account
   */
  async getWebhookSubscriptions(accessToken: string, igId: string): Promise<string[] | null> {
    return webhook.getWebhookSubscriptions(this.client, accessToken, igId);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const instagramService = new InstagramService();
