# PM2 Monorepo Deployment Guide - KirimChat

> **CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **DO NOT SHARE OR DISTRIBUTE**
>
> - DO NOT make repository PUBLIC
> - DO NOT share source code
> - Keep everything PRIVATE
> - Only authorized access

---

Panduan deployment KirimChat menggunakan **PM2** dari root folder monorepo. Metode ini menjalankan **backend dan frontend** sekaligus dengan satu konfigurasi.

## Kapan Menggunakan Metode Ini?

| Metode | Gunakan Ketika |
|--------|----------------|
| **PM2 Monorepo (Guide ini)** | VPS/dedicated server, ingin kontrol penuh, backend + frontend di 1 server |
| **Cloudflare Pages** (Guide 03) | Frontend saja, ingin CDN global gratis |
| **Docker** (Guide 04) | Containerized deployment, Kubernetes |
| **Easypanel** (Guide 05) | One-click deployment, managed platform |

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Kenapa Tidak Pakai `pnpm start`?](#kenapa-tidak-pakai-pnpm-start)
3. [Quick Start](#quick-start)
4. [Manual Setup Step-by-Step](#manual-setup-step-by-step)
5. [PM2 Commands](#pm2-commands)
6. [Monitoring & Logging](#monitoring--logging)
7. [Auto-Start on Boot](#auto-start-on-boot)
8. [Nginx Configuration](#nginx-configuration)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Pastikan sudah menyelesaikan:

- [ ] **[02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md)** - Setup database (PostgreSQL + Redis)
- [ ] Node.js 18+ terinstall
- [ ] pnpm terinstall
- [ ] Environment variables sudah dikonfigurasi

```bash
# Verify prerequisites
node --version    # v18.x atau v20.x
pnpm --version    # 8.x atau 9.x
```

---

## Kenapa Tidak Pakai `pnpm start`?

File `package.json` root memiliki script:

```json
"start": "concurrently -n \"backend,frontend\" \"pnpm start:backend\" \"pnpm start:frontend\""
```

**Ini TIDAK cocok untuk production karena:**

| Masalah | Dampak |
|---------|--------|
| Menggunakan `concurrently` | Jika 1 service crash, tidak ada auto-restart |
| Tidak ada monitoring | Tidak bisa lihat CPU, memory usage |
| Log tercampur | Susah debugging karena output backend + frontend campur |
| Tidak ada cluster mode | Backend tidak memanfaatkan multi-core CPU |
| Tidak ada graceful shutdown | Request bisa terputus saat restart |

**PM2 menyelesaikan semua masalah ini.**

---

## Quick Start

### Option A: Menggunakan Script (Recommended)

**Linux/Mac:**
```bash
cd ~/kirimchat
chmod +x scripts/pm2-start.sh
./scripts/pm2-start.sh
```

**Windows (PowerShell):**
```powershell
cd C:\path\to\kirimchat
.\scripts\pm2-start.ps1
```

Script ini akan:
1. Install PM2 jika belum ada
2. Install dependencies (`pnpm install`)
3. Build aplikasi (`pnpm build`)
4. Start PM2 dengan production config
5. Save process list untuk auto-restart

### Option B: Manual Commands

```bash
# Install PM2 globally
npm install -g pm2

# Navigate ke project root
cd ~/kirimchat

# Install dependencies
pnpm install

# Build both apps
pnpm build

# Start dengan PM2
pm2 start ecosystem.config.cjs --env production

# Save untuk auto-restart
pm2 save
```

---

## Manual Setup Step-by-Step

### Step 1: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### Step 2: Clone/Upload Source Code

```bash
cd ~
git clone https://github.com/yourusername/kirimchat-multi.git kirimchat
cd kirimchat
```

### Step 3: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### Step 4: Configure Environment Variables

**Backend (.env):**
```bash
cp apps/backend/.env.example apps/backend/.env
nano apps/backend/.env
```

Lihat [02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md#step-10-configure-environment-variables) untuk konfigurasi lengkap.

**Frontend (.env.local):**
```bash
cp apps/frontend/.env.example apps/frontend/.env.local
nano apps/frontend/.env.local
```

Lihat [03-FRONTEND-DEPLOYMENT.md](03-FRONTEND-DEPLOYMENT.md) untuk konfigurasi frontend.

### Step 5: Setup Database

```bash
cd apps/backend

# Push schema ke database
pnpm prisma db push
```

### Step 6: Build Applications

```bash
# Build both backend and frontend, dari folder kirimchat
pnpm build

# Verify builds
ls -la apps/backend/dist/
ls -la apps/frontend/.next/
```

### Step 7: Create Required Directories

```bash
# Logs directory (dari root)
mkdir -p logs

# Backend uploads
mkdir -p apps/backend/uploads
```

### Step 8: Start dengan PM2

```bash
# Start production mode
pm2 start ecosystem.config.cjs --env production

# Check status
pm2 status
```

**Expected Output:**
```
┌─────────────────────┬────┬─────────┬──────┬───────┬────────┬─────────┬────────┐
│ id  │ name              │mode │ status │ cpu   │ memory │
├─────────────────────┼────┼─────────┼──────┼───────┼────────┼─────────┼────────┤
│ 0   │ kirimchat-backend │cluster│ online │ 0%    │ 85mb   │
│ 1   │ kirimchat-frontend│fork   │ online │ 0%    │ 120mb  │
└─────────────────────┴────┴─────────┴──────┴───────┴────────┴─────────┴────────┘
```

### Step 9: Verify Running

```bash
# Check backend health
curl http://localhost:3005/health

# Check frontend
curl http://localhost:3000
```

### Step 10: Save & Setup Auto-Start

```bash
# Save current process list
pm2 save

# Generate startup script
pm2 startup

# Ikuti instruksi yang muncul (copy & jalankan command sudo)
```

---

## PM2 Commands

### Status & Info

```bash
pm2 status                     # Lihat semua proses
pm2 show kirimchat-backend     # Detail backend
pm2 show kirimchat-frontend    # Detail frontend
pm2 monit                      # Real-time monitoring dashboard
```

### Start & Stop

```bash
pm2 start ecosystem.config.cjs --env production   # Start semua
pm2 stop all                                       # Stop semua
pm2 stop kirimchat-backend                         # Stop backend saja
pm2 stop kirimchat-frontend                        # Stop frontend saja
```

### Restart & Reload

```bash
pm2 restart all                # Restart semua (ada downtime)
pm2 reload all                 # Zero-downtime reload (recommended)
pm2 reload kirimchat-backend   # Reload backend saja
```

### Delete & Reset

```bash
pm2 delete all                 # Hapus semua proses
pm2 delete kirimchat-backend   # Hapus backend saja
pm2 kill                       # Kill PM2 daemon
```

---

## Monitoring & Logging

### View Logs

```bash
pm2 logs                              # Semua logs
pm2 logs kirimchat-backend            # Backend logs only
pm2 logs kirimchat-frontend           # Frontend logs only
pm2 logs --lines 100                  # Last 100 lines
pm2 logs kirimchat-backend --err      # Error logs only
```

### Log Files Location

```
kirimchat/
├── logs/
│   ├── backend-out.log       # Backend stdout
│   ├── backend-error.log     # Backend stderr
│   ├── frontend-out.log      # Frontend stdout
│   └── frontend-error.log    # Frontend stderr
```

### Setup Log Rotation

```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M        # Max 10MB per file
pm2 set pm2-logrotate:retain 7            # Keep 7 files
pm2 set pm2-logrotate:compress true       # Compress old logs
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateModule true   # Rotate module logs too
```

### Real-time Monitoring

```bash
# Terminal dashboard
pm2 monit

# Web dashboard (requires PM2 Plus - optional)
pm2 plus
```

---

## Auto-Start on Boot

### Linux (systemd)

```bash
# Generate startup script
pm2 startup

# Output example:
# [PM2] To setup the Startup Script, copy/paste the following command:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Run the suggested command, then:
pm2 save
```

### Windows

```bash
# Install pm2-windows-startup
npm install -g pm2-windows-startup

# Setup
pm2-startup install

# Save current processes
pm2 save
```

### Verify Auto-Start

```bash
# Reboot server
sudo reboot

# After reboot, check if PM2 started automatically
pm2 status
```

---

## Nginx Configuration

Untuk production, gunakan Nginx sebagai reverse proxy.

### Install Nginx

```bash
sudo apt install nginx -y
```

### Create Configuration

```bash
sudo nano /etc/nginx/sites-available/kirimchat
```

**Nginx Config:**

```nginx
# Backend API
upstream kirimchat_backend {
    server 127.0.0.1:3005;
    keepalive 64;
}

# Frontend Next.js
upstream kirimchat_frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# API Server (api.yourdomain.com)
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Max upload size
    client_max_body_size 50M;

    location / {
        proxy_pass http://kirimchat_backend;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend (yourdomain.com)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://kirimchat_frontend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable & Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kirimchat /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Setup SSL

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## Update Application

### Standard Update

```bash
cd ~/kirimchat

# Pull latest code
git pull origin main

# Install new dependencies
pnpm install

# Run migrations if needed
pnpm prisma:generate
pnpm prisma:db-push

# Rebuild
pnpm build

# Zero-downtime reload
pm2 reload all
```

### Quick Update Script

```bash
#!/bin/bash
# update-kirimchat.sh

set -e

cd ~/kirimchat

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
pnpm install

echo "Building..."
pnpm build

echo "Reloading PM2..."
pm2 reload all

echo "Update complete!"
pm2 status
```

---

## Troubleshooting

### App Not Starting

```bash
# Check detailed logs
pm2 logs kirimchat-backend --err --lines 50
pm2 logs kirimchat-frontend --err --lines 50

# Check if port is in use
sudo lsof -i :3000
sudo lsof -i :3005

# Delete and restart fresh
pm2 delete all
pm2 start ecosystem.config.cjs --env production
```

### Memory Issues

```bash
# Check memory usage
pm2 monit

# If memory too high, check ecosystem.config.cjs:
# max_memory_restart: '1G'  # Adjust as needed
```

### Build Errors

```bash
# Clean build
rm -rf apps/backend/dist
rm -rf apps/frontend/.next

# Rebuild
pnpm build
```

### Database Connection Failed

```bash
# Verify database is running
docker compose -f ~/kirimchat-db/docker-compose.yml ps

# Check connection string in .env
cat apps/backend/.env | grep DATABASE_URL

# Test connection
docker exec -it kirimchat-postgres psql -U postgres -d kirimchat -c "SELECT 1;"
```

### PM2 Daemon Issues

```bash
# Kill daemon and restart
pm2 kill
pm2 start ecosystem.config.cjs --env production
```

### Check ecosystem.config.cjs

```bash
# Validate config syntax
node -e "require('./ecosystem.config.cjs')"
```

---

## ecosystem.config.cjs Reference

File ini ada di root project:

```javascript
module.exports = {
  apps: [
    {
      name: 'kirimchat-backend',
      cwd: './apps/backend',
      script: 'dist/index.js',
      instances: 'max',              // Cluster mode (semua CPU)
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      max_memory_restart: '1G',      // Restart jika memory > 1GB
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
    },
    {
      name: 'kirimchat-frontend',
      cwd: './apps/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,                  // Next.js handles its own clustering
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
    },
  ],
};
```

---

## Summary

| Task | Command |
|------|---------|
| Start production | `pm2 start ecosystem.config.cjs --env production` |
| View status | `pm2 status` |
| View logs | `pm2 logs` |
| Reload (zero-downtime) | `pm2 reload all` |
| Monitor | `pm2 monit` |
| Stop all | `pm2 stop all` |
| Setup auto-start | `pm2 startup && pm2 save` |

---

**PM2 Monorepo deployment complete!**

Related guides:
- Database setup: [02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md)
- Frontend only (Cloudflare): [03-FRONTEND-DEPLOYMENT.md](03-FRONTEND-DEPLOYMENT.md)
- Docker deployment: [04-OPSIONAL-BUILD-AND-PUSH.md](04-OPSIONAL-BUILD-AND-PUSH.md)
