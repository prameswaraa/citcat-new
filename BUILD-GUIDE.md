# KirimChat - Build & Distribution Guide

> **⚠️ INTERNAL USE ONLY - DO NOT SHARE**
> 
> Panduan ini untuk tim internal dalam membangun dan mendistribusikan KirimChat ke partner.

---

## 📋 Prerequisites

Pastikan development machine Anda memiliki:

- **Node.js 18+**
- **pnpm 9+** (`npm install -g pnpm`)
- **Git**
- **zip** command (Linux/Mac) atau 7-Zip (Windows)

---

## 🏗️ Build Package untuk Partner

### Quick Build

```bash
# 1. Clone/pull latest code
git pull origin main

# 2. Jalankan build script
chmod +x build-package.sh
./build-package.sh 1.0.0

# Output: dist/kirimchat-v1.0.0.zip
```

### Manual Build

Jika script tidak bekerja, build manual:

```bash
# 1. Buat folder temporary
mkdir -p dist
TIMESTAMP=$(date +%Y%m%d)
PACKAGE_NAME="kirimchat-v${TIMESTAMP}"
mkdir -p "/tmp/${PACKAGE_NAME}"

# 2. Copy files yang diperlukan
cp -r apps "/tmp/${PACKAGE_NAME}/"
cp -r docker "/tmp/${PACKAGE_NAME}/"
cp package.json pnpm-workspace.yaml "/tmp/${PACKAGE_NAME}/"
cp install.sh update.sh backup.sh uninstall.sh create-admin.sh "/tmp/${PACKAGE_NAME}/"
cp README-INSTALLER.md "/tmp/${PACKAGE_NAME}/README.md"

# 3. Cleanup
cd "/tmp/${PACKAGE_NAME}"
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".env" -type f -delete 2>/dev/null || true
find . -name ".env.local" -type f -delete 2>/dev/null || true
rm -f docker/.env  # Hanya keep .env.example

# 4. Buat ZIP
cd /tmp
zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}"
mv "${PACKAGE_NAME}.zip" ~/kirimchat/dist/

# 5. Cleanup
rm -rf "/tmp/${PACKAGE_NAME}"

echo "✅ Package created: dist/${PACKAGE_NAME}.zip"
```

---

## 📦 Isi Package

```
kirimchat-v1.0.0.zip
├── apps/
│   ├── backend/           # Source code backend (Hono + Prisma)
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   ├── docker-entrypoint.sh
│   │   └── package.json
│   │
│   └── frontend/          # Source code frontend (Next.js)
│       ├── src/
│       ├── app/
│       ├── Dockerfile
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml  # All-in-one stack
│   ├── Caddyfile           # Reverse proxy config
│   └── .env.example        # Template environment
│
├── install.sh              # One-click installer
├── update.sh               # Update script
├── backup.sh               # Backup script
├── uninstall.sh            # Uninstall script
├── create-admin.sh         # Create admin user
│
├── package.json
├── pnpm-workspace.yaml
└── README.md               # Dokumentasi untuk partner
```

---

## 🔧 Files yang Perlu Diperhatikan

### 1. Backend Dockerfile (`apps/backend/Dockerfile`)

Menggunakan **tsx runtime** (bukan compiled), sama seperti PM2:

```dockerfile
# Key points:
- FROM node:20-alpine
- npm install (all deps including tsx)
- npx prisma generate
- CMD: npx tsx src/index.ts
```

### 2. Frontend Dockerfile (`apps/frontend/Dockerfile`)

Next.js standalone build:

```dockerfile
# Key points:
- Multi-stage build
- npm install && npm run build
- output: standalone mode
- CMD: node server.js
```

### 3. Docker Compose (`docker/docker-compose.yml`)

5 services:
- `postgres` - ankane/pgvector:v0.5.1
- `redis` - redis:7-alpine
- `backend` - Build dari source
- `frontend` - Build dari source
- `caddy` - caddy:2-alpine (reverse proxy + auto SSL)

**Environment Variables penting:**
```yaml
NEXT_PUBLIC_API_URL: https://${DOMAIN}  # TANPA /api
NEXT_PUBLIC_APP_URL: https://${DOMAIN}
```

### 4. Caddyfile (`docker/Caddyfile`)

Routing:
- `/api/*` → backend:3005
- `/socket.io/*` → backend:3005
- `/webhook/*` → backend:3005
- `/health` → backend:3005
- `/*` → frontend:3000

---

## 🚀 Testing Package

### Test di Local (Docker)

```bash
# Extract package
unzip kirimchat-v1.0.0.zip
cd kirimchat-v1.0.0

# Buat test .env
cd docker
cp .env.example .env

# Edit .env - set test values
cat > .env << 'EOF'
DOMAIN=localhost
SSL_EMAIL=test@test.com
DB_NAME=kirimchat
DB_USER=postgres
DB_PASSWORD=testpassword123
REDIS_PASSWORD=testpassword123
JWT_SECRET=testsecret123456789012345678901234567890
BETTER_AUTH_SECRET=testsecret123456789012345678901234567890
WEBHOOK_VERIFY_TOKEN=testtoken123
WABA_TOKEN_ENCRYPTION_KEY=dGVzdGVuY3J5cHRpb25rZXkxMjM0NTY3ODkwMTI=
EOF

# Build dan run
docker compose build
docker compose up -d

# Check logs
docker compose logs -f
```

### Test di VPS Fresh

1. Provision VPS baru (Ubuntu 22.04, 2GB RAM)
2. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # Logout dan login lagi
   ```
3. Upload dan extract ZIP
4. Run installer:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
5. Create admin:
   ```bash
   ./create-admin.sh
   ```
6. Test akses via browser

---

## 📝 Checklist Sebelum Release

- [ ] Semua TypeScript error sudah di-handle (pakai tsx runtime)
- [ ] Backend health check berjalan (`/health`)
- [ ] Frontend bisa diakses
- [ ] Login berfungsi
- [ ] Database migration berjalan
- [ ] SSL certificate ter-generate (jika pakai domain real)
- [ ] Backup script berfungsi
- [ ] Update script berfungsi

---

## 🐛 Troubleshooting Build

### Error: TypeScript compilation failed

Backend menggunakan **tsx runtime**, bukan compiled TypeScript. Jika ada type error, itu tidak akan menghalangi runtime.

### Error: pnpm-lock.yaml not found

Frontend Dockerfile sudah diubah pakai `npm install` bukan `pnpm install --frozen-lockfile`.

### Error: Docker build cache

```bash
docker compose build --no-cache
```

### Error: Port already in use

```bash
# Check port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop nginx
sudo systemctl stop apache2
```

---

## 📤 Distribusi ke Partner

### Via Dashboard (Recommended)

1. Upload ZIP ke dashboard admin
2. Partner login dan download
3. Tercatat siapa yang download

### Via Direct Share

1. Upload ke private storage (Google Drive, S3, dll)
2. Share link ke partner
3. Pastikan link expired setelah download

### Via Email

1. Compress lagi jika perlu (ZIP dalam ZIP)
2. Attach ke email
3. Include password terpisah

---

## 🔄 Versioning

Format: `kirimchat-v{MAJOR}.{MINOR}.{PATCH}.zip`

- **MAJOR**: Breaking changes, database migration besar
- **MINOR**: Fitur baru, non-breaking
- **PATCH**: Bug fixes, security patches

Contoh:
- `kirimchat-v1.0.0.zip` - Initial release
- `kirimchat-v1.1.0.zip` - Tambah fitur Instagram
- `kirimchat-v1.1.1.zip` - Fix bug login

---

## 📞 Support

Jika partner mengalami masalah:

1. Minta mereka jalankan:
   ```bash
   cd docker && docker compose logs > logs.txt
   ```
2. Minta file `logs.txt`
3. Cek error di logs
4. Jika perlu akses langsung, minta SSH credentials

---

## 🔐 Security Notes

- **JANGAN** commit `.env` ke git
- **JANGAN** include secrets di package
- **JANGAN** share package di public
- **SELALU** generate secrets baru per instalasi
- **SELALU** remind partner untuk ganti password admin

---

**Last Updated:** 2025-01-15
