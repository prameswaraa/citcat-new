# 📚 KirimChat Documentation

> **⚠️ CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **DO NOT SHARE, FORK PUBLICLY, OR DISTRIBUTE THIS CODE**
>
> This is proprietary software. Unauthorized sharing, distribution, or public forking is strictly prohibited.
> - ❌ DO NOT make your GitHub repository PUBLIC
> - ❌ DO NOT share source code with anyone
> - ❌ DO NOT fork to public repositories
> - ❌ DO NOT publish Docker images publicly
> - ✅ Keep repository PRIVATE at all times
> - ✅ Use private GHCR packages only
> - ✅ Share access only with authorized team members

---

Dokumentasi lengkap untuk deployment dan maintenance KirimChat.

## 📖 Documentation Index

Baca dokumentasi sesuai urutan untuk deployment yang sukses:

### 🏗️ For Developers (Build Your Own Image)

0. **[00-BUILD-AND-PUSH.md](00-BUILD-AND-PUSH.md)** - Build & Push Docker Image
   - Fork repository
   - Build Docker image locally
   - Push to your own GHCR
   - Update docker-compose.yml
   - Setup CI/CD with GitHub Actions
   - **Read this first if you want to use your own Docker image**

### 🚀 For Deployment

1. **[01-BACKEND-DEPLOYMENT.md](01-BACKEND-DEPLOYMENT.md)** - Backend Deployment
   - Server setup & Docker installation
   - Environment configuration
   - Automated deployment with setup.sh
   - Nginx & SSL configuration
   - Post-deployment setup
   - Troubleshooting

2. **[02-FRONTEND-DEPLOYMENT.md](02-FRONTEND-DEPLOYMENT.md)** - Frontend Deployment
   - Local environment setup
   - Build configuration
   - Cloudflare Pages deployment
   - DNS & SSL setup
   - Verification & testing
   - Troubleshooting

3. **[03-UPGRADE-GUIDE.md](03-UPGRADE-GUIDE.md)** - Upgrade Procedures
   - Safe upgrade procedures
   - Data safety guarantees
   - Schema changes handling
   - Rollback procedures
   - Best practices

4. **[04-EASYPANEL-DEPLOYMENT.md](04-EASYPANEL-DEPLOYMENT.md)** - Easypanel Deployment
   - One-click deployment dengan Easypanel
   - Auto-generate template dengan secrets
   - PostgreSQL + pgvector + Redis setup
   - Domain & SSL configuration
   - Monitoring & troubleshooting

## 🎯 Quick Navigation

### For Developers (Build Own Image)
```
00-BUILD-AND-PUSH.md → Build and push your own Docker image
```

### For First-Time Deployment
```
01-BACKEND-DEPLOYMENT.md → Deploy backend first
02-FRONTEND-DEPLOYMENT.md → Then deploy frontend
```

### For Upgrades
```
03-UPGRADE-GUIDE.md → Safe upgrade procedures
```

### For Easypanel Users
```
04-EASYPANEL-DEPLOYMENT.md → Deploy dengan Easypanel (recommended untuk pemula)
```

## 📋 What You'll Deploy

### Backend (Docker)
- **Node.js API** - Express.js backend
- **PostgreSQL** - Database with pgvector
- **Redis** - Caching and queues
- **Nginx** - Reverse proxy
- **SSL/HTTPS** - Let's Encrypt

### Frontend (Cloudflare Workers)
- **Next.js** - React framework
- **Cloudflare Pages** - Hosting
- **Cloudflare CDN** - Global distribution
- **Auto SSL** - Cloudflare managed

## 🛠️ Prerequisites

### Backend
- VPS/Server (Ubuntu 20.04+)
- Docker & Docker Compose
- Domain name (e.g., api.yourdomain.com)
- 2GB RAM minimum
- 10GB disk space

### Frontend
- Cloudflare account
- Domain added to Cloudflare
- Node.js 18+ (local)
- Git repository

## ⚡ Quick Start

### Option A: Use Pre-built Image (Recommended for Quick Start)

#### Backend
```bash
# 1. Download files
mkdir ~/kirimchat-backend && cd ~/kirimchat-backend
wget https://raw.githubusercontent.com/.../docker-compose.yml
wget https://raw.githubusercontent.com/.../setup.sh
wget https://raw.githubusercontent.com/.../init-db.sh

# 2. Configure
cp .env.docker.example .env
nano .env

# 3. Deploy
chmod +x setup.sh && ./setup.sh
```

#### Frontend
```bash
# 1. Build
cd apps/frontend
pnpm build:worker

# 2. Deploy via Cloudflare Pages
# Connect GitHub → Configure build → Deploy
```

### Option B: Build Your Own Image (Recommended for Production)

#### 1. Build & Push Docker Image
```bash
# Fork repository
git clone https://github.com/YOUR_USERNAME/kichat-approved.git
cd kichat-approved

# Login to GHCR
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Build image
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .

# Push to GHCR
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest

# Update docker-compose.yml to use your image
```

See [00-BUILD-AND-PUSH.md](00-BUILD-AND-PUSH.md) for detailed instructions.

#### 2. Deploy Backend
```bash
# Download deployment files
mkdir ~/kirimchat-backend && cd ~/kirimchat-backend
wget https://raw.githubusercontent.com/YOUR_USERNAME/kichat-approved/main/docker-compose.yml
wget https://raw.githubusercontent.com/YOUR_USERNAME/kichat-approved/main/setup.sh

# Configure and deploy
cp .env.docker.example .env
nano .env
chmod +x setup.sh && ./setup.sh
```

#### 3. Deploy Frontend
```bash
# 1. Build
cd apps/frontend
pnpm build:worker

# 2. Deploy via Cloudflare Pages
# Connect GitHub → Configure build → Deploy
```

## 📞 Support

- **Build & Push Issues**: See [00-BUILD-AND-PUSH.md](00-BUILD-AND-PUSH.md#troubleshooting)
- **Backend Issues**: See [01-BACKEND-DEPLOYMENT.md](01-BACKEND-DEPLOYMENT.md#troubleshooting)
- **Frontend Issues**: See [02-FRONTEND-DEPLOYMENT.md](02-FRONTEND-DEPLOYMENT.md#troubleshooting)
- **Upgrade Help**: See [03-UPGRADE-GUIDE.md](03-UPGRADE-GUIDE.md)
- **Easypanel Issues**: See [04-EASYPANEL-DEPLOYMENT.md](04-EASYPANEL-DEPLOYMENT.md#troubleshooting)

## 🔄 Documentation Updates

Last updated: 2024-12-28

### Version History
- v1.3.0 (2025-01-04) - Added Easypanel deployment guide
  - One-click deployment template
  - Auto-generate secrets script
  - PostgreSQL + pgvector configuration
  - Complete troubleshooting guide
- v1.2.0 (2024-12-29) - Added build & push guide
  - Complete guide for building own Docker image
  - GHCR setup and authentication
  - GitHub Actions CI/CD workflow
  - docker-compose.yml customization
- v1.1.0 (2024-12-28) - Restructured documentation
  - Split into focused guides (Backend, Frontend, Upgrade)
  - Simplified navigation
  - Removed redundant content
- v1.0.0 (2024-12-28) - Initial documentation

## 📝 Contributing

Found an issue or want to improve documentation?
1. Create an issue
2. Submit a pull request
3. Update relevant documentation files

---

**Happy Deploying! 🚀**

- **Easypanel user?** Start with [04-EASYPANEL-DEPLOYMENT.md](04-EASYPANEL-DEPLOYMENT.md) (easiest!)
- **Want to build your own image?** Start with [00-BUILD-AND-PUSH.md](00-BUILD-AND-PUSH.md)
- **Manual Docker deployment?** Start with [01-BACKEND-DEPLOYMENT.md](01-BACKEND-DEPLOYMENT.md)