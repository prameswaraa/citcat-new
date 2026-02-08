/**
 * Instagram Token Manager Module
 * 
 * Contains token lifecycle management functions including refresh,
 * expiration checking, and encryption/decryption operations.
 * Extracted from InstagramService.ts for better modularity.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { TokenEncryptionService } from '../../utils/tokenEncryption.js';
import { LongLivedTokenResponse } from './types.js';
import { IGErrorCode, InstagramError } from './errors.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Dependencies required for token management operations
 */
export interface TokenManagerDependencies {
  client: AxiosInstance;
  tokenEncryption: TokenEncryptionService;
  prisma: PrismaClient;
}

/**
 * Encrypted token components for storage
 */
export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

// ============================================================================
// Token Refresh Functions
// ============================================================================

/**
 * Refresh a long-lived access token
 * Tokens can only be refreshed if they are at least 24 hours old
 * 
 * @param deps - Token manager dependencies
 * @param igAccountId - Instagram Account ID in database
 * @returns New token response with updated expiration
 */
export async function refreshAccessToken(
  deps: TokenManagerDependencies,
  igAccountId: string
): Promise<LongLivedTokenResponse & { expiresAt: Date }> {
  try {
    // Get Instagram account with encrypted token
    const igAccount = await deps.prisma.instagramAccount.findUnique({
      where: { id: igAccountId },
    });

    if (!igAccount) {
      throw new InstagramError(
        IGErrorCode.INTERNAL_ERROR,
        `Instagram account not found: ${igAccountId}`,
        404,
        false
      );
    }

    // Decrypt current token
    const currentToken = deps.tokenEncryption.decrypt({
      ciphertext: igAccount.accessToken,
      iv: igAccount.accessTokenIV,
      authTag: igAccount.accessTokenTag,
      algorithm: 'aes-256-gcm',
    });

    // Refresh token via GET to graph.instagram.com/refresh_access_token
    const response = await deps.client.get('https://graph.instagram.com/refresh_access_token', {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: currentToken,
      },
    });

    const { access_token, token_type, expires_in } = response.data;
    const expiresIn = expires_in || 5184000; // Default 60 days

    // Encrypt new token
    const encryptedToken = deps.tokenEncryption.encrypt(access_token);

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Update database with new token
    await deps.prisma.instagramAccount.update({
      where: { id: igAccountId },
      data: {
        accessToken: encryptedToken.ciphertext,
        accessTokenIV: encryptedToken.iv,
        accessTokenTag: encryptedToken.authTag,
        tokenExpiresAt: expiresAt,
        tokenLastRefresh: new Date(),
      },
    });

    // Log token refresh
    await deps.prisma.iGConnectionLog.create({
      data: {
        instagramAccountId: igAccountId,
        action: 'token_refreshed',
        details: {
          expiresAt: expiresAt.toISOString(),
          expiresIn,
        },
      },
    });

    return {
      accessToken: access_token,
      tokenType: token_type || 'Bearer',
      expiresIn,
      expiresAt,
    };
  } catch (error) {
    // Log error
    if (igAccountId) {
      await deps.prisma.iGConnectionLog.create({
        data: {
          instagramAccountId: igAccountId,
          action: 'token_refresh_failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(() => {}); // Ignore logging errors
    }

    if (error instanceof InstagramError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const metaError = error.response?.data?.error;
      
      // Check if token is invalid/expired
      if (metaError?.code === 190) {
        throw new InstagramError(
          IGErrorCode.TOKEN_EXPIRED,
          'Access token has expired or been revoked',
          401,
          false,
          'Please reconnect your Instagram account',
          {
            code: metaError.code,
            message: metaError.message,
            type: metaError.type,
            subcode: metaError.error_subcode,
          }
        );
      }

      throw new InstagramError(
        IGErrorCode.TOKEN_REFRESH_FAILED,
        `Token refresh failed: ${metaError?.message || error.message}`,
        error.response?.status || 500,
        true,
        'Try refreshing again or reconnect your Instagram account',
        metaError ? {
          code: metaError.code,
          message: metaError.message,
          type: metaError.type,
          subcode: metaError.error_subcode,
        } : undefined
      );
    }

    throw new InstagramError(
      IGErrorCode.TOKEN_REFRESH_FAILED,
      `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      true
    );
  }
}

// ============================================================================
// Token Status Functions
// ============================================================================

/**
 * Check if token is expiring soon (within 7 days)
 * 
 * @param prisma - Prisma client instance
 * @param igAccountId - Instagram Account ID
 * @returns True if token expires within 7 days
 */
export async function isTokenExpiringSoon(
  prisma: PrismaClient,
  igAccountId: string
): Promise<boolean> {
  const igAccount = await prisma.instagramAccount.findUnique({
    where: { id: igAccountId },
    select: { tokenExpiresAt: true },
  });

  if (!igAccount?.tokenExpiresAt) {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(igAccount.tokenExpiresAt);
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return daysUntilExpiry <= 7;
}

/**
 * Check if token is at least 24 hours old (required for refresh)
 * 
 * @param prisma - Prisma client instance
 * @param igAccountId - Instagram Account ID
 * @returns True if token can be refreshed
 */
export async function canRefreshToken(
  prisma: PrismaClient,
  igAccountId: string
): Promise<boolean> {
  const igAccount = await prisma.instagramAccount.findUnique({
    where: { id: igAccountId },
    select: { tokenLastRefresh: true, connectedAt: true },
  });

  if (!igAccount) {
    return false;
  }

  const tokenCreatedAt = igAccount.tokenLastRefresh || igAccount.connectedAt;
  const now = new Date();
  const tokenAge = now.getTime() - tokenCreatedAt.getTime();
  const hoursOld = tokenAge / (1000 * 60 * 60);

  return hoursOld >= 24;
}

/**
 * Get all Instagram accounts with tokens expiring soon (within 7 days)
 * Only returns accounts that are connected and have tokens at least 24 hours old
 * 
 * @param prisma - Prisma client instance
 * @returns Array of Instagram Account IDs
 */
export async function getAccountsWithExpiringTokens(
  prisma: PrismaClient
): Promise<string[]> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const accounts = await prisma.instagramAccount.findMany({
    where: {
      tokenExpiresAt: {
        lte: sevenDaysFromNow,
      },
      connectionStatus: 'connected',
      OR: [
        {
          tokenLastRefresh: {
            lte: twentyFourHoursAgo,
          },
        },
        {
          tokenLastRefresh: null,
          connectedAt: {
            lte: twentyFourHoursAgo,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return accounts.map(a => a.id);
}

// ============================================================================
// Token Encryption Functions
// ============================================================================

/**
 * Encrypt an access token for storage
 * 
 * @param tokenEncryption - Token encryption service instance
 * @param token - Plain text access token
 * @returns Encrypted token components
 */
export function encryptToken(
  tokenEncryption: TokenEncryptionService,
  token: string
): EncryptedToken {
  const encrypted = tokenEncryption.encrypt(token);
  return {
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
  };
}

/**
 * Decrypt an access token from storage by account ID
 * 
 * @param deps - Dependencies with tokenEncryption and prisma
 * @param igAccountId - Instagram Account ID
 * @returns Decrypted access token
 */
export async function getDecryptedToken(
  deps: { tokenEncryption: TokenEncryptionService; prisma: PrismaClient },
  igAccountId: string
): Promise<string> {
  const igAccount = await deps.prisma.instagramAccount.findUnique({
    where: { id: igAccountId },
    select: {
      accessToken: true,
      accessTokenIV: true,
      accessTokenTag: true,
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

  return deps.tokenEncryption.decrypt({
    ciphertext: igAccount.accessToken,
    iv: igAccount.accessTokenIV,
    authTag: igAccount.accessTokenTag,
    algorithm: 'aes-256-gcm',
  });
}
