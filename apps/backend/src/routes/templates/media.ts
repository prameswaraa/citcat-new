/**
 * Template Media Routes
 * 
 * API endpoints for media upload for template variables:
 * - POST /media/upload - Upload media to WhatsApp API for template headers
 * - GET /media/:mediaId - Get media info
 * 
 * Base Path: /api/v1/templates/media
 * 
 * Requirements: 3.3, 7.1
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { templateMediaService, MEDIA_CONSTRAINTS, type MediaType } from '../../services/template-media-service.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'
import { resolveContext } from '../../middleware/resolveContext.js'
import { logger } from '../../utils/logger.js'

const app = new Hono()

// Apply context resolution middleware to all routes
// This ensures agents can upload media on behalf of their business owner
app.use('*', resolveContext)

/**
 * POST /api/v1/templates/media/upload
 * Upload media to WhatsApp API for use in template headers
 * 
 * Body (multipart/form-data):
 * - file: File (required) - The media file to upload
 * - type: string (required) - Media type: IMAGE, VIDEO, or DOCUMENT
 * 
 * Returns: MediaUploadResult with media_id
 * 
 * Requirements: 3.3
 */
app.post('/upload', async (c: Context) => {
  try {
    const userId = getEffectiveUserId(c)
    
    if (!userId) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    // Parse multipart form data
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const typeParam = formData.get('type') as string | null

    // Validate file presence
    if (!file) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'No file provided. Please upload a file.'
        }
      }, 400)
    }

    // Validate type parameter
    if (!typeParam) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'Media type is required. Allowed values: IMAGE, VIDEO, DOCUMENT'
        }
      }, 400)
    }

    const type = typeParam.toUpperCase() as MediaType
    
    if (!MEDIA_CONSTRAINTS[type]) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: `Invalid media type: ${typeParam}. Allowed values: IMAGE, VIDEO, DOCUMENT`
        }
      }, 400)
    }

    // Validate file before upload
    const validation = templateMediaService.validateMediaFile(
      type,
      file.type,
      file.size
    )

    if (!validation.valid) {
      return c.json({
        error: {
          code: validation.errorCode || 'ValidationError',
          message: validation.error,
          hints: {
            sizeLimit: templateMediaService.getSizeLimitMessage(type),
            allowedFormats: templateMediaService.getAllowedFormatsMessage(type)
          }
        }
      }, 400)
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to WhatsApp
    const result = await templateMediaService.uploadMedia(
      userId,
      buffer,
      type,
      file.type,
      file.name
    )

    logger.info('Template media uploaded successfully', {
      userId,
      mediaId: result.mediaId,
      type,
      filename: file.name
    })

    return c.json({
      success: true,
      data: {
        mediaId: result.mediaId,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        filename: result.filename,
        expiresAt: result.expiresAt?.toISOString()
      }
    })
  } catch (error: any) {
    logger.error('Template media upload error:', {
      error: error.message,
      stack: error.stack
    })

    // Handle specific error types
    if (error.message.includes('not configured') || error.message.includes('disconnected')) {
      return c.json({
        error: {
          code: 'ConfigurationError',
          message: error.message
        }
      }, 400)
    }

    if (error.message.includes('WhatsApp upload failed')) {
      return c.json({
        error: {
          code: 'UploadError',
          message: error.message
        }
      }, 400)
    }

    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to upload media. Please try again.'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/templates/media/:mediaId
 * Get media info from WhatsApp
 * 
 * Params:
 * - mediaId: string (required) - WhatsApp media ID
 * 
 * Returns: MediaInfo with URL (valid for 5 minutes)
 */
app.get('/:mediaId', async (c: Context) => {
  try {
    const userId = getEffectiveUserId(c)
    
    if (!userId) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    const mediaId = c.req.param('mediaId')

    if (!mediaId) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'Media ID is required'
        }
      }, 400)
    }

    const mediaInfo = await templateMediaService.getMediaInfo(userId, mediaId)

    return c.json({
      success: true,
      data: mediaInfo
    })
  } catch (error: any) {
    logger.error('Get media info error:', {
      error: error.message
    })

    if (error.message.includes('not found') || error.message.includes('expired')) {
      return c.json({
        error: {
          code: 'NotFound',
          message: 'Media not found or has expired. WhatsApp media expires after 30 days.'
        }
      }, 404)
    }

    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to get media info'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/templates/media/constraints
 * Get media upload constraints (size limits, allowed formats)
 * 
 * Returns: Media constraints for each type
 */
app.get('/constraints', async (c: Context) => {
  const constraints = Object.entries(MEDIA_CONSTRAINTS).map(([type, config]) => ({
    type,
    maxSizeBytes: config.maxSize,
    maxSizeMB: config.maxSize / (1024 * 1024),
    allowedMimeTypes: config.allowedMimeTypes,
    allowedExtensions: config.allowedExtensions
  }))

  return c.json({
    success: true,
    data: constraints
  })
})

export default app
