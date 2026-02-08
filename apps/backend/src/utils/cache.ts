import { Redis } from 'ioredis'

// Reuse Redis connection configuration from queue.ts
export const cacheRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    family: 4,
    // Add key prefix to separate cache from queue data
    keyPrefix: 'cache:',
})

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
    USER: 300,           // 5 minutes for user data
    DASHBOARD_STATS: 60, // 1 minute for dashboard stats
    SHORT: 30,           // 30 seconds for frequently changing data
    MEDIUM: 300,         // 5 minutes
    LONG: 3600,          // 1 hour
} as const

// Cache key builders
export const CACHE_KEYS = {
    user: (userId: string) => `user:${userId}`,
    dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
    subscription: (userId: string) => `subscription:${userId}`,
} as const

/**
 * Get cached data
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const data = await cacheRedis.get(key)
        if (!data) return null
        return JSON.parse(data) as T
    } catch (error) {
        console.error('Cache get error:', error)
        return null
    }
}

/**
 * Set cached data with TTL
 */
export async function setCache(key: string, value: any, ttl: number): Promise<void> {
    try {
        await cacheRedis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
        console.error('Cache set error:', error)
    }
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string): Promise<void> {
    try {
        await cacheRedis.del(key)
    } catch (error) {
        console.error('Cache delete error:', error)
    }
}

/**
 * Delete multiple cached keys by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
    try {
        const keys = await cacheRedis.keys(pattern)
        if (keys.length > 0) {
            // Remove keyPrefix from keys before deletion
            const keysWithoutPrefix = keys.map(k => k.replace(/^cache:/, ''))
            await cacheRedis.del(...keysWithoutPrefix)
        }
    } catch (error) {
        console.error('Cache delete pattern error:', error)
    }
}

/**
 * Invalidate dashboard stats cache for a user
 * Call this when message, customer, or template data changes
 */
export async function invalidateDashboardCache(userId: string): Promise<void> {
    await deleteCache(CACHE_KEYS.dashboardStats(userId))
}

/**
 * Invalidate user cache
 * Call this when user profile is updated
 */
export async function invalidateUserCache(userId: string): Promise<void> {
    await deleteCache(CACHE_KEYS.user(userId))
    await deleteCache(CACHE_KEYS.dashboardStats(userId))
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📦 Closing cache Redis connection...')
    await cacheRedis.quit()
    console.log('✅ Cache Redis closed')
})
