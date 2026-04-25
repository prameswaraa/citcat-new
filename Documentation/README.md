# Citcat Documentation

> **CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> - DO NOT make your GitHub repository PUBLIC
> - DO NOT share source code with anyone
> - DO NOT fork to public repositories
> - DO NOT publish Docker images publicly
> - Keep repository PRIVATE at all times
> - Share access only with authorized team members

---

Dokumentasi lengkap untuk deployment dan maintenance Citcat.

## Documentation Index

Baca dokumentasi sesuai urutan untuk deployment yang sukses:

### Wajib (Ikuti Urutan)

1. **[01-FORK-REPOSITORY-GUIDE.md](01-FORK-REPOSITORY-GUIDE.md)** - Fork & Setup GitHub Sendiri
   - Fork repository (keep private!)
   - Download & push ke GitHub baru
   - Sync update dari repo utama

2. **[02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md)** - Backend Deployment
   - Server setup & Docker installation
   - Environment configuration
   - Nginx & SSL configuration

3. **[03-FRONTEND-DEPLOYMENT.md](03-FRONTEND-DEPLOYMENT.md)** - Frontend Deployment
   - Build configuration
   - Cloudflare Pages deployment
   - DNS & SSL setup

### Opsional

4. **[04-OPSIONAL-PM2-MONOREPO-DEPLOYMENT.md](04-OPSIONAL-PM2-MONOREPO-DEPLOYMENT.md)** - PM2 Monorepo Deployment
   - Deploy backend + frontend dengan PM2 dari root folder
   - Cluster mode, auto-restart, logging
   - Monitoring dan auto-start on boot

5. **[05-BRANDING-CONFIGURATION.md](05-BRANDING-CONFIGURATION.md)** - White-Label Branding
   - Konfigurasi nama aplikasi & logo
   - Custom API key prefix
   - Branding via Admin Dashboard

---

## Quick Start

```
01-FORK-REPOSITORY-GUIDE.md → Fork repo ke GitHub Anda
02-BACKEND-DEPLOYMENT.md    → Deploy backend
03-FRONTEND-DEPLOYMENT.md   → Deploy frontend
```

## Support

- **Backend Issues**: See [02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md#troubleshooting)
- **Frontend Issues**: See [03-FRONTEND-DEPLOYMENT.md](03-FRONTEND-DEPLOYMENT.md#troubleshooting)
- **PM2 Monorepo Issues**: See [04-OPSIONAL-PM2-MONOREPO-DEPLOYMENT.md](04-OPSIONAL-PM2-MONOREPO-DEPLOYMENT.md#troubleshooting)
- **Branding Issues**: See [05-BRANDING-CONFIGURATION.md](05-BRANDING-CONFIGURATION.md#troubleshooting)
