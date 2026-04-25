# ☁️ Frontend Deployment Guide - Citcat

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

Panduan deployment frontend Citcat ke Cloudflare Workers.

## 📋 Table of Contents

1. [Fork Repository](#fork-repository)
2. [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
3. [DNS Configuration](#dns-configuration)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Fork Repository

1. Fork repository Citcat ke GitHub account Anda
2. Pastikan repository tetap **PRIVATE**

---

## Cloudflare Pages Deployment

### 1. Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application**
3. Click **Connect to Git**
4. Select your forked repository
5. Configure build settings:

**Build Configuration:**
```
Framework preset: None
Build command: pnpm build:worker
Deploy command: npx wrangler deploy
Root directory: /apps/frontend
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.citcat.id
NEXT_PUBLIC_APP_URL=https://citcat.id
NEXT_PUBLIC_APP_NAME=Chat.Kirim
```

### 2. Deploy

- Click **Save and Deploy**
- Wait for build to complete (~2-5 minutes)
- You'll get a temporary URL like: `your-project.pages.dev`

### 3. Setup Custom Domain

1. Go to **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `yourdomain.com`
4. Click **Continue**
5. Cloudflare will auto-configure DNS
6. Wait for SSL certificate (usually instant)

---

---

## Verification

### Verify Frontend Deployment

**Visit in browser:**
- https://citcat.id
- https://www.citcat.id

**Check these:**
- [ ] Homepage loads correctly
- [ ] Login page accessible
- [ ] API connection working
- [ ] No console errors
- [ ] SSL certificate valid

---

## Troubleshooting

### Build fails on Cloudflare Pages

**Check build logs:**
1. Go to **Deployments** tab
2. Click on failed deployment
3. View build logs

**Common issues:**
- Node version mismatch → Set `NODE_VERSION=22` in environment variables
- Build command wrong → Should be `pnpm build:worker`

### Environment variables not working

1. Go to **Settings** → **Environment variables**
2. Add variables for **Production** environment
3. Redeploy: **Deployments** → **Retry deployment**

### API connection fails

**Check:**
1. Backend is running: `curl https://api.citcat.id/health`
2. CORS configured correctly in backend
3. Frontend env variables correct

### Custom domain not working

1. Check DNS propagation: https://dnschecker.org
2. Verify CNAME records in Cloudflare DNS
3. Check SSL/TLS mode (should be Full)
4. Wait 5-10 minutes for propagation

### 404 errors on page refresh

This is handled by OpenNext adapter automatically. If still occurs:
1. Verify `wrangler.jsonc` points to correct worker.js
2. Redeploy

---

## 🔄 Updating Frontend

Push changes to your forked repository - Cloudflare Pages will auto-deploy.

---

## 🔒 Security Checklist

- [ ] SSL/TLS enabled (Full mode)
- [ ] Always Use HTTPS enabled
- [ ] HSTS enabled
- [ ] Security headers configured
- [ ] API URL uses HTTPS
- [ ] Environment variables properly set

---

**Frontend deployment complete!** 🎉

**Next Steps:**
1. Test all features
2. Configure WhatsApp/Instagram webhooks
3. Setup monitoring
4. **[Config Embedded Facebook Login](https://www.notion.so/Setelah-Approve-2dd77d41bd658066a0d2d9e2e53c1367)** - Setting untuk embedded WhatsApp login setelah website online
5. See [06-OPSIONAL-UPGRADE-GUIDE.md](06-OPSIONAL-UPGRADE-GUIDE.md) for updates
