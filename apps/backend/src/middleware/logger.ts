import type { Context } from 'hono'
import { logger } from '../utils/logger.js'

export async function logMiddleware(c: Context, next: () => Promise<void>) {
  const start = Date.now()
  await next()
  const end = Date.now()
  
  logger.info(`${c.req.method} ${c.req.path} - ${c.res.status} - ${end - start}ms`)
}
