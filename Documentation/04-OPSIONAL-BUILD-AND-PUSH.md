# Build & Push Docker Image - KirimChat (Backend + Frontend)

> **CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **CRITICAL: KEEP EVERYTHING PRIVATE!**
>
> - DO NOT make your GitHub repository PUBLIC
> - DO NOT make your Docker image PUBLIC on GHCR
> - DO NOT share source code with unauthorized persons
> - DO NOT fork to public repositories
> - ALWAYS keep repository PRIVATE
> - ALWAYS keep GHCR packages PRIVATE
> - ONLY share with authorized team members
>
> This is proprietary software. Unauthorized distribution is prohibited.

---

Panduan lengkap untuk fork repository, build Docker image (backend + frontend), dan push ke GitHub Container Registry (GHCR) Anda sendiri.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Fork Repository](#fork-repository)
3. [Setup GitHub Container Registry](#setup-github-container-registry)
4. [Build & Push Backend Image](#build--push-backend-image)
5. [Build & Push Frontend Image](#build--push-frontend-image)
6. [Update docker-compose.yml](#update-docker-composeyml)
7. [Sync Update dari Upstream](#sync-update-dari-upstream)
8. [Automated Build dengan GitHub Actions](#automated-build-dengan-github-actions)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub account
- Docker installed locally
- Git installed
- GitHub Personal Access Token (PAT) dengan permissions:
  - `read:packages`
  - `write:packages`
  - `delete:packages` (optional)

---

## Fork Repository

### Step 1: Fork (KEEP PRIVATE!)

> **IMPORTANT: Fork HARUS tetap PRIVATE!**

1. Buka https://github.com/tech-provider/kirimchat
2. Klik **Fork**
3. **CRITICAL:** Pastikan fork di-set **PRIVATE** (bukan public!)
4. Clone fork Anda:

```bash
git clone https://github.com/YOUR_USERNAME/kirimchat.git
cd kirimchat
```

### Step 2: Tambah Upstream Remote

Untuk bisa sync update dari repo utama:

```bash
# Tambah upstream remote
git remote add upstream https://github.com/tech-provider/kirimchat.git

# Verify remotes
git remote -v
# origin    https://github.com/YOUR_USERNAME/kirimchat.git (fetch)
# origin    https://github.com/YOUR_USERNAME/kirimchat.git (push)
# upstream  https://github.com/tech-provider/kirimchat.git (fetch)
# upstream  https://github.com/tech-provider/kirimchat.git (push)
```

---

## Setup GitHub Container Registry

### Step 3: Buat Personal Access Token (PAT)

1. Login ke GitHub
2. Buka **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
3. Klik **Generate new token (classic)**
4. Isi:
   - Note: `GHCR Push Access for KirimChat`
   - Expiration: sesuai kebutuhan
   - Scopes:
     - `read:packages`
     - `write:packages`
     - `delete:packages` (optional)
5. Klik **Generate token**
6. **COPY dan SIMPAN TOKEN** - tidak bisa dilihat lagi!

### Step 4: Login ke GHCR

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Output yang diharapkan:
```
Login Succeeded
```

---

## Build & Push Backend Image

### Step 5: Build Backend

```bash
# Pastikan di root project
cd kirimchat

# Build image
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .
```

Build akan memakan waktu ~2-3 menit. Image size ~456MB.

### Step 6: Push Backend ke GHCR

```bash
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest
```

### Verify di GitHub

1. Buka profil GitHub Anda > tab **Packages**
2. Pastikan `kirimchat-backend` muncul
3. **CRITICAL:** Klik package > **Package settings** > pastikan visibility **PRIVATE**

---

## Build & Push Frontend Image

Frontend menggunakan multi-stage build dengan Next.js standalone output.

### Step 7: Build Frontend

```bash
# Pastikan di root project
cd kirimchat

# Build dengan build args untuk environment variables
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -t ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest \
  -f apps/frontend/Dockerfile .
```

> **PENTING:** Ganti `api.yourdomain.com` dan `yourdomain.com` dengan domain Anda yang sebenarnya. Environment variables ini di-embed saat build karena Next.js memerlukannya pada build time.

### Step 8: Push Frontend ke GHCR

```bash
docker push ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest
```

### Verify di GitHub

1. Buka profil GitHub Anda > tab **Packages**
2. Pastikan `kirimchat-frontend` muncul
3. **CRITICAL:** Pastikan visibility **PRIVATE**

---

## Update docker-compose.yml

### Step 9: Gunakan Image Anda

Update `docker-compose.yml` di server deployment:

**Sebelum (image lama):**
```yaml
services:
  backend:
    image: ghcr.io/tech-provider/kirimchat-backend:latest

  frontend:
    image: ghcr.io/tech-provider/kirimchat-frontend:latest
```

**Sesudah (image Anda):**
```yaml
services:
  backend:
    image: ghcr.io/YOUR_USERNAME/kirimchat-backend:latest

  frontend:
    image: ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest
```

### Step 10: Deploy

```bash
# Login GHCR di server (jika belum)
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull images
docker compose pull

# Start services
docker compose up -d

# Cek logs
docker compose logs -f backend frontend
```

---

## Sync Update dari Upstream

Ketika ada update baru dari repo utama, lakukan langkah berikut untuk sync ke fork Anda, lalu rebuild image.

### Step 11: Fetch & Merge Update

```bash
# Fetch update dari upstream
git fetch upstream

# Pastikan di branch main
git checkout main

# Merge update dari upstream
git merge upstream/main
```

Jika ada **merge conflict**:
```bash
# Lihat file yang conflict
git status

# Edit file yang conflict, resolve manual
# Lalu:
git add .
git commit -m "Merge upstream updates"
```

### Step 12: Push ke Fork Anda

```bash
git push origin main
```

### Step 13: Rebuild & Push Images

```bash
# Rebuild backend
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest

# Rebuild frontend (ganti domain sesuai milik Anda)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -t ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest \
  -f apps/frontend/Dockerfile .
docker push ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest
```

### Step 14: Deploy Update di Server

```bash
ssh your-server
cd ~/kirimchat
docker compose pull
docker compose up -d
```

---

## Automated Build dengan GitHub Actions

### Optional: Setup CI/CD untuk Auto-Build

Buat file `.github/workflows/docker-build.yml` di fork Anda:

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io

jobs:
  build-backend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/backend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/kirimchat-backend:latest
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/kirimchat-backend:${{ github.sha }}

  build-frontend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/frontend/Dockerfile
          push: true
          build-args: |
            NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}
            NEXT_PUBLIC_APP_URL=${{ vars.NEXT_PUBLIC_APP_URL }}
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/kirimchat-frontend:latest
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/kirimchat-frontend:${{ github.sha }}
```

### Setup GitHub Actions Variables untuk Frontend

1. Buka fork repo di GitHub
2. **Settings** > **Secrets and variables** > **Actions** > tab **Variables**
3. Tambah variables:
   - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com`
   - `NEXT_PUBLIC_APP_URL` = `https://yourdomain.com`

### Cara Kerja

Setiap push ke `main`:
- Backend image otomatis di-build dan push ke GHCR
- Frontend image otomatis di-build dan push ke GHCR
- Image di-tag dengan `latest` dan commit SHA

Lalu di server tinggal:
```bash
docker compose pull
docker compose up -d
```

---

## Troubleshooting

### Build fails: "Cannot find module"

```bash
# Clean build (tanpa cache)
docker system prune -a
docker build --no-cache -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .
```

### Build fails: "COPY failed"

```bash
# Pastikan di root project (bukan di apps/backend atau apps/frontend)
pwd  # Harus: /path/to/kirimchat
ls apps/backend/Dockerfile   # Harus ada
ls apps/frontend/Dockerfile  # Harus ada
```

### Push fails: "denied: permission_denied"

```bash
# Token harus punya scope write:packages
# Re-login dengan token yang benar
docker logout ghcr.io
echo "NEW_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

### Push fails: "unauthorized"

```bash
# Login dulu
docker login ghcr.io
```

### Pull gagal di server: "unauthorized"

```bash
# Login GHCR di server
ssh your-server
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
docker compose pull
```

### Frontend environment variables salah setelah deploy

Frontend Next.js embed env variables saat **build time**, bukan runtime. Jika perlu ganti domain:

```bash
# Rebuild dengan domain yang benar
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.newdomain.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://newdomain.com \
  -t ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest \
  -f apps/frontend/Dockerfile .

# Push ulang
docker push ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest

# Deploy ulang di server
docker compose pull frontend
docker compose up -d frontend
```

### Merge conflict saat sync upstream

```bash
# Lihat files yang conflict
git status

# Option 1: Resolve manual
# Edit file, hapus conflict markers (<<<<, ====, >>>>), simpan
git add .
git commit -m "Resolve merge conflict"

# Option 2: Terima semua dari upstream (hati-hati, overwrite perubahan Anda)
git checkout --theirs .
git add .
git commit -m "Accept upstream changes"

# Option 3: Batalkan merge
git merge --abort
```

---

## Version Tagging (Best Practice)

```bash
# Tag dengan versi
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:v1.0.0 -f apps/backend/Dockerfile .
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .

# Push kedua tag
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:v1.0.0
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest
```

Dengan version tag, Anda bisa rollback ke versi sebelumnya jika ada masalah:

```yaml
# docker-compose.yml - rollback ke versi spesifik
services:
  backend:
    image: ghcr.io/YOUR_USERNAME/kirimchat-backend:v1.0.0
```

---

## Ringkasan Perintah

```bash
# === SETUP (sekali saja) ===
git clone https://github.com/YOUR_USERNAME/kirimchat.git
cd kirimchat
git remote add upstream https://github.com/tech-provider/kirimchat.git
echo "TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# === BUILD & PUSH ===
# Backend
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest

# Frontend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -t ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest \
  -f apps/frontend/Dockerfile .
docker push ghcr.io/YOUR_USERNAME/kirimchat-frontend:latest

# === SYNC UPDATE ===
git fetch upstream
git merge upstream/main
git push origin main
# Lalu rebuild & push images di atas

# === DEPLOY DI SERVER ===
docker compose pull
docker compose up -d
```

---

Next: Deploy backend > Lihat [02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md)
