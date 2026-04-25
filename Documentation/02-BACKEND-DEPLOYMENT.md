# 🚀 Backend Deployment Guide - Citcat

> **⚠️ CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **DO NOT SHARE OR DISTRIBUTE**
>
> - ❌ DO NOT make repository PUBLIC
> - ❌ DO NOT share source code
> - ✅ Keep everything PRIVATE
> - ✅ Only authorized access
>
> This is proprietary software. Unauthorized distribution is prohibited.

---

Panduan lengkap deployment backend Citcat menggunakan **PM2** untuk aplikasi dan **Docker** untuk database (PostgreSQL + Redis).

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Setup Database dengan Docker](#setup-database-dengan-docker)
4. [Deploy Backend dengan PM2](#deploy-backend-dengan-pm2)
5. [Nginx & SSL Setup](#nginx--ssl-setup)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- VPS/Server dengan Ubuntu 20.04+ atau Debian 11+
- Domain untuk backend (e.g., api.yourdomain.com)
- Minimal 2GB RAM (recommended 4GB+)
- Minimal 10GB disk space
- Node.js 18+ dan pnpm

---

## Server Setup

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y build-essential git curl wget gnupg2
```

### Step 2: Install Node.js 20 LTS

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install pnpm
npm install -g pnpm

# Install PM2 globally
npm install -g pm2

# Verify
pnpm --version
pm2 --version
```

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Setup Database dengan Docker

### Step 4: Create Docker Compose untuk Database

```bash
# Create directory
mkdir -p ~/kirimchat-db
cd ~/kirimchat-db

# Create docker-compose.yml
nano docker-compose.yml
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:v0.5.1
    container_name: kirimchat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-your_strong_password}
      POSTGRES_DB: ${DB_NAME:-kirimchat}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kirimchat-network

  redis:
    image: redis:7-alpine
    container_name: kirimchat-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-your_redis_password} --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-your_redis_password}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kirimchat-network

volumes:
  postgres_data:
  redis_data:

networks:
  kirimchat-network:
    driver: bridge
```

### Step 5: Configure Database Environment

```bash
# Create .env file
nano .env
```

**.env:**

```env
DB_USER=postgres
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD
DB_NAME=kirimchat
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD
```

**Generate strong passwords:**
```bash
openssl rand -base64 24
```

### Step 6: Start Database Services

```bash
cd ~/kirimchat-db

# Start containers
docker compose up -d

# Verify running
docker compose ps

# Check logs
docker compose logs -f
```

**Expected output:**
```
NAME                  STATUS                   PORTS
kirimchat-postgres    Up (healthy)             127.0.0.1:5432->5432/tcp
kirimchat-redis       Up (healthy)             127.0.0.1:6379->6379/tcp
```

### Step 7: Enable pgvector Extension

```bash
# Connect ke PostgreSQL dan enable pgvector
docker compose exec postgres psql -U postgres -d kirimchat -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify
docker compose exec postgres psql -U postgres -d kirimchat -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

---

## Deploy Backend dengan PM2

### Step 8: Clone/Upload Source Code

**Option A: Clone dari Git**
```bash
cd ~
git clone https://github.com/username/kirimchat-multi.git kirimchat
cd kirimchat
```

**Option B: Upload via SCP/SFTP**
```bash
# Dari local machine:
scp -r ./kirimchat user@your-server:~/kirimchat-source
```

### Step 9: Install Dependencies

```bash
cd ~/kirimchat

# Install all dependencies (monorepo)
pnpm install
```

### Step 10: Configure Environment Variables

```bash
# Copy example env
cp apps/backend/.env.example apps/backend/.env

# Edit environment variables
nano apps/backend/.env
```

**apps/backend/.env:**

```env
# Database (sesuaikan dengan Step 5)
DATABASE_URL="postgresql://postgres:YOUR_STRONG_DB_PASSWORD@localhost:5432/kirimchat"

# JWT Secret (generate dengan: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

API_KEY_PREFIX="kc"

# Webhook header prefix for white-label (default: Citcat)
# Changes webhook headers: X-{PREFIX}-Signature, X-{PREFIX}-Event, etc.
WEBHOOK_HEADER_PREFIX="Citcat"

# Server Configuration
NODE_ENV="production"
PORT=3005

# CORS Configuration (comma-separated list of allowed origins)
CORS_ALLOWED_ORIGINS="https://citcat.id,https://www.citcat.id,https://api.citcat.id"

# Meta/WhatsApp Configuration (Opsional bisa setting nanti)
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"
META_VERIFY_TOKEN="your-meta-webhook-verify-token"
META_CONFIG_ID="your-meta-embedded-signup-config-id"

# WABA Embedded Signup Configuration
# Note: This should point to FRONTEND URL, not backend. Meta redirects here after OAuth.
OAUTH_REDIRECT_URI="https://citcat.id/waba/callback"
WEBHOOK_BASE_URL="https://api.citcat.id"
WABA_TOKEN_ENCRYPTION_KEY="base64-encoded-32-byte-key"

# Rate Limiting
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=100

# Email Configuration (Provider-Agnostic SMTP) (Opsional bisa setting nanti)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="your-smtp-login"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
SMTP_FROM_NAME="Citcat"
SMTP_SECURE=false

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=true

# File Upload Configuration
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL="info"

# Sentry (optional)
# SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"

# Redis Configuration (sesuaikan dengan Step 5)
REDIS_URL="redis://:YOUR_STRONG_REDIS_PASSWORD@localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="YOUR_STRONG_REDIS_PASSWORD"
# REDIS_TLS="true"  # Uncomment for production with TLS

# Security
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN="24h"
TWO_FACTOR_ISSUER="Citcat"

# Better Auth (generate dengan: openssl rand -base64 32)
BETTER_AUTH_SECRET="your-super-secret-better-auth-key-change-in-production"
BETTER_AUTH_URL="https://citcat.id"

# Google OAuth (wajib)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Public URL (for media links - MUST match frontend API URL)
PUBLIC_URL="https://api.citcat.id"

# AI Configuration (optional)
# OPENAI_API_KEY="your-key"

# Instagram API Configuration (optional bisa dari admin panel)
# INSTAGRAM_APP_ID="your-instagram-app-id"
# INSTAGRAM_APP_SECRET="your-instagram-app-secret"
# INSTAGRAM_REDIRECT_URI="https://api.citcat.id/api/v1/ig/auth/callback"
# INSTAGRAM_WEBHOOK_VERIFY_TOKEN="your-instagram-webhook-verify-token"

# Frontend URL (for OAuth redirects)
FRONTEND_URL="https://citcat.id"
BACKEND_URL="https://api.citcat.id
COOKIE_DOMAIN=".yourdomain.com"
```

**Generate secrets:**
```bash
# JWT Secret
openssl rand -base64 32

# Better Auth Secret
openssl rand -base64 32

# WABA Token Encryption Key (32 bytes base64)
openssl rand -base64 32
```

### Step 11: Setup Database Schema

```bash
cd ~/apps/backend

# Generate Prisma client
pnpm prisma db push

# Push schema ke database
pnpm prisma generate

```

### Step 12: Build Backend

```bash
cd ~/apps/backend

# Build backend (TypeScript → JavaScript)
pnpm build

# Verify build
ls -la apps/backend/dist/
```

### Step 13: Create Uploads & Logs Directory

```bash
mkdir -p ~/kirimchat/apps/backend/uploads
mkdir -p ~/kirimchat/apps/backend/logs
```

### Step 14: Start dengan PM2

PM2 config sudah tersedia di `apps/backend/ecosystem.config.cjs`:

```bash
cd ~/kirimchat/apps/backend

# Start aplikasi
pm2 start ecosystem.config.cjs

# Verify status
pm2 status

# View logs
pm2 logs backend

# Save PM2 process list (untuk auto-start saat reboot)
pm2 save

# Setup PM2 startup script
pm2 startup
# Ikuti instruksi yang muncul (copy dan jalankan command sudo)
```

**Verify backend running:**
```bash
# Check health endpoint
curl http://localhost:3005/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

---

## Nginx & SSL Setup

### Step 15: Install dan Configure Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Create config
sudo nano /etc/nginx/sites-available/kirimchat-backend
```

**Nginx Configuration:**

```nginx
upstream kirimchat_backend {
    server 127.0.0.1:3005;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 50M;

    # Proxy settings
    location / {
        proxy_pass http://kirimchat_backend;
        proxy_http_version 1.1;

        # WebSocket support (untuk Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://kirimchat_backend/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kirimchat-backend /etc/nginx/sites-enabled/

# Remove default (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 16: Setup SSL dengan Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Step 17: Setup Firewall

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH (IMPORTANT!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Post-Deployment

### Step 18: Create Admin User

Ada 2 cara untuk membuat user:

#### Option A: Menggunakan Script (Recommended)

```bash
cd /var/www/kirimchat/apps/backend

# Buat admin user
pnpm exec tsx scripts/create-user.ts admin@example.com SecurePass123! "Admin User" ADMIN

# Buat business owner (user biasa)
pnpm exec tsx scripts/create-user.ts user@example.com MyPass123! "John Doe" BUSINESS_OWNER

# Buat agent
pnpm exec tsx scripts/create-user.ts agent@example.com AgentPass123! "Agent Name" AGENT
```

**Available roles:** `ADMIN`, `BUSINESS_OWNER`, `AGENT`

#### Option B: Update Role User yang Sudah Ada

Jika user sudah register dan ingin dijadikan admin:

```bash
cd /var/www/kirimchat/apps/backend

# Change role ke ADMIN
pnpm exec tsx scripts/change-role.ts user@example.com ADMIN
```

#### Option C: Manual via Database

```bash
# Connect ke database
docker exec -it kirimchat-postgres psql -U postgres -d kirimchat

# Di dalam psql, update user role:
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';

# Verify
SELECT email, name, role FROM "User" WHERE email = 'your-email@example.com';

# Exit
\q
```

### Step 19: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs backend --lines 50

# Test API
curl https://api.citcat.id/health
```

### Setup Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# View detailed info
pm2 show backend

# Install PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Setup Automated Backups

```bash
nano ~/backup-kirimchat.sh
```

**backup-kirimchat.sh:**

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec kirimchat-postgres pg_dump -U postgres kirimchat > $BACKUP_DIR/db-$DATE.sql

# Compress
gzip $BACKUP_DIR/db-$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db-*.sql.gz" -mtime +7 -delete

echo "Backup completed: db-$DATE.sql.gz"
```

```bash
chmod +x ~/backup-kirimchat.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-kirimchat.sh >> /home/ubuntu/backup.log 2>&1
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL container
docker compose -f ~/kirimchat-db/docker-compose.yml ps
docker compose -f ~/kirimchat-db/docker-compose.yml logs postgres

# Test connection
docker exec -it kirimchat-postgres psql -U postgres -d kirimchat -c "SELECT 1;"

# Check pgvector
docker exec -it kirimchat-postgres psql -U postgres -d kirimchat -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Redis Connection Issues

```bash
# Check Redis container
docker compose -f ~/kirimchat-db/docker-compose.yml logs redis

# Test connection
docker exec -it kirimchat-redis redis-cli -a YOUR_REDIS_PASSWORD ping
```

### PM2 Issues

```bash
# Check error logs
pm2 logs backend --err --lines 100

# Restart application
pm2 restart backend

# Check if port in use
sudo lsof -i :3005

# Delete and restart
pm2 delete backend
cd ~/kirimchat-source/apps/backend
pm2 start ecosystem.config.cjs
```

### Application Not Accessible

```bash
# Check PM2
pm2 status

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check firewall
sudo ufw status

# Check SSL
sudo certbot certificates
```

---

## 🛠️ Common Commands

### PM2 Commands

```bash
pm2 status                    # View status
pm2 logs backend              # View logs
pm2 logs backend --err        # View error logs only
pm2 restart backend           # Restart
pm2 reload backend            # Zero-downtime reload
pm2 stop backend              # Stop
pm2 delete backend            # Remove from PM2
pm2 monit                     # Monitor dashboard
```

### Update Application

```bash
cd ~/kirimchat/apps/backend

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Run migrations
pnpm prisma db push

# Rebuild
pnpm build

# Reload (zero downtime)
pm2 reload backend
```

### Database Commands

```bash
# Connect to database
docker exec -it kirimchat-postgres psql -U postgres -d kirimchat

# Backup
docker exec kirimchat-postgres pg_dump -U postgres kirimchat > backup.sql

# Restore
cat backup.sql | docker exec -i kirimchat-postgres psql -U postgres -d kirimchat
```

### Docker Database Commands

```bash
cd ~/kirimchat-db

# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart
```

### Service Management

```bash
# Nginx
sudo systemctl status nginx
sudo systemctl reload nginx
sudo systemctl restart nginx

# Docker
sudo systemctl status docker
sudo systemctl restart docker
```

---

**Backend deployment complete!** 🎉

Next: Deploy frontend → See [03-FRONTEND-DEPLOYMENT.md](03-FRONTEND-DEPLOYMENT.md)
