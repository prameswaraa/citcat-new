# Templates Routes (Modular Structure)

Modular template routes untuk better maintainability dan organization.

## Structure

```
templates/
├── index.ts          # Main router - combines all routes
├── list.ts           # GET /templates - List all templates
├── detail.ts         # GET /templates/:id - Get single template
├── create.ts         # POST /templates - Create new template
├── update.ts         # PATCH /templates/:id - Update template
├── delete.ts         # DELETE /templates/:id - Delete template
├── submit.ts         # POST /templates/:id/submit - Submit to Meta
├── analytics.ts      # GET /templates/:id/analytics - Get analytics
├── test.ts           # POST /templates/:id/send-test - Send test message
└── sync.ts           # POST /templates/sync - Sync from Meta
```

## Key Changes from Monolithic

1. **User-based instead of BusinessAccount-based**
   - Uses `userId` instead of `businessAccountId`
   - WABA ID comes from `user.wabaId`

2. **Modular Structure**
   - Each endpoint in separate file
   - Easier to maintain and test
   - Better code organization

3. **Consistent Error Handling**
   - Standardized error responses
   - Proper HTTP status codes
   - Detailed error messages

## Usage

Import in main index.ts:
```typescript
import templateRoutes from './routes/templates/index'
app.route('/api/v1/templates', templateRoutes)
```

## Authentication

- List, Detail, Analytics: Requires authentication
- Create, Update, Delete, Submit, Test, Sync: Requires ADMIN or BUSINESS_OWNER role

## Access Control

- Users can only access their own templates
- Admins can access all templates
