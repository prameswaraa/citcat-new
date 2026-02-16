# ☁️ Frontend Deployment Guide - KirimChat

> **⚠️ CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **DO NOT SHARE OR DISTRIBUTE**
>
> - ❌ DO NOT make repository PUBLIC
> - ❌ DO NOT share source code
> - ❌ DO NOT publish code publicly
> - ✅ Keep repository PRIVATE
> - ✅ Only authorized access
>
> This is proprietary software. Unauthorized distribution is prohibited.

---

Panduan lengkap deployment frontend KirimChat ke Cloudflare Workers/Pages.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Build Configuration](#build-configuration)
4. [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
5. [DNS Configuration](#dns-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Cloudflare account (free tier works)
- Domain added to Cloudflare
- Node.js 18+ installed locally
- Git repository (GitHub, GitLab, or Bitbucket)
- Backend API already deployed

---

## Local Setup (skip aja kalau mau langsung fork)
Langsung ke  4. [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
### Step 1: Prepare Local Environment

```bash
# Clone repository
git clone https://github.com/yourusername/kirimchat.git
cd kirimchat

# Install dependencies
npm install -g pnpm
pnpm install
```

### Step 2: Configure Environment Variables

```bash
cd apps/frontend

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Frontend .env:**
```env
# API URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Environment
NODE_ENV=production
```

**Important:** 
- `NEXT_PUBLIC_API_URL` - URL backend API Anda (sudah deployed)
- `NEXT_PUBLIC_APP_URL` - URL frontend Anda

---

## Build Configuration

### Step 3: Update Wrangler Config

```bash
nano wrangler.jsonc
```

**wrangler.jsonc:**
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "kirimchat-frontend",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  
  "keep_names": false,
  
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  
  "vars": {
    "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com",
    "NEXT_PUBLIC_APP_URL": "https://yourdomain.com"
  }
}
```

### Step 4: Build for Cloudflare Workers

```bash
# Build for Cloudflare Workers
pnpm build:worker

# Verify build output
ls -la .open-next/
```

**Expected output:**
```
.open-next/
├── assets/
├── worker.js
└── ...
```

---

## Cloudflare Pages Deployment

### GitHub Integration

#### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application**
3. Click **Connect to Git**
4. Select your repository: `kirimchat`
5. Configure build settings:

**Build Configuration:**
```
Framework preset: None
Build command: pnpm build:worker
Deploy command : npx wrangler deploy

Root directory: /apps/frontend
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

#### 3. Deploy

- Click **Save and Deploy**
- Wait for build to complete (~2-5 minutes)
- You'll get a temporary URL like: `your-project.pages.dev`

#### 4. Setup Custom Domain

1. Go to **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `yourdomain.com`
4. Click **Continue**
5. Cloudflare will auto-configure DNS
6. Wait for SSL certificate (usually instant)

---

## DNS Configuration

### If Auto-Configuration Doesn't Work

In Cloudflare DNS, add these records:

```
Type    Name    Content                 Proxy   TTL
CNAME   @       your-pages.pages.dev    Yes     Auto
CNAME   www     your-pages.pages.dev    Yes     Auto
```

**Important:**
- Enable **Proxy** (orange cloud) for CDN benefits
- SSL/TLS mode should be **Full** or **Full (strict)**

### SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full** or **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

---

## Verification

### Step 5: Verify Frontend Deployment

```bash
# Test frontend
curl https://yourdomain.com

# Should return HTML
```

**Visit in browser:**
- https://yourdomain.com
- https://www.yourdomain.com

**Check these:**
- [ ] Homepage loads correctly
- [ ] Login page accessible
- [ ] API connection working
- [ ] No console errors
- [ ] SSL certificate valid

### Test API Connection

Open browser console and check:
```javascript
// Should show your API URL
console.log(process.env.NEXT_PUBLIC_API_URL)
```

---

## Troubleshooting

### Build fails on Cloudflare Pages

**Check build logs:**
1. Go to **Deployments** tab
2. Click on failed deployment
3. View build logs

**Common issues:**
```bash
# Missing dependencies
pnpm install

# Node version mismatch
# Set in Cloudflare Pages: NODE_VERSION=18

# Build command wrong
# Should be: pnpm build:worker
```

### Environment variables not working

**Solution:**
1. Go to **Settings** → **Environment variables**
2. Add variables for **Production** environment
3. Redeploy: **Deployments** → **Retry deployment**

### API connection fails

**Check:**
```bash
# 1. Backend is running
curl https://api.yourdomain.com/health

# 2. CORS configured correctly in backend .env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 3. Frontend env variables correct
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Custom domain not working

**Steps:**
1. Check DNS propagation: https://dnschecker.org
2. Verify CNAME records in Cloudflare DNS
3. Check SSL/TLS mode (should be Full)
4. Wait 5-10 minutes for propagation

### 404 errors on page refresh

**Solution:**
This is handled by OpenNext adapter automatically. If still occurs:
1. Check `next.config.ts` has correct output
2. Verify `wrangler.jsonc` points to correct worker.js
3. Redeploy

### Slow page loads

**Optimize:**
1. Enable Cloudflare caching
2. Use Cloudflare CDN (orange cloud)
3. Enable **Auto Minify** in Cloudflare
4. Enable **Brotli** compression

---

## 🔄 Updating Frontend

```bash
# Make changes
git add .
git commit -m "Update frontend"
git push origin main

# Cloudflare Pages will auto-deploy
```

---

## 🛠️ Common Commands

```bash
# Local development
pnpm dev

# Build for production
pnpm build

# Build for Cloudflare Workers
pnpm build:worker

# Check Wrangler version
npx wrangler --version
```

---

## 📊 Performance Tips

1. **Enable Cloudflare CDN** - Use proxied DNS (orange cloud)
2. **Enable Auto Minify** - CSS, JS, HTML
3. **Enable Brotli** - Better compression than gzip
4. **Use Cloudflare Images** - Optimize images automatically
5. **Enable Argo Smart Routing** - Faster routing (paid)

---

## 🔒 Security Checklist

- [ ] SSL/TLS enabled (Full mode)
- [ ] Always Use HTTPS enabled
- [ ] HSTS enabled
- [ ] Security headers configured
- [ ] API URL uses HTTPS
- [ ] No sensitive data in client-side code
- [ ] Environment variables properly set

---

**Frontend deployment complete!** 🎉

**Next Steps:**
1. Test all features
2. Configure WhatsApp/Instagram webhooks
3. Setup monitoring
4. **[Config Embedded Facebook Login](https://www.notion.so/Setelah-Approve-2dd77d41bd658066a0d2d9e2e53c1367)** - Setting untuk embedded WhatsApp login setelah website online
5. See [06-OPSIONAL-UPGRADE-GUIDE.md](06-OPSIONAL-UPGRADE-GUIDE.md) for updates