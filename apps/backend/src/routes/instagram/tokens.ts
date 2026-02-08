/**
 * Instagram Token Management Routes
 * Handles token refresh and status checking
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { requireRole } from '../../middleware/auth.js'
import { prisma } from '../../utils/database.js'
import { auditLog } from '../../utils/auditLog.js'
import { instagramService, InstagramError, IGErrorCode } from '../../services/InstagramService.js'

const app = new Hono()

/**
 * POST /refresh - Manually trigger token refresh
 * Requirements: 5.1, 5.2
 */
app.post('/refresh', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    // Get user's Instagram account
    const igAccount = await prisma.instagramAccount.findFirst({
      where: { userId: c.user.id }
    })

    if (!igAccount) {
      return c.json({
        error: {
          code: 'NotFound',
          message: 'No Instagram account connected'
        }
      }, 404)
    }

    // Check if account is connected
    if (igAccount.connectionStatus !== 'connected') {
      return c.json({
        error: {
          code: 'BadRequest',
          message: 'Instagram account is not connected. Please reconnect first.'
        }
      }, 400)
    }

    // Check if token exists
    if (!igAccount.accessToken || !igAccount.accessTokenIV || !igAccount.accessTokenTag) {
      return c.json({
        error: {
          code: 'BadRequest',
          message: 'No access token found. Please reconnect Instagram.'
        }
      }, 400)
    }

    // Check if token can be refreshed (must be at least 24 hours old)
    const canRefresh = await instagramService.canRefreshToken(igAccount.id)
    if (!canRefresh) {
      return c.json({
        error: {
          code: 'BadRequest',
          message: 'Token cannot be refreshed yet. Tokens must be at least 24 hours old before refreshing.'
        }
      }, 400)
    }

    // Refresh the token
    let tokenResponse
    try {
      tokenResponse = await instagramService.refreshAccessToken(igAccount.id)
    } catch (error) {
      console.error('Token refresh error:', error)

      if (error instanceof InstagramError) {
        // Log the failure
        await prisma.iGConnectionLog.create({
          data: {
            instagramAccountId: igAccount.id,
            action: 'token_refresh_failed',
            errorMessage: error.message,
            details: {
              code: error.code,
              metaError: error.metaError,
              userId: c.user.id
            }
          }
        })

        return c.json(error.toJSON(), error.statusCode as any)
      }

      throw error
    }

    // Audit log
    await auditLog(
      'INSTAGRAM_TOKEN_REFRESHED',
      'InstagramAccount',
      igAccount.id,
      {
        igId: igAccount.igId,
        expiresAt: tokenResponse.expiresAt.toISOString(),
        refreshedBy: c.user.id
      },
      c.user.id
    )

    return c.json({
      success: true,
      data: {
        expiresAt: tokenResponse.expiresAt.toISOString(),
        message: 'Access token refreshed successfully'
      }
    })
  } catch (error) {
    console.error('Token refresh endpoint error:', error)

    return c.json({
      error: {
        code: 'InternalServerError',
        message: error instanceof Error ? error.message : 'Failed to refresh token'
      }
    }, 500)
  }
})


/**
 * GET /status - Check token expiration status
 * Requirements: 5.3
 */
app.get('/status', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    // Get user's Instagram account
    const igAccount = await prisma.instagramAccount.findFirst({
      where: { userId: c.user.id },
      select: {
        id: true,
        igId: true,
        username: true,
        connectionStatus: true,
        tokenExpiresAt: true,
        tokenLastRefresh: true,
        connectedAt: true,
        grantedPermissions: true
      }
    })

    if (!igAccount) {
      return c.json({
        error: {
          code: 'NotFound',
          message: 'No Instagram account connected'
        }
      }, 404)
    }

    const now = new Date()
    const tokenExpiresAt = new Date(igAccount.tokenExpiresAt)
    const tokenCreatedAt = igAccount.tokenLastRefresh || igAccount.connectedAt

    // Calculate time metrics
    const msUntilExpiry = tokenExpiresAt.getTime() - now.getTime()
    const daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24))
    const hoursUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60))

    const tokenAgeMs = now.getTime() - tokenCreatedAt.getTime()
    const tokenAgeHours = Math.floor(tokenAgeMs / (1000 * 60 * 60))
    const tokenAgeDays = Math.floor(tokenAgeMs / (1000 * 60 * 60 * 24))

    // Determine token status
    const isExpired = tokenExpiresAt < now
    const isExpiringSoon = daysUntilExpiry <= 7 && !isExpired
    const canRefresh = tokenAgeHours >= 24 && !isExpired

    let status: 'healthy' | 'expiring_soon' | 'expired' | 'requires_reauth'
    if (isExpired || igAccount.connectionStatus === 'requires_reauth') {
      status = 'requires_reauth'
    } else if (igAccount.connectionStatus === 'disconnected') {
      status = 'requires_reauth'
    } else if (isExpiringSoon) {
      status = 'expiring_soon'
    } else {
      status = 'healthy'
    }

    return c.json({
      success: true,
      data: {
        igId: igAccount.igId,
        username: igAccount.username,
        connectionStatus: igAccount.connectionStatus,
        tokenStatus: status,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
        tokenLastRefresh: igAccount.tokenLastRefresh?.toISOString() || null,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        hoursUntilExpiry: Math.max(0, hoursUntilExpiry),
        isExpired,
        isExpiringSoon,
        canRefresh,
        tokenAgeHours,
        tokenAgeDays,
        grantedPermissions: igAccount.grantedPermissions,
        recommendations: getTokenRecommendations(status, canRefresh, daysUntilExpiry)
      }
    })
  } catch (error) {
    console.error('Get token status error:', error)

    return c.json({
      error: {
        code: 'InternalServerError',
        message: error instanceof Error ? error.message : 'Failed to get token status'
      }
    }, 500)
  }
})

/**
 * Get recommendations based on token status
 */
function getTokenRecommendations(
  status: string,
  canRefresh: boolean,
  daysUntilExpiry: number
): string[] {
  const recommendations: string[] = []

  switch (status) {
    case 'requires_reauth':
      recommendations.push('Your Instagram connection has expired. Please reconnect your account.')
      break
    case 'expiring_soon':
      if (canRefresh) {
        recommendations.push(`Your token expires in ${daysUntilExpiry} days. Consider refreshing it now.`)
      } else {
        recommendations.push(`Your token expires in ${daysUntilExpiry} days. It will be automatically refreshed when eligible.`)
      }
      break
    case 'healthy':
      recommendations.push('Your Instagram connection is healthy.')
      if (daysUntilExpiry > 30) {
        recommendations.push('No action needed at this time.')
      }
      break
  }

  return recommendations
}

export default app
