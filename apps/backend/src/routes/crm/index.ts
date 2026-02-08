import { Hono } from 'hono'
import pipelineRoutes from './pipelines.js'
import customFieldRoutes from './custom-fields.js'

const app = new Hono()

app.route('/', pipelineRoutes)
app.route('/', customFieldRoutes)

export default app
