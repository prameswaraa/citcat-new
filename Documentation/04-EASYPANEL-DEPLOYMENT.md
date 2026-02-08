# KirimChat Backend - Easypanel Deployment Guide

Panduan lengkap untuk deploy KirimChat Backend menggunakan Easypanel.

## Daftar Isi

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Arsitektur](#arsitektur)
- [Quick Deploy](#quick-deploy)
- [Manual Deploy](#manual-deploy)
- [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
- [Setup Domain & SSL](#setup-domain--ssl)
- [Monitoring & Logs](#monitoring--logs)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

KirimChat Backend dapat di-deploy dengan mudah menggunakan Easypanel. Template yang disediakan akan membuat 3 services:

| Service | Image | Port | Deskripsi |
|---------|-------|------|-----------|
| `kirimchat-db` | `pgvector/pgvector:pg16` | 5432 | PostgreSQL 16 dengan pgvector extension |
| `kirimchat-redis` | Redis (managed) | 6379 | Redis untuk caching dan queue |
| `kirimchat-api` | `ghcr.io/orif1n/kirimchat-backend:latest` | 3005 | KirimChat Backend API |

---

## Prerequisites

Sebelum memulai, pastikan Anda memiliki:

1. **Server dengan Easypanel terinstall**
   - Minimum: 2 vCPU, 4GB RAM, 40GB SSD
   - Recommended: 4 vCPU, 8GB RAM, 80GB SSD

2. **Domain yang sudah dikonfigurasi**
   - Contoh: `api.yourdomain.com` untuk backend
   - DNS A record pointing ke IP server

3. **Akses ke repository** (untuk generate template)
   - Clone repo: `git clone https://github.com/orif1n/kichat-approved.git`

4. **Node.js terinstall** (untuk generate template)
   - Version 18+ recommended

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Easypanel                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Project: kirimchat                    ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  ││
│  │  │ kirimchat-db│  │kirimchat-   │  │  kirimchat-api  │  ││
│  │  │ PostgreSQL  │◄─┤   redis     │◄─┤   Node.js API   │  ││
│  │  │ + pgvector  │  │   Cache     │  │   Port: 3005    │  ││
│  │  │ Port: 5432  │  │ Port: 6379  │  │                 │  ││
│  │  └─────────────┘  └─────────────┘  └────────┬────────┘  ││
│  │                                              │           ││
│  │                                    ┌─────────▼─────────┐ ││
│  │                                    │  Traefik Proxy    │ ││
│  │                                    │  SSL/HTTPS        │ ││
│  │                                    └─────────┬─────────┘ ││
│  └──────────────────────────────────────────────┼───────────┘│
└─────────────────────────────────────────────────┼────────────┘
                                                  │
                                    ┌─────────────▼─────────────┐
                                    │   api.yourdomain.com      │
                                    │   (Public Access)         │
                                    └───────────────────────────┘
```

---

## Quick Deploy

### Langkah 1: Clone Repository

```bash
git clone https://github.com/orif1n/kichat-approved.git
cd kichat-approved
```

### Langkah 2: Generate Template

Jalankan script generator untuk membuat template dengan secrets yang sudah di-generate otomatis:

```bash
# Generate dengan default settings
node deploy/easypanel/generate-template.js > my-template.json

# Atau dengan custom frontend domain
node deploy/easypanel/generate-template.js --frontend=https://app.yourdomain.com > my-template.json
```

**Output di terminal:**
```
✅ Template generated successfully!

📋 Generated Secrets (save these somewhere safe):
   DB_PASSWORD: abc123...
   REDIS_PASSWORD: def456...
   JWT_SECRET: ghi789...
   BETTER_AUTH_SECRET: jkl012...
   WEBHOOK_VERIFY_TOKEN: mno345...
   WABA_TOKEN_ENCRYPTION_KEY: pqr678...

📝 Next steps:
   1. Copy the JSON output above
   2. In Easypanel: New > From Template JSON
   3. Paste and create
   4. Update SMTP and other optional settings
   5. Deploy!
```

> ⚠️ **PENTING**: Simpan secrets yang ditampilkan di tempat aman! Anda akan membutuhkannya jika perlu troubleshooting.

### Langkah 3: Buat Project di Easypanel

1. Login ke Easypanel dashboard
2. Klik **"+ New Project"**
3. Masukkan nama project: `kirimchat`
4. Klik **"Create"**

![Create Project](https://via.placeholder.com/600x300?text=Create+Project+Screenshot)

### Langkah 4: Import Template

1. Di dalam project, klik **"+ New"**
2. Pilih **"Template"**
3. Buka file `my-template.json` yang sudah di-generate
4. Copy seluruh isi file dan paste ke text area
5. Klik **"Custom"**
6. Create From Schema dan paste

![Import Template](https://via.placeholder.com/600x300?text=Import+Template+Screenshot)

### Langkah 5: Update Konfigurasi

Setelah services dibuat, Anda perlu mengupdate beberapa environment variables:

1. Klik service **"kirimchat-api"**
2. Buka tab **"Environment"**
3. Update variabel berikut:

| Variable | Nilai |
|----------|-------|
| `CORS_ALLOWED_ORIGINS` | `https://app.yourdomain.com` |
| `COOKIE_DOMAIN` | `.yourdomain.com` |
| `FRONTEND_URL` | `https://app.yourdomain.com` |
| `OAUTH_REDIRECT_URI` | `https://app.yourdomain.com/waba/callback` |
| `SMTP_HOST` | SMTP server Anda |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM_EMAIL` | `noreply@yourdomain.com` |

4. Klik **"Save"**

### Langkah 6: Deploy Services

Deploy services dengan urutan berikut:

1. **kirimchat-db** (PostgreSQL) - Klik **"Deploy"**, tunggu hingga running
2. **kirimchat-redis** (Redis) - Klik **"Deploy"**, tunggu hingga running
3. **kirimchat-api** (Backend) - Klik **"Deploy"**, tunggu hingga running

> 💡 Database akan otomatis di-migrate dan pgvector extension akan di-enable saat backend pertama kali start.

### Langkah 7: Setup Domain

1. Klik service **"kirimchat-api"**
2. Buka tab **"Domains"**
3. Klik **"+ Add Domain"**
4. Masukkan domain: `api.yourdomain.com`
5. Enable **"HTTPS"**
6. Klik **"Save"**

### Langkah 8: Verifikasi

Cek apakah backend sudah berjalan:

```bash
curl https://api.yourdomain.com/health
```

Response yang diharapkan:
```json
{"status":"ok"}
```

🎉 **Selamat! KirimChat Backend sudah berhasil di-deploy!**

---

## Manual Deploy

Jika tidak ingin menggunakan script generator, Anda bisa deploy secara manual.

### Langkah 1: Generate Secrets

Jalankan command berikut untuk generate secrets:

```bash
# Database Password (16 karakter)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Redis Password (16 karakter)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# JWT_SECRET (64 karakter hex = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# BETTER_AUTH_SECRET (64 karakter hex = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# WEBHOOK_VERIFY_TOKEN (32 karakter hex = 16 bytes)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# WABA_TOKEN_ENCRYPTION_KEY (44 karakter base64 = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Langkah 2: Buat Services Manual

#### Service 1: PostgreSQL

1. Klik **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Nama: `kirimchat-db`
3. Image: `pgvector/pgvector:pg16`
4. Password: (gunakan yang di-generate)
5. Klik **"Create"**

#### Service 2: Redis

1. Klik **"+ New"** → **"Database"** → **"Redis"**
2. Nama: `kirimchat-redis`
3. Password: (gunakan yang di-generate)
4. Klik **"Create"**

#### Service 3: Backend API

1. Klik **"+ New"** → **"App"**
2. Nama: `kirimchat-api`
3. Source: **"Docker Image"**
4. Image: `ghcr.io/orif1n/kirimchat-backend:latest`
5. Port: `3005`
6. Klik **"Create"**

### Langkah 3: Konfigurasi Environment Variables

Buka service `kirimchat-api` → tab **"Environment"** → tambahkan variabel dari file `deploy/easypanel/template.json`, ganti semua placeholder dengan nilai yang sudah di-generate.

---

## Konfigurasi Environment Variables

### Variabel Wajib

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL | Auto-configured |
| `REDIS_HOST` | Redis hostname | Auto-configured |
| `REDIS_PASSWORD` | Redis password | Auto-configured |
| `JWT_SECRET` | Secret untuk JWT token (32 bytes hex) | `abc123...` |
| `BETTER_AUTH_SECRET` | Secret untuk Better Auth (32 bytes hex) | `def456...` |
| `CORS_ALLOWED_ORIGINS` | Domain frontend yang diizinkan | `https://app.yourdomain.com` |
| `COOKIE_DOMAIN` | Domain untuk cookies | `.yourdomain.com` |
| `FRONTEND_URL` | URL frontend | `https://app.yourdomain.com` |

### Variabel SMTP (Wajib untuk Email)

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `SMTP_HOST` | SMTP server | `smtp-relay.brevo.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `your-smtp-user` |
| `SMTP_PASSWORD` | SMTP password | `your-smtp-password` |
| `SMTP_FROM_EMAIL` | Email pengirim | `noreply@yourdomain.com` |
| `SMTP_FROM_NAME` | Nama pengirim | `KirimChat` |
| `SMTP_SECURE` | Gunakan TLS | `false` |

### Variabel Meta/WhatsApp (Optional)

| Variable | Deskripsi |
|----------|-----------|
| `META_APP_ID` | Meta App ID dari Facebook Developer |
| `META_APP_SECRET` | Meta App Secret |
| `META_ACCESS_TOKEN` | Meta Access Token |
| `META_CONFIG_ID` | Embedded Signup Configuration ID |
| `WEBHOOK_VERIFY_TOKEN` | Token untuk verifikasi webhook |

### Variabel Google OAuth (Optional)

| Variable | Deskripsi |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

### Variabel Instagram (Optional)

| Variable | Deskripsi |
|----------|-----------|
| `INSTAGRAM_APP_ID` | Instagram App ID |
| `INSTAGRAM_APP_SECRET` | Instagram App Secret |
| `INSTAGRAM_REDIRECT_URI` | Callback URL untuk Instagram OAuth |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | Token verifikasi webhook Instagram |

### Variabel Payment - Duitku (Optional)

| Variable | Deskripsi |
|----------|-----------|
| `DUITKU_MERCHANT_CODE` | Merchant Code dari Duitku |
| `DUITKU_API_KEY` | API Key dari Duitku |
| `DUITKU_CALLBACK_URL` | Callback URL untuk payment notification |

### Variabel AI (Optional)

| Variable | Deskripsi |
|----------|-----------|
| `OPENAI_API_KEY` | OpenAI API Key untuk fitur AI |

---

## Setup Domain & SSL

### Menambahkan Custom Domain

1. Buka service **"kirimchat-api"**
2. Klik tab **"Domains"**
3. Klik **"+ Add Domain"**
4. Masukkan domain Anda (contoh: `api.yourdomain.com`)
5. Centang **"Enable HTTPS"**
6. Klik **"Save"**

### Konfigurasi DNS

Tambahkan A record di DNS provider Anda:

```
Type: A
Name: api
Value: <IP_SERVER_EASYPANEL>
TTL: 3600
```

### SSL Certificate

Easypanel menggunakan Let's Encrypt untuk SSL certificate. Certificate akan otomatis di-generate setelah DNS propagation selesai (biasanya 5-10 menit).

---

## Monitoring & Logs

### Melihat Logs

1. Buka service yang ingin dilihat lognya
2. Klik tab **"Logs"**
3. Logs akan ditampilkan secara real-time

### Health Check

Backend memiliki endpoint health check di `/health`:

```bash
curl https://api.yourdomain.com/health
```

### Metrics

Easypanel menyediakan metrics dasar:
- CPU Usage
- Memory Usage
- Network I/O
- Disk Usage

Buka tab **"Metrics"** pada setiap service untuk melihat.

---

## Backup & Restore

### Backup Database

#### Menggunakan Easypanel UI

1. Buka service **"kirimchat-db"**
2. Klik tab **"Backups"**
3. Klik **"Create Backup"**

#### Menggunakan Command Line

```bash
# SSH ke server
ssh root@your-server-ip

# Jalankan backup
docker exec kirimchat_kirimchat-db pg_dump -U postgres kirimchat > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# SSH ke server
ssh root@your-server-ip

# Restore dari backup
cat backup_20240101.sql | docker exec -i kirimchat_kirimchat-db psql -U postgres kirimchat
```

### Backup Redis

Redis data akan otomatis di-persist ke volume. Untuk backup manual:

```bash
docker exec kirimchat_kirimchat-redis redis-cli BGSAVE
```

---

## Troubleshooting

### Service Tidak Mau Start

**Gejala:** Service stuck di "Starting" atau restart terus-menerus.

**Solusi:**
1. Cek logs di tab **"Logs"**
2. Pastikan environment variables sudah benar
3. Pastikan service dependency (database, redis) sudah running

### Database Connection Error

**Gejala:** Error `ECONNREFUSED` atau `Connection refused`

**Solusi:**
1. Pastikan service `kirimchat-db` sudah running
2. Cek `DATABASE_URL` format: `postgresql://postgres:PASSWORD@$(PROJECT_NAME)_kirimchat-db:5432/$(PROJECT_NAME)`
3. Pastikan password database benar

### Redis Connection Error

**Gejala:** Error `Redis connection failed`

**Solusi:**
1. Pastikan service `kirimchat-redis` sudah running
2. Cek `REDIS_HOST` dan `REDIS_PASSWORD`
3. Pastikan `REDIS_TLS=false` untuk koneksi internal

### CORS Error

**Gejala:** Error `Access-Control-Allow-Origin` di browser

**Solusi:**
1. Pastikan `CORS_ALLOWED_ORIGINS` berisi domain frontend yang benar
2. Gunakan format lengkap: `https://app.yourdomain.com`
3. Jika multiple domains: `https://app.yourdomain.com,https://www.yourdomain.com`

### SSL Certificate Error

**Gejala:** Browser menampilkan "Not Secure" atau certificate error

**Solusi:**
1. Pastikan DNS sudah propagate (cek dengan `dig api.yourdomain.com`)
2. Tunggu 5-10 menit untuk Let's Encrypt generate certificate
3. Cek logs Traefik di Easypanel

### pgvector Extension Error

**Gejala:** Error `type "vector" does not exist`

**Solusi:**
1. Pastikan menggunakan image `pgvector/pgvector:pg16`
2. Extension akan otomatis di-enable saat backend start
3. Jika masih error, jalankan manual:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Prisma Binary Target Error

**Gejala:** Error `Prisma Client could not locate the Query Engine for runtime "linux-musl-openssl-3.0.x"`

**Solusi:**
Pastikan `schema.prisma` memiliki:
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

Kemudian rebuild image.

---

## FAQ

### Q: Bagaimana cara update ke versi terbaru?

**A:** 
1. Pull image terbaru: Di service `kirimchat-api`, klik **"Redeploy"**
2. Atau update image tag di environment dan deploy ulang

### Q: Apakah data akan hilang jika redeploy?

**A:** Tidak. Data disimpan di volumes yang persistent. Redeploy hanya mengupdate container.

### Q: Bagaimana cara scale horizontal?

**A:** Easypanel tidak support horizontal scaling untuk PostgreSQL. Untuk high availability, gunakan managed database service.

### Q: Berapa minimum resource yang dibutuhkan?

**A:** 
- Minimum: 2 vCPU, 4GB RAM
- Recommended: 4 vCPU, 8GB RAM
- Storage: 40GB+ SSD

### Q: Apakah bisa menggunakan external database?

**A:** Ya. Update `DATABASE_URL` dengan connection string database external Anda. Pastikan pgvector extension sudah terinstall.

### Q: Bagaimana cara mengakses database secara langsung?

**A:**
```bash
# SSH ke server
ssh root@your-server-ip

# Akses PostgreSQL
docker exec -it kirimchat_kirimchat-db psql -U postgres kirimchat
```

### Q: Apakah template ini bisa digunakan untuk production?

**A:** Ya. Template ini sudah production-ready dengan:
- Secrets auto-generated
- SSL/HTTPS enabled
- Health checks configured
- Persistent volumes

---

## Support

Jika Anda mengalami masalah atau memiliki pertanyaan:

1. Buka issue di repository
2. Sertakan:
   - Log error lengkap
   - Environment variables (tanpa secrets!)
   - Langkah reproduksi

---

## Changelog

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.0.0 | 2024-01-04 | Initial release |

