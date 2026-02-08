# One-Click Installer untuk White-Label Partner

> **Tanggal:** 2025-01-15  
> **Status:** Draft  
> **Tujuan:** Membuat installer yang memungkinkan partner deploy KirimChat dengan satu command

---

## 1. Overview

### Problem Statement

Partner/reseller yang membeli lisensi KirimChat mengalami kesulitan saat deployment:

- Terlalu banyak langkah manual (backend di VPS, frontend di Cloudflare)
- Environment variables yang banyak dan membingungkan
- Frontend susah di-self-host
- Troubleshooting sulit saat ada error
- Update/upgrade ribet

### Solution

**ZIP Package** yang berisi full source code + installer script. Partner cukup:

1. Download ZIP dari dashboard
2. Extract di VPS
3. Jalankan `./install.sh`
4. Jawab 2 pertanyaan (domain + email)
5. Selesai dalam 5-10 menit

---

## 2. Target User

| Aspek | Detail |
|-------|--------|
| **User** | White-label partner/reseller |
| **Skill Level** | Basic Linux (bisa SSH, extract ZIP, jalankan command) |
| **Environment** | VPS (Ubuntu/Debian) atau Self-hosted PaaS (Easypanel/Coolify) |
| **Customization** | Hanya domain (sisanya via admin dashboard) |
| **Source Code** | Partner dapat full source code |

---

## 3. Arsitektur

### 3.1 Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS Partner                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Docker Compose Stack                      ││
│  │                                                              ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ ││
│  │  │ Postgres │  │  Redis   │  │ Backend  │  │   Frontend   │ ││
│  │  │ pgvector │  │  Cache   │  │ API:3005 │  │   Next.js    │ ││
│  │  │  :5432   │  │  :6379   │  │  (Hono)  │  │    :3000     │ ││
│  │  └──────────┘  └──────────┘  └────┬─────┘  └──────┬───────┘ ││
│  │                                    │               │         ││
│  │                              ┌─────┴───────────────┴─────┐   ││
│  │                              │     Caddy (Reverse Proxy) │   ││
│  │                              │   Auto SSL + Routing      │   ││
│  │                              │         :80/:443          │   ││
│  │                              └─────────────┬─────────────┘   ││
│  └────────────────────────────────────────────┼─────────────────┘│
└───────────────────────────────────────────────┼──────────────────┘
                                                │
                              ┌─────────────────┴─────────────────┐
                              │     https://app.partner.com       │
                              └───────────────────────────────────┘
```

### 3.2 Services

| Service | Image | Port | Fungsi |
|---------|-------|------|--------|
| **postgres** | `ankane/pgvector:v0.5.1` | 5432 | Database dengan pgvector extension |
| **redis** | `redis:7-alpine` | 6379 | Cache dan message queue |
| **backend** | Build dari source | 3005 | API server (Hono + Prisma) |
| **frontend** | Build dari source | 3000 | Web UI (Next.js standalone) |
| **caddy** | `caddy:2-alpine` | 80, 443 | Reverse proxy + auto SSL |

### 3.3 Routing (Single Domain)

| Path | Target | Contoh |
|------|--------|--------|
| `/*` | Frontend | `app.partner.com/dashboard` |
| `/api/*` | Backend API | `app.partner.com/api/v1/messages` |
| `/socket.io/*` | Backend WebSocket | `app.partner.com/socket.io` |

**Keuntungan 1 domain:**
- Setup DNS lebih simpel (1 A record)
- Tidak perlu konfigurasi CORS
- Cookie sharing otomatis
- SSL certificate lebih mudah

---

## 4. Struktur ZIP Package

```
kirimchat-v1.0.0.zip
│
├── 📁 apps/
│   ├── 📁 backend/                 # Full source code backend
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── 📁 frontend/                # Full source code frontend
│       ├── src/
│       ├── app/
│       ├── Dockerfile              # [BARU] Next.js standalone
│       └── package.json
│
├── 📁 docker/
│   ├── docker-compose.yml          # [BARU] All-in-one stack
│   ├── Caddyfile                   # [BARU] Reverse proxy config
│   └── .env.example                # [BARU] Template environment
│
├── 📄 install.sh                   # [BARU] Main installer
├── 📄 update.sh                    # [BARU] Update script
├── 📄 backup.sh                    # [BARU] Backup script
├── 📄 uninstall.sh                 # [BARU] Uninstall script
│
└── 📄 README.md                    # Dokumentasi singkat
```

---

## 5. Installer Flow

### 5.1 Main Flow (`install.sh`)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ./install.sh                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  1️⃣  SYSTEM CHECK                                                │
│     ✓ Docker terinstall?                                         │
│     ✓ Docker Compose terinstall?                                 │
│     ✓ Port 80/443 available?                                     │
│     ✓ Minimum RAM 2GB?                                           │
│     ✓ Disk space 10GB+?                                          │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  2️⃣  INTERACTIVE SETUP                                           │
│     Prompt: "Masukkan domain Anda:"                              │
│     Input:  app.partner.com                                      │
│                                                                  │
│     Prompt: "Email untuk SSL certificate:"                       │
│     Input:  admin@partner.com                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  3️⃣  AUTO-GENERATE SECRETS                                       │
│     • DB_PASSWORD          = [random 32 char]                    │
│     • REDIS_PASSWORD       = [random 32 char]                    │
│     • JWT_SECRET           = [random 64 char hex]                │
│     • BETTER_AUTH_SECRET   = [random 64 char hex]                │
│     • WEBHOOK_VERIFY_TOKEN = [random 32 char hex]                │
│     • WABA_TOKEN_ENCRYPTION_KEY = [random 44 char base64]        │
│                                                                  │
│     → Generate .env file                                         │
│     → Simpan copy ke secrets.txt untuk backup                    │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  4️⃣  BUILD & DEPLOY                                              │
│     $ docker compose build                                       │
│       → Build frontend image (~3-5 min)                          │
│       → Build backend image (~2-3 min)                           │
│                                                                  │
│     $ docker compose up -d                                       │
│       → Start postgres, tunggu healthy                           │
│       → Start redis, tunggu healthy                              │
│       → Start backend (auto migration)                           │
│       → Start frontend                                           │
│       → Start caddy (auto SSL)                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  5️⃣  HEALTH CHECK                                                │
│     ✓ PostgreSQL responding?                                     │
│     ✓ Redis responding?                                          │
│     ✓ Backend /health OK?                                        │
│     ✓ Frontend accessible?                                       │
│     ✓ SSL certificate valid?                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  6️⃣  SUCCESS OUTPUT                                              │
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  ✅ KirimChat berhasil diinstall!                          ║  │
│  ╠═══════════════════════════════════════════════════════════╣  │
│  ║  🌐 URL: https://app.partner.com                           ║  │
│  ║  📁 Secrets: ./secrets.txt (BACKUP INI!)                   ║  │
│  ╠═══════════════════════════════════════════════════════════╣  │
│  ║  📝 Commands:                                              ║  │
│  ║     Lihat logs:    docker compose logs -f                  ║  │
│  ║     Restart:       docker compose restart                  ║  │
│  ║     Update:        ./update.sh                             ║  │
│  ║     Backup:        ./backup.sh                             ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Update Flow (`update.sh`)

```
./update.sh
    │
    ├── 1. Konfirmasi "Update ke versi terbaru? (y/n)"
    ├── 2. Auto backup database
    ├── 3. Stop containers
    ├── 4. Rebuild images dari source terbaru
    ├── 5. Start containers
    ├── 6. Jalankan database migration
    ├── 7. Health check
    └── ✅ Update selesai!
```

### 5.3 Backup Flow (`backup.sh`)

```
./backup.sh
    │
    ├── 1. Buat folder backups/ jika belum ada
    ├── 2. Dump PostgreSQL → backups/db_YYYY-MM-DD_HH-MM.sql
    ├── 3. Copy uploads folder → backups/uploads_YYYY-MM-DD_HH-MM/
    ├── 4. Compress ke single archive (optional)
    └── ✅ Backup tersimpan di ./backups/
```

### 5.4 Uninstall Flow (`uninstall.sh`)

```
./uninstall.sh
    │
    ├── 1. WARNING: "Ini akan menghapus semua data!"
    ├── 2. Konfirmasi "Ketik 'HAPUS' untuk konfirmasi:"
    ├── 3. Stop semua containers
    ├── 4. Hapus containers
    ├── 5. Prompt: "Hapus data database? (y/n)"
    │      └── Jika y: Hapus volumes
    └── ✅ Uninstall selesai
```

---

## 6. File-File Baru yang Perlu Dibuat

### 6.1 `apps/frontend/Dockerfile`

Next.js standalone mode untuk production:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 6.2 `docker/docker-compose.yml`

```yaml
services:
  postgres:
    image: ankane/pgvector:v0.5.1
    container_name: kirimchat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-kirimchat}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kirimchat

  redis:
    image: redis:7-alpine
    container_name: kirimchat-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - kirimchat

  backend:
    build:
      context: ../apps/backend
      dockerfile: Dockerfile
    container_name: kirimchat-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3005
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-kirimchat}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      WEBHOOK_VERIFY_TOKEN: ${WEBHOOK_VERIFY_TOKEN}
      WABA_TOKEN_ENCRYPTION_KEY: ${WABA_TOKEN_ENCRYPTION_KEY}
      FRONTEND_URL: https://${DOMAIN}
      CORS_ALLOWED_ORIGINS: https://${DOMAIN}
      COOKIE_DOMAIN: ${DOMAIN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3005/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - kirimchat

  frontend:
    build:
      context: ../apps/frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://${DOMAIN}/api
    container_name: kirimchat-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://${DOMAIN}/api
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - kirimchat

  caddy:
    image: caddy:2-alpine
    container_name: kirimchat-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    environment:
      DOMAIN: ${DOMAIN}
      EMAIL: ${SSL_EMAIL}
    depends_on:
      - frontend
      - backend
    networks:
      - kirimchat

volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:

networks:
  kirimchat:
    driver: bridge
```

### 6.3 `docker/Caddyfile`

```caddyfile
{$DOMAIN} {
    # SSL dengan email untuk Let's Encrypt
    tls {$EMAIL}

    # API routes → Backend
    handle /api/* {
        reverse_proxy backend:3005
    }

    # WebSocket → Backend
    handle /socket.io/* {
        reverse_proxy backend:3005
    }

    # Semua route lain → Frontend
    handle {
        reverse_proxy frontend:3000
    }

    # Logging
    log {
        output stdout
        format console
    }
}
```

### 6.4 `docker/.env.example`

```bash
# Domain Configuration
DOMAIN=app.example.com
SSL_EMAIL=admin@example.com

# Database
DB_NAME=kirimchat
DB_USER=postgres
DB_PASSWORD=CHANGE_ME

# Redis
REDIS_PASSWORD=CHANGE_ME

# Auth Secrets
JWT_SECRET=CHANGE_ME
BETTER_AUTH_SECRET=CHANGE_ME

# WhatsApp
WEBHOOK_VERIFY_TOKEN=CHANGE_ME
WABA_TOKEN_ENCRYPTION_KEY=CHANGE_ME

# Optional: SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=KirimChat

# Optional: Meta/WhatsApp Business
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_CONFIG_ID=

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: OpenAI
OPENAI_API_KEY=
```

### 6.5 `install.sh`

```bash
#!/bin/bash

# KirimChat One-Click Installer
# Usage: ./install.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   ${GREEN}KirimChat One-Click Installer${BLUE}                          ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# 1. SYSTEM CHECK
# ============================================================
echo -e "${YELLOW}[1/5]${NC} Checking system requirements..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found!${NC}"
    echo "   Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker installed"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found!${NC}"
    echo "   Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker Compose installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "   Please start Docker first."
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker is running"

# Check ports
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 80 is already in use!${NC}"
    echo "   Please stop the service using port 80."
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Port 80 available"

if lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 443 is already in use!${NC}"
    echo "   Please stop the service using port 443."
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Port 443 available"

# Check RAM
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 2000 ]; then
    echo -e "${YELLOW}⚠️  Warning: Less than 2GB RAM detected (${TOTAL_RAM}MB)${NC}"
    echo "   Recommended: 2GB+ RAM"
fi
echo -e "  ${GREEN}✓${NC} RAM: ${TOTAL_RAM}MB"

echo ""

# ============================================================
# 2. INTERACTIVE SETUP
# ============================================================
echo -e "${YELLOW}[2/5]${NC} Configuration setup..."
echo ""

# Get domain
while true; do
    read -p "  Enter your domain (e.g., app.yourdomain.com): " DOMAIN
    if [[ -n "$DOMAIN" ]]; then
        break
    fi
    echo -e "  ${RED}Domain cannot be empty${NC}"
done

# Get email for SSL
while true; do
    read -p "  Enter email for SSL certificate: " SSL_EMAIL
    if [[ "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        break
    fi
    echo -e "  ${RED}Please enter a valid email address${NC}"
done

echo ""
echo -e "  ${GREEN}✓${NC} Domain: ${DOMAIN}"
echo -e "  ${GREEN}✓${NC} Email: ${SSL_EMAIL}"
echo ""

# ============================================================
# 3. GENERATE SECRETS
# ============================================================
echo -e "${YELLOW}[3/5]${NC} Generating secrets..."

generate_secret() {
    openssl rand -hex $1
}

generate_base64() {
    openssl rand -base64 $1
}

DB_PASSWORD=$(generate_secret 16)
REDIS_PASSWORD=$(generate_secret 16)
JWT_SECRET=$(generate_secret 32)
BETTER_AUTH_SECRET=$(generate_secret 32)
WEBHOOK_VERIFY_TOKEN=$(generate_secret 16)
WABA_TOKEN_ENCRYPTION_KEY=$(generate_base64 32)

echo -e "  ${GREEN}✓${NC} Secrets generated"

# Create .env file
cat > docker/.env << EOF
# Generated by KirimChat Installer
# Date: $(date)

# Domain Configuration
DOMAIN=${DOMAIN}
SSL_EMAIL=${SSL_EMAIL}

# Database
DB_NAME=kirimchat
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# Auth Secrets
JWT_SECRET=${JWT_SECRET}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# WhatsApp
WEBHOOK_VERIFY_TOKEN=${WEBHOOK_VERIFY_TOKEN}
WABA_TOKEN_ENCRYPTION_KEY=${WABA_TOKEN_ENCRYPTION_KEY}

# Optional: SMTP (configure later via dashboard)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=KirimChat

# Optional: Meta/WhatsApp Business
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_CONFIG_ID=

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: OpenAI
OPENAI_API_KEY=
EOF

echo -e "  ${GREEN}✓${NC} Environment file created"

# Save secrets backup
cat > secrets.txt << EOF
╔═══════════════════════════════════════════════════════════════╗
║  KIRIMCHAT SECRETS - BACKUP THIS FILE!                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Generated: $(date)
║  Domain: ${DOMAIN}
╠═══════════════════════════════════════════════════════════════╣
║  DB_PASSWORD: ${DB_PASSWORD}
║  REDIS_PASSWORD: ${REDIS_PASSWORD}
║  JWT_SECRET: ${JWT_SECRET}
║  BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
║  WEBHOOK_VERIFY_TOKEN: ${WEBHOOK_VERIFY_TOKEN}
║  WABA_TOKEN_ENCRYPTION_KEY: ${WABA_TOKEN_ENCRYPTION_KEY}
╚═══════════════════════════════════════════════════════════════╝
EOF

echo -e "  ${GREEN}✓${NC} Secrets backup saved to secrets.txt"
echo ""

# ============================================================
# 4. BUILD & DEPLOY
# ============================================================
echo -e "${YELLOW}[4/5]${NC} Building and deploying..."
echo ""

cd docker

echo "  Building images (this may take 5-10 minutes)..."
docker compose build --no-cache

echo ""
echo "  Starting services..."
docker compose up -d

echo ""
echo "  Waiting for services to be healthy..."

# Wait for health checks
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HEALTHY=$(docker compose ps --format json | grep -c '"Health": "healthy"' || true)
    if [ "$HEALTHY" -ge 3 ]; then
        break
    fi
    echo -n "."
    sleep 5
    WAITED=$((WAITED + 5))
done
echo ""

cd ..

# ============================================================
# 5. HEALTH CHECK & SUCCESS
# ============================================================
echo -e "${YELLOW}[5/5]${NC} Verifying installation..."

# Check all services
sleep 10

BACKEND_OK=false
FRONTEND_OK=false

if curl -sf "http://localhost:3005/health" > /dev/null 2>&1; then
    BACKEND_OK=true
    echo -e "  ${GREEN}✓${NC} Backend API healthy"
else
    echo -e "  ${RED}✗${NC} Backend API not responding"
fi

if curl -sf "http://localhost:3000" > /dev/null 2>&1; then
    FRONTEND_OK=true
    echo -e "  ${GREEN}✓${NC} Frontend healthy"
else
    echo -e "  ${RED}✗${NC} Frontend not responding"
fi

echo ""

if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║   ✅ KirimChat installed successfully!                    ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║   🌐 URL: https://${DOMAIN}${NC}"
    echo -e "${GREEN}║   📁 Secrets: ./secrets.txt (BACKUP THIS!)                ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║   📝 Useful commands:                                     ║${NC}"
    echo -e "${GREEN}║      View logs:    cd docker && docker compose logs -f    ║${NC}"
    echo -e "${GREEN}║      Restart:      cd docker && docker compose restart    ║${NC}"
    echo -e "${GREEN}║      Update:       ./update.sh                            ║${NC}"
    echo -e "${GREEN}║      Backup:       ./backup.sh                            ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ⚠️  Installation completed with warnings                 ║${NC}"
    echo -e "${RED}║   Please check the logs: cd docker && docker compose logs ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
```

### 6.6 `update.sh`

```bash
#!/bin/bash

# KirimChat Update Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}KirimChat Update Script${NC}"
echo "========================"
echo ""

read -p "Update to the latest version? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Update cancelled."
    exit 0
fi

echo ""
echo "[1/5] Creating backup..."
./backup.sh

echo ""
echo "[2/5] Stopping services..."
cd docker
docker compose down

echo ""
echo "[3/5] Rebuilding images..."
docker compose build --no-cache

echo ""
echo "[4/5] Starting services..."
docker compose up -d

echo ""
echo "[5/5] Waiting for health checks..."
sleep 30

echo ""
echo -e "${GREEN}✅ Update completed!${NC}"
echo ""
docker compose ps
```

### 6.7 `backup.sh`

```bash
#!/bin/bash

# KirimChat Backup Script

set -e

GREEN='\033[0;32m'
NC='\033[0m'

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo ""
echo "KirimChat Backup Script"
echo "======================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[1/3] Backing up database..."
docker exec kirimchat-postgres pg_dump -U postgres kirimchat > "$BACKUP_DIR/db_$TIMESTAMP.sql"
echo -e "  ${GREEN}✓${NC} Database saved to $BACKUP_DIR/db_$TIMESTAMP.sql"

echo ""
echo "[2/3] Backing up uploads..."
if [ -d "./uploads" ]; then
    cp -r ./uploads "$BACKUP_DIR/uploads_$TIMESTAMP"
    echo -e "  ${GREEN}✓${NC} Uploads saved to $BACKUP_DIR/uploads_$TIMESTAMP/"
else
    echo "  No uploads directory found, skipping..."
fi

echo ""
echo "[3/3] Creating archive..."
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" \
    -C "$BACKUP_DIR" "db_$TIMESTAMP.sql" \
    $([ -d "$BACKUP_DIR/uploads_$TIMESTAMP" ] && echo "uploads_$TIMESTAMP") \
    2>/dev/null || true

# Cleanup individual files
rm -f "$BACKUP_DIR/db_$TIMESTAMP.sql"
rm -rf "$BACKUP_DIR/uploads_$TIMESTAMP"

echo ""
echo -e "${GREEN}✅ Backup completed!${NC}"
echo "   Location: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
echo ""
```

### 6.8 `uninstall.sh`

```bash
#!/bin/bash

# KirimChat Uninstall Script

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                    ⚠️  WARNING                             ║${NC}"
echo -e "${RED}║   This will stop and remove all KirimChat containers      ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Type 'UNINSTALL' to confirm: " CONFIRM
if [ "$CONFIRM" != "UNINSTALL" ]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo ""
echo "[1/3] Stopping services..."
cd docker
docker compose down

echo ""
read -p "Delete all data (database, redis)? (y/n): " DELETE_DATA
if [[ "$DELETE_DATA" == "y" || "$DELETE_DATA" == "Y" ]]; then
    echo "[2/3] Removing volumes..."
    docker compose down -v
else
    echo "[2/3] Keeping data volumes..."
fi

echo ""
echo "[3/3] Removing containers..."
docker compose rm -f

echo ""
echo -e "${YELLOW}✅ KirimChat has been uninstalled.${NC}"
echo ""
```

### 6.9 `README.md`

```markdown
# KirimChat - White Label WhatsApp Business Platform

## Quick Install

1. Extract this ZIP to your server
2. Run the installer:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. Follow the prompts (domain + email)
4. Wait 5-10 minutes
5. Access your KirimChat at `https://your-domain.com`

## Requirements

- Ubuntu 20.04+ or Debian 11+
- Docker & Docker Compose
- 2GB+ RAM
- 10GB+ disk space
- Domain pointed to your server IP

## Commands

| Command | Description |
|---------|-------------|
| `./install.sh` | Install KirimChat |
| `./update.sh` | Update to latest version |
| `./backup.sh` | Backup database & files |
| `./uninstall.sh` | Remove KirimChat |

## Logs

```bash
cd docker
docker compose logs -f          # All logs
docker compose logs -f backend  # Backend only
docker compose logs -f frontend # Frontend only
```

## Support

Contact your KirimChat provider for support.
```

---

## 7. Perubahan pada Frontend

### 7.1 Update `next.config.js`

Tambahkan output standalone:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... existing config
}

module.exports = nextConfig
```

### 7.2 Environment Variables

Frontend perlu membaca `NEXT_PUBLIC_API_URL` dari environment untuk API calls.

---

## 8. Checklist Implementasi

- [ ] Buat `apps/frontend/Dockerfile` (Next.js standalone)
- [ ] Update `next.config.js` dengan `output: 'standalone'`
- [ ] Buat folder `docker/`
- [ ] Buat `docker/docker-compose.yml`
- [ ] Buat `docker/Caddyfile`
- [ ] Buat `docker/.env.example`
- [ ] Buat `install.sh`
- [ ] Buat `update.sh`
- [ ] Buat `backup.sh`
- [ ] Buat `uninstall.sh`
- [ ] Update `README.md`
- [ ] Test full flow di fresh VPS
- [ ] Buat script untuk generate ZIP package

---

## 9. Testing Plan

### 9.1 Local Testing

1. Build images locally
2. Run docker compose
3. Verify all services healthy
4. Test API endpoints
5. Test frontend routes

### 9.2 VPS Testing

1. Provision fresh VPS (Ubuntu 22.04)
2. Install Docker
3. Upload ZIP
4. Run installer
5. Verify SSL certificate
6. Test full application

---

## 10. Future Improvements

- [ ] Auto-install Docker jika belum ada
- [ ] Support untuk restore dari backup
- [ ] Health monitoring dashboard
- [ ] Auto-update dengan cron job
- [ ] Multi-node deployment support
