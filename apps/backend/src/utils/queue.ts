import { Queue, Worker, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'

// Redis connection configuration for Upstash
export const redisConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    // Enable TLS for Upstash
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    // Upstash requires family 4 (IPv4)
    family: 4,
})

// Queue names
export const QUEUE_NAMES = {
    WEBHOOK: 'webhook-processing',
    MESSAGE: 'message-processing',
    WEBHOOK_OUTBOUND: 'webhook-outbound',
} as const

// Webhook Queue - for processing incoming webhooks
export const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 3600, // Remove after 1 hour
        },
        removeOnFail: {
            count: 500, // Keep last 500 failed jobs for debugging
        },
    },
})

// Message Queue - for processing outbound messages
export const messageQueue = new Queue(QUEUE_NAMES.MESSAGE, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            count: 100,
            age: 3600,
        },
        removeOnFail: {
            count: 500,
        },
    },
})

// Webhook Outbound Queue - for delivering webhooks to external systems
// Retry delays: 1min, 5min, 30min, 2hr (as per requirements)
export const webhookOutboundQueue = new Queue(QUEUE_NAMES.WEBHOOK_OUTBOUND, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5, // Initial attempt + 4 retries
        backoff: {
            type: 'custom',
        },
        removeOnComplete: {
            count: 1000,
            age: 86400, // 24 hours
        },
        removeOnFail: {
            count: 1000,
        },
    },
})

// Queue Events for monitoring
export const webhookQueueEvents = new QueueEvents(QUEUE_NAMES.WEBHOOK, {
    connection: redisConnection,
})

export const messageQueueEvents = new QueueEvents(QUEUE_NAMES.MESSAGE, {
    connection: redisConnection,
})

export const webhookOutboundQueueEvents = new QueueEvents(QUEUE_NAMES.WEBHOOK_OUTBOUND, {
    connection: redisConnection,
})

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📦 Closing queues...')
    await webhookQueue.close()
    await messageQueue.close()
    await webhookOutboundQueue.close()
    await webhookQueueEvents.close()
    await messageQueueEvents.close()
    await webhookOutboundQueueEvents.close()
    await redisConnection.quit()
    console.log('✅ Queues closed')
})

// Error handling
webhookQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Webhook job ${jobId} failed:`, failedReason)
})

messageQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Message job ${jobId} failed:`, failedReason)
})

webhookOutboundQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Webhook outbound job ${jobId} failed:`, failedReason)
})

// Success logging
webhookQueueEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Webhook job ${jobId} completed`)
})

messageQueueEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Message job ${jobId} completed`)
})

webhookOutboundQueueEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Webhook outbound job ${jobId} completed`)
})
