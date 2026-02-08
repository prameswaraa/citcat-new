import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { auditLog } from '../../utils/auditLog.js'

const app = new Hono()

// GET /api/v1/crm/custom-fields - List definitions
app.get('/custom-fields', async (c: Context) => {
    try {
        if (!c.user) return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)

        const fields = await prisma.customFieldDefinition.findMany({
            where: { userId: c.user.id },
            orderBy: { order: 'asc' }
        })

        return c.json({ success: true, data: fields })
    } catch (error) {
        console.error('List custom fields error:', error)
        return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch custom fields' } }, 500)
    }
})

// POST /api/v1/crm/custom-fields - Create definition
app.post('/custom-fields', async (c: Context) => {
    try {
        if (!c.user) return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)

        const body = await c.req.json()
        const { name, key, type, description, options, required, order } = body

        const field = await prisma.customFieldDefinition.create({
            data: {
                userId: c.user.id,
                name,
                key,
                type,
                description,
                options,
                required: required || false,
                order: order || 0
            }
        })

        await auditLog('CUSTOM_FIELD_CREATED', 'CustomField', field.id, { name, key }, c.user.id)

        return c.json({ success: true, data: field })
    } catch (error) {
        console.error('Create custom field error:', error)
        return c.json({ error: { code: 'InternalServerError', message: 'Failed to create custom field' } }, 500)
    }
})

// PUT /api/v1/crm/custom-fields/:id - Update definition
app.put('/custom-fields/:id', async (c: Context) => {
    try {
        if (!c.user) return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
        const id = c.req.param('id')
        const body = await c.req.json()
        const { name, description, options, required, order } = body

        const field = await prisma.customFieldDefinition.update({
            where: { id, userId: c.user.id },
            data: { name, description, options, required, order }
        })

        return c.json({ success: true, data: field })
    } catch (error) {
        console.error('Update custom field error:', error)
        return c.json({ error: { code: 'InternalServerError', message: 'Failed to update custom field' } }, 500)
    }
})

// DELETE /api/v1/crm/custom-fields/:id - Delete definition
app.delete('/custom-fields/:id', async (c: Context) => {
    try {
        if (!c.user) return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
        const id = c.req.param('id')

        await prisma.customFieldDefinition.delete({
            where: { id, userId: c.user.id }
        })

        await auditLog('CUSTOM_FIELD_DELETED', 'CustomField', id, {}, c.user.id)

        return c.json({ success: true, message: 'Custom field deleted' })
    } catch (error) {
        console.error('Delete custom field error:', error)
        return c.json({ error: { code: 'InternalServerError', message: 'Failed to delete custom field' } }, 500)
    }
})

export default app
