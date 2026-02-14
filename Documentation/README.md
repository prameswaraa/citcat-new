# KirimChat Documentation

> **CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> - DO NOT make your GitHub repository PUBLIC
> - DO NOT share source code with anyone
> - DO NOT fork to public repositories
> - DO NOT publish Docker images publicly
> - Keep repository PRIVATE at all times
> - Share access only with authorized team members

---

Dokumentasi lengkap untuk deployment dan maintenance KirimChat.

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

4. **[04-OPSIONAL-BUILD-AND-PUSH.md](04-OPSIONAL-BUILD-AND-PUSH.md)** - Build & Push Docker Image
   - Build Docker image backend + frontend
   - Push to your own GHCR
   - Setup CI/CD with GitHub Actions

5. **[05-OPSIONAL-EASYPANEL-DEPLOYMENT.md](05-OPSIONAL-EASYPANEL-DEPLOYMENT.md)** - Easypanel Deployment
   - One-click deployment dengan Easypanel
   - PostgreSQL + pgvector + Redis setup
   - Domain & SSL configuration

6. **[06-OPSIONAL-UPGRADE-GUIDE.md](06-OPSIONAL-UPGRADE-GUIDE.md)** - Upgrade Procedures
   - Safe upgrade procedures
   - Schema changes handling
   - Rollback procedures

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
- **Build & Push Issues**: See [04-OPSIONAL-BUILD-AND-PUSH.md](04-OPSIONAL-BUILD-AND-PUSH.md#troubleshooting)
- **Easypanel Issues**: See [05-OPSIONAL-EASYPANEL-DEPLOYMENT.md](05-OPSIONAL-EASYPANEL-DEPLOYMENT.md#troubleshooting)
- **Upgrade Help**: See [06-OPSIONAL-UPGRADE-GUIDE.md](06-OPSIONAL-UPGRADE-GUIDE.md)
