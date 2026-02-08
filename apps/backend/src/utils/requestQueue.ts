/**
 * Request Queue for Meta API calls
 * 
 * Implements a queue system to handle rate-limited requests
 * with exponential backoff and retry logic.
 */

import { logger } from './logger.js';
import { getRetryDelay } from './wabaErrors.js';

/**
 * Request queue item
 */
interface QueueItem<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retries: number;
  maxRetries: number;
  priority: number;
  addedAt: Date;
}

/**
 * Request Queue Manager
 * 
 * Manages a queue of API requests with rate limiting and retry logic
 */
export class RequestQueue {
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private requestsInProgress = 0;
  private maxConcurrent: number;
  private minDelay: number; // Minimum delay between requests (ms)
  private lastRequestTime = 0;

  constructor(options: {
    maxConcurrent?: number;
    minDelay?: number;
  } = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.minDelay = options.minDelay || 200; // 200ms between requests
  }

  /**
   * Add a request to the queue
   * 
   * @param fn - Function to execute
   * @param options - Queue options
   * @returns Promise that resolves with the function result
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      priority?: number;
    } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const item: QueueItem<T> = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fn,
        resolve,
        reject,
        retries: 0,
        maxRetries: options.maxRetries || 3,
        priority: options.priority || 0,
        addedAt: new Date(),
      };

      // Add to queue (higher priority first)
      const insertIndex = this.queue.findIndex(q => q.priority < item.priority);
      if (insertIndex === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIndex, 0, item);
      }

      logger.debug(`Request ${item.id} added to queue (position: ${this.queue.length}, priority: ${item.priority})`);

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Wait if we've reached max concurrent requests
      while (this.requestsInProgress >= this.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Enforce minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
      }

      // Get next item from queue
      const item = this.queue.shift();
      if (!item) {
        break;
      }

      // Process the request
      this.requestsInProgress++;
      this.lastRequestTime = Date.now();

      this.executeRequest(item).finally(() => {
        this.requestsInProgress--;
      });
    }

    this.processing = false;
  }

  /**
   * Execute a queued request with retry logic
   * 
   * @param item - Queue item to execute
   */
  private async executeRequest<T>(item: QueueItem<T>): Promise<void> {
    try {
      logger.debug(`Executing request ${item.id} (attempt ${item.retries + 1}/${item.maxRetries + 1})`);
      
      const result = await item.fn();
      item.resolve(result);
      
      logger.debug(`Request ${item.id} completed successfully`);
    } catch (error: any) {
      // Check if we should retry
      const shouldRetry = this.shouldRetry(error, item.retries, item.maxRetries);

      if (shouldRetry) {
        item.retries++;
        const delay = getRetryDelay(item.retries - 1);
        
        logger.warn(
          `Request ${item.id} failed (attempt ${item.retries}/${item.maxRetries + 1}), retrying in ${delay}ms`,
          { error: error.message }
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Re-add to queue with higher priority
        item.priority += 10;
        const insertIndex = this.queue.findIndex(q => q.priority < item.priority);
        if (insertIndex === -1) {
          this.queue.push(item);
        } else {
          this.queue.splice(insertIndex, 0, item);
        }
      } else {
        logger.error(
          `Request ${item.id} failed after ${item.retries + 1} attempts`,
          { error: error.message }
        );
        item.reject(error);
      }
    }
  }

  /**
   * Determine if a request should be retried
   * 
   * @param error - Error that occurred
   * @param retries - Number of retries so far
   * @param maxRetries - Maximum retries allowed
   * @returns True if should retry
   */
  private shouldRetry(error: any, retries: number, maxRetries: number): boolean {
    // Don't retry if max retries reached
    if (retries >= maxRetries) {
      return false;
    }

    // Retry on rate limit errors
    if (error.response?.status === 429) {
      return true;
    }

    // Retry on server errors (5xx)
    if (error.response?.status >= 500) {
      return true;
    }

    // Retry on network errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET'
    ) {
      return true;
    }

    // Retry on specific Meta API error codes
    const metaError = error.response?.data?.error;
    if (metaError) {
      // Rate limit errors
      if (metaError.code === 4 || metaError.code === 17 || metaError.code === 32) {
        return true;
      }

      // Temporary errors
      if (metaError.code === 1 || metaError.code === 2) {
        return true;
      }
    }

    // Don't retry client errors (4xx except 429)
    return false;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      requestsInProgress: this.requestsInProgress,
      processing: this.processing,
      oldestRequest: this.queue.length > 0 ? this.queue[0].addedAt : null,
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    // Reject all pending requests
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
    logger.info('Request queue cleared');
  }
}

// Export singleton instance for Meta API requests
export const metaApiQueue = new RequestQueue({
  maxConcurrent: 5,
  minDelay: 200, // 200ms between requests
});

// Export high-priority queue for critical operations
export const criticalQueue = new RequestQueue({
  maxConcurrent: 2,
  minDelay: 500, // 500ms between requests
});
