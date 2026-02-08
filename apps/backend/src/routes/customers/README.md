# Customer Routes

Modular customer management routes for METAWA API.

## Structure

```
customers/
├── index.ts          # Main router (mounts all sub-routes)
├── list.ts           # GET / - List customers
├── detail.ts         # GET /:id - Get single customer
├── create.ts         # POST / - Create customer
├── update.ts         # PATCH /:id - Update customer
├── delete.ts         # DELETE /:id - Delete customer
├── window-status.ts  # GET /:id/window-status - Get 24h window status
├── consent.ts        # POST /:id/consent - Log consent action
├── blacklist.ts      # PATCH /:id/blacklist - Toggle blacklist
├── export.ts         # GET /export - Export customers to CSV
├── import.ts         # POST /import - Import customers from CSV
└── README.md         # This file
```

## Endpoints

### Public/Authenticated Routes
- `GET /api/v1/customers` - List all customers for authenticated user
- `GET /api/v1/customers/:id` - Get single customer details
- `GET /api/v1/customers/:id/window-status` - Get 24-hour messaging window status
- `GET /api/v1/customers/export` - Export customers to CSV

### Protected Routes (ADMIN, BUSINESS_OWNER, AGENT)
- `POST /api/v1/customers` - Create new customer
- `PATCH /api/v1/customers/:id` - Update customer
- `POST /api/v1/customers/:id/consent` - Log consent action (OPT_IN/OPT_OUT/UPDATE)
- `PATCH /api/v1/customers/:id/blacklist` - Toggle blacklist status
- `POST /api/v1/customers/import` - Import customers from CSV

### Admin/Business Owner Only
- `DELETE /api/v1/customers/:id` - Delete customer

## Key Changes from Old Version

### Replaced `businessAccountId` with `userId`
All references to `businessAccountId` have been replaced with `userId` to align with the new user-centric architecture.

**Old:**
```typescript
businessAccountId: z.string()
where: { businessAccountId_phoneNumber: { businessAccountId, phoneNumber } }
```

**New:**
```typescript
// No longer needed in schema - uses c.user.id
where: { userId_phoneNumber: { userId: c.user.id, phoneNumber } }
```

### Removed BusinessAccount Relation
The `businessAccount` include/relation has been removed. Now uses direct `user` relation:

**Old:**
```typescript
include: {
  businessAccount: {
    select: { id: true, name: true }
  }
}
```

**New:**
```typescript
include: {
  user: {
    select: { id: true, name: true, email: true }
  }
}
```

### Access Control Updates
Access control now checks against `c.user.id` instead of `c.user.businessAccountId`:

**Old:**
```typescript
if (c.user.role !== 'ADMIN' && c.user.businessAccountId !== customer.businessAccountId) {
  return c.json({ error: 'Access denied' }, 403)
}
```

**New:**
```typescript
if (c.user.role !== 'ADMIN' && c.user.id !== customer.userId) {
  return c.json({ error: 'Access denied' }, 403)
}
```

## Usage Examples

### List Customers
```bash
GET /api/v1/customers
GET /api/v1/customers?consentStatus=true
GET /api/v1/customers?blacklisted=false
```

### Create Customer
```bash
POST /api/v1/customers
Content-Type: application/json

{
  "phoneNumber": "6281234567890",
  "name": "John Doe",
  "consentStatus": true,
  "consentSource": "Website Form",
  "consentPurpose": "Marketing"
}
```

### Update Consent
```bash
POST /api/v1/customers/{customerId}/consent
Content-Type: application/json

{
  "action": "OPT_IN",
  "source": "WhatsApp Message",
  "purpose": "Product Updates",
  "ipAddress": "192.168.1.1"
}
```

### Export Customers
```bash
GET /api/v1/customers/export
# Returns CSV file
```

### Import Customers
```bash
POST /api/v1/customers/import
Content-Type: application/json

{
  "customers": [
    {
      "phoneNumber": "6281234567890",
      "name": "Jane Doe",
      "consentStatus": true,
      "consentSource": "CSV Import"
    }
  ]
}
```

## Notes

- All routes require authentication via `authMiddleware`
- ADMIN users can access all customers across all users
- Non-admin users can only access their own customers
- Customers are automatically created when receiving WhatsApp messages (via webhook)
- Deleting a customer cascades to consent logs but preserves messages
- 24-hour messaging window is tracked per customer
- Consent logs maintain audit trail for GDPR/compliance
