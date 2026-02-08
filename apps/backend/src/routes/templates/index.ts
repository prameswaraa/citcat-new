import { Hono } from 'hono'
import { requireRole } from '../../middleware/auth.js'
import listTemplates from './list.js'
import getTemplateDetail from './detail.js'
import createTemplate from './create.js'
import updateTemplate from './update.js'
import deleteTemplate from './delete.js'
import submitTemplate from './submit.js'
import getTemplateAnalytics from './analytics.js'
import sendTestMessage from './test.js'
import syncTemplates from './sync.js'
import templateOperations from './operations.js'
import templateMedia from './media.js'
import templateBulk from './bulk.js'

const app = new Hono()

// Public/authenticated routes
app.route('/', listTemplates)
app.route('/', getTemplateDetail)
app.route('/', getTemplateAnalytics)

// Template operations routes (render-preview, send, validate)
// These routes handle their own authorization via resolveContext middleware
// Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5
app.route('/', templateOperations)

// Template media routes (upload media for template headers)
// These routes handle their own authorization via resolveContext middleware
// Requirements: 3.3, 7.1
app.route('/media', templateMedia)

// Bulk send routes (create, status, cancel, history)
// These routes handle their own authorization via resolveContext middleware
// Requirements: 11.1, 11.6, 11.7
app.route('/bulk', templateBulk)

// Protected routes (require ADMIN or BUSINESS_OWNER role)
app.use('/*', requireRole(['ADMIN', 'BUSINESS_OWNER']))
app.route('/', createTemplate)
app.route('/', updateTemplate)
app.route('/', deleteTemplate)
app.route('/', submitTemplate)
app.route('/', sendTestMessage)
app.route('/', syncTemplates)

export default app
