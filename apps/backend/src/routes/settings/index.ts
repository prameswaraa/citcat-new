import { Hono } from 'hono';
import apiKeysRoutes from './api-keys.js';
import webhooksRoutes from './webhooks.js';

const app = new Hono();

// Mount API key management routes
app.route('/api-keys', apiKeysRoutes);

// Mount webhook endpoint management routes
app.route('/webhooks', webhooksRoutes);

export default app;
