import type { Context, Next } from 'hono';
import { apiKeyService } from '../services/api-key-service.js';
import { prisma } from '../utils/database.js';
import { cacheRedis } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

/**
 * Extended context for API key authenticated requests
 */
declare module 'hono' {
  interface ContextVariableMap {
    apiKeyUserId: string;
    apiKeyId: string;
  }
}

// IP blocking configuration
const IP_BLOCK_THRESHOLD = 10; // Block after 10 consecutive failures
const IP_BLOCK_WINDOW_SECONDS = 300; // 5 minutes window for counting failures
const IP_BLOCK_DURATION_SECONDS = 900; // 15 minutes block duration

// Cache key prefixes
const FAILED_AUTH_KEY_PREFIX = 'auth:failed:';
const IP_BLOCK_KEY_PREFIX = 'auth:blocked:';

/**
 * Get client IP address from request
 */
function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check if an IP is currently blocked
 */
async function isIpBlocked(ip: string): Promise<boolean> {
  try {
    const blocked = await cacheRedis.get(`${IP_BLOCK_KEY_PREFIX}${ip}`);
    return blocked === '1';
  } catch (error) {
    logger.error('Error checking IP block status:', error);
    return false; // Fail open to avoid blocking legitimate requests
  }
}

/**
 * Record a failed authentication attempt and block IP if threshold reached
 */
async function recordFailedAuth(ip: string): Promise<void> {
  try {
    const key = `${FAILED_AUTH_KEY_PREFIX}${ip}`;
    
    // Increment failure count
    const count = await cacheRedis.incr(key);
    
    // Set expiry on first failure
    if (count === 1) {
      await cacheRedis.expire(key, IP_BLOCK_WINDOW_SECONDS);
    }
    
    // Block IP if threshold reached
    if (count >= IP_BLOCK_THRESHOLD) {
      await cacheRedis.setex(`${IP_BLOCK_KEY_PREFIX}${ip}`, IP_BLOCK_DURATION_SECONDS, '1');
      // Reset failure counter
      await cacheRedis.del(key);
      
      logger.warn(`IP ${ip} blocked after ${IP_BLOCK_THRESHOLD} failed auth attempts`);
    }
  } catch (error) {
    logger.error('Error recording failed auth:', error);
  }
}

/**
 * Clear failed auth attempts for an IP (on successful auth)
 */
async function clearFailedAuth(ip: string): Promise<void> {
  try {
    await cacheRedis.del(`${FAILED_AUTH_KEY_PREFIX}${ip}`);
  } catch (error) {
    logger.error('Error clearing failed auth:', error);
  }
}

/**
 * Log API request to database
 */
async function logApiRequest(
  apiKeyId: string | null,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  latencyMs: number,
  ipAddress: string,
  userAgent: string | null
): Promise<void> {
  try {
    await prisma.apiRequestLog.create({
      data: {
        apiKeyId,
        userId,
        endpoint,
        method,
        statusCode,
        latencyMs,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error('Error logging API request:', error);
  }
}


/**
 * API Key Authentication Middleware for Public API routes
 * 
 * Extracts Bearer token from Authorization header, validates the API key,
 * and sets userId and apiKeyId in context. Implements IP blocking after
 * consecutive failed authentication attempts.
 * 
 * Requirements: 7.1, 7.2, 7.4, 7.5
 */
export async function apiKeyAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  const startTime = Date.now();
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent') || null;
  const endpoint = c.req.path;
  const method = c.req.method;

  // Check if IP is blocked
  if (await isIpBlocked(ip)) {
    logger.warn(`Blocked IP ${ip} attempted to access API`);
    
    return c.json(
      {
        error: {
          code: 'TooManyRequests',
          message: 'Too many failed authentication attempts. Please try again later.',
        },
      },
      429,
      {
        'Retry-After': IP_BLOCK_DURATION_SECONDS.toString(),
      }
    );
  }

  // Extract Bearer token from Authorization header
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    await recordFailedAuth(ip);
    await logApiRequest(null, 'unknown', endpoint, method, 401, Date.now() - startTime, ip, userAgent);
    
    return c.json(
      {
        error: {
          code: 'Unauthorized',
          message: 'API key required. Provide Bearer token in Authorization header.',
        },
      },
      401
    );
  }

  if (!authHeader.startsWith('Bearer ')) {
    await recordFailedAuth(ip);
    await logApiRequest(null, 'unknown', endpoint, method, 401, Date.now() - startTime, ip, userAgent);
    
    return c.json(
      {
        error: {
          code: 'Unauthorized',
          message: 'Invalid authorization format. Use: Bearer <api_key>',
        },
      },
      401
    );
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!apiKey) {
    await recordFailedAuth(ip);
    await logApiRequest(null, 'unknown', endpoint, method, 401, Date.now() - startTime, ip, userAgent);
    
    return c.json(
      {
        error: {
          code: 'Unauthorized',
          message: 'API key is empty.',
        },
      },
      401
    );
  }

  // Validate API key
  const validationResult = await apiKeyService.validateApiKey(apiKey);

  if (!validationResult) {
    await recordFailedAuth(ip);
    await logApiRequest(null, 'unknown', endpoint, method, 401, Date.now() - startTime, ip, userAgent);
    
    logger.warn(`Invalid API key attempt from IP ${ip}, key prefix: ${apiKey.substring(0, 16)}`);
    
    return c.json(
      {
        error: {
          code: 'Unauthorized',
          message: 'Invalid or expired API key.',
        },
      },
      401
    );
  }

  // Clear failed auth attempts on successful authentication
  await clearFailedAuth(ip);

  // Set user context
  c.set('apiKeyUserId', validationResult.userId);
  c.set('apiKeyId', validationResult.apiKeyId);

  // Update last used timestamp (async, don't wait)
  apiKeyService.updateLastUsed(validationResult.apiKeyId).catch((err) => {
    logger.error('Failed to update API key last used:', err);
  });

  // Continue to next middleware/handler
  await next();

  // Log the request after response (with actual status code)
  const latencyMs = Date.now() - startTime;
  logApiRequest(
    validationResult.apiKeyId,
    validationResult.userId,
    endpoint,
    method,
    c.res.status,
    latencyMs,
    ip,
    userAgent
  ).catch((err) => {
    logger.error('Failed to log API request:', err);
  });
}

/**
 * Helper to get userId from API key authenticated context
 */
export function getApiKeyUserId(c: Context): string {
  const userId = c.get('apiKeyUserId');
  if (!userId) {
    throw new Error('API key authentication required');
  }
  return userId;
}

/**
 * Helper to get apiKeyId from API key authenticated context
 */
export function getApiKeyId(c: Context): string {
  const apiKeyId = c.get('apiKeyId');
  if (!apiKeyId) {
    throw new Error('API key authentication required');
  }
  return apiKeyId;
}
