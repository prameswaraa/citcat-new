# White-Label Customization Guide

Panduan untuk meng-customize branding n8n node ini sesuai brand Anda.

## Environment Variables

Set sebelum build:

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `N8N_NODE_BRAND_NAME` | Nama tampil di n8n UI | `ChatPlatform` |
| `N8N_NODE_BRAND_ID` | Internal node ID (camelCase) | `chatPlatform` |
| `N8N_NODE_DESCRIPTION` | Deskripsi node | (default) |
| `N8N_NODE_API_BASE_URL` | Default API URL | `https://api.example.com/api/v1/public` |
| `N8N_NODE_API_KEY_PREFIX` | Prefix API key | `cp_live_` |
| `N8N_NODE_DOCS_URL` | URL dokumentasi | `https://docs.example.com/developers` |
| `N8N_NODE_HOMEPAGE` | Homepage URL | `https://example.com` |
| `N8N_NODE_SUPPORT_EMAIL` | Email support | `support@example.com` |

## Cara Customize

### Opsi 1: Edit config/brand.config.ts (Recommended)

Edit langsung default values di `config/brand.config.ts`:

```typescript
const displayName = process.env.N8N_NODE_BRAND_NAME || 'YourBrand';      // ← ganti
const brandId = process.env.N8N_NODE_BRAND_ID || 'yourBrand';            // ← ganti
const apiKeyPrefix = process.env.N8N_NODE_API_KEY_PREFIX || 'yb_live_';  // ← ganti
```

Lalu build:
```bash
npm run build
```

### Opsi 2: Runtime Environment Variables

Set di server n8n (tidak perlu rebuild):
```bash
export N8N_NODE_BRAND_NAME="YourBrand"
export N8N_NODE_BRAND_ID="yourBrand"
export N8N_NODE_API_BASE_URL="https://api.yourbrand.com/api/v1/public"
# restart n8n
```

## Update package.json

Jangan lupa update juga:

```json
{
  "name": "@yourbrand/n8n-nodes-yourbrand",
  "description": "Your description",
  "homepage": "https://yourbrand.com",
  "author": {
    "name": "YourBrand",
    "email": "support@yourbrand.com"
  },
  "repository": {
    "url": "https://github.com/yourbrand/n8n-nodes-yourbrand.git"
  }
}
```

## Update README.md

Sesuaikan README.md dengan brand Anda sebelum publish ke npm.

## Ganti Icon

Ganti file `nodes/ChatPlatform/icon.svg` dengan logo brand Anda.

## Publish ke npm

```bash
npm login
npm publish --access public
```
