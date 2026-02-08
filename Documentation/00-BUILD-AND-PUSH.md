# 🏗️ Build & Push Docker Image - KirimChat Backend

> **⚠️ CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **CRITICAL: KEEP EVERYTHING PRIVATE!**
>
> - ❌ **DO NOT** make your GitHub repository PUBLIC
> - ❌ **DO NOT** make your Docker image PUBLIC on GHCR
> - ❌ **DO NOT** share source code with unauthorized persons
> - ❌ **DO NOT** fork to public repositories
> - ✅ **ALWAYS** keep repository PRIVATE
> - ✅ **ALWAYS** keep GHCR packages PRIVATE
> - ✅ **ONLY** share with authorized team members
>
> This is proprietary software. Unauthorized distribution is prohibited.

---

Panduan untuk build Docker image sendiri dan push ke GitHub Container Registry (GHCR) Anda.
Bisa skip bagian ini ya, langsung ke no 1 dan 2 saja

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup GitHub Container Registry](#setup-github-container-registry)
3. [Build Docker Image](#build-docker-image)
4. [Push to GHCR](#push-to-ghcr)
5. [Update docker-compose.yml](#update-docker-composeyml)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub account
- Docker installed locally
- Git repository (fork dari kichat-approved)
- GitHub Personal Access Token dengan permissions:
  - `read:packages`
  - `write:packages`
  - `delete:packages` (optional)

---

## Setup GitHub Container Registry

### Step 1: Fork Repository (KEEP PRIVATE!)

> **⚠️ IMPORTANT: Your fork MUST remain PRIVATE!**

1. Go to https://github.com/orif1n/kichat-approved
2. Click **Fork** button
3. **CRITICAL:** Ensure fork is set to **PRIVATE** (not public!)
4. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/kichat-approved.git
cd kichat-approved
```

### Step 2: Create GitHub Personal Access Token

1. **Go to GitHub Settings:**
   - Login ke GitHub
   - Klik profile picture → **Settings**
   - Scroll ke bawah → **Developer settings**
   - Klik **Personal access tokens** → **Tokens (classic)**

2. **Generate New Token:**
   - Klik **Generate new token** → **Generate new token (classic)**
   - Note: `GHCR Push Access for KirimChat`
   - Expiration: `No expiration` atau sesuai kebutuhan
   - Select scopes:
     - ✅ `read:packages` - Download packages
     - ✅ `write:packages` - Upload packages
     - ✅ `delete:packages` - Delete packages (optional)
   - Klik **Generate token**
   - **COPY TOKEN** - Simpan di tempat aman!

### Step 3: Login to GHCR

```bash
# Login menggunakan Personal Access Token
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Contoh:
# echo "ghp_xxxxxxxxxxxxxxxxxxxx" | docker login ghcr.io -u johndoe --password-stdin
```

**Expected output:**
```
Login Succeeded
```

---

## Build Docker Image

### Step 4: Build Image Locally

```bash
# Navigate to project root
cd kichat-approved

# Build image dengan tag
docker build -t ghcr.io/YOUR_GITHUB_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .

# Contoh:
# docker build -t ghcr.io/johndoe/kirimchat-backend:latest -f apps/backend/Dockerfile .
```

**Build process akan:**
- Install dependencies
- Build TypeScript code
- Create optimized production image
- Size: ~456MB

**Expected output:**
```
[+] Building 120.5s (18/18) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 1.23kB
 => [internal] load .dockerignore
 => [internal] load metadata for docker.io/library/node:20-alpine
 ...
 => => naming to ghcr.io/johndoe/kirimchat-backend:latest
```

### Step 5: Test Image Locally (Optional)

```bash
# Run container untuk test
docker run -d \
  --name test-backend \
  -p 3005:3005 \
  -e DATABASE_URL="postgresql://user:pass@localhost:5432/db" \
  -e REDIS_HOST="localhost" \
  ghcr.io/YOUR_GITHUB_USERNAME/kirimchat-backend:latest

# Check logs
docker logs test-backend

# Stop and remove
docker stop test-backend
docker rm test-backend
```

---

## Push to GHCR

### Step 6: Push Image to GHCR

```bash
# Push image ke GitHub Container Registry
docker push ghcr.io/YOUR_GITHUB_USERNAME/kirimchat-backend:latest

# Contoh:
# docker push ghcr.io/johndoe/kirimchat-backend:latest
```

**Expected output:**
```
The push refers to repository [ghcr.io/johndoe/kirimchat-backend]
5f70bf18a086: Pushed
d8d1e3e3e3e3: Pushed
...
latest: digest: sha256:abc123... size: 2841
```

### Step 7: Verify Image on GitHub

1. Go to your GitHub profile
2. Click **Packages** tab
3. You should see `kirimchat-backend` package
4. Click on package → **Package settings**
5. **CRITICAL:** Ensure visibility is set to **PRIVATE**

> **⚠️ SECURITY WARNING**
>
> **NEVER make this package PUBLIC!**
> - This contains proprietary code
> - Keep visibility as **PRIVATE** at all times
> - Only authorized team members should have access
> - Sharing publicly violates confidentiality

### Step 8: Configure Package Access (Private Only)

**To share with team members (PRIVATE access only):**

1. Go to package settings
2. Scroll to **Manage Actions access**
3. Click **Add repository** or **Add team**
4. Add only authorized collaborators
5. **DO NOT** change visibility to Public

---

## Update docker-compose.yml

### Step 9: Edit docker-compose.yml

Update `docker-compose.yml` untuk menggunakan image Anda:

```bash
nano docker-compose.yml
```

**Change this line:**
```yaml
services:
  backend:
    image: ghcr.io/orif1n/kirimchat-backend:latest  # OLD
```

**To:**
```yaml
services:
  backend:
    image: ghcr.io/YOUR_GITHUB_USERNAME/kirimchat-backend:latest  # NEW
```

**Complete example:**
```yaml
services:
  postgres:
    image: ankane/pgvector:v0.5.1
    container_name: kirimchat-postgres
    # ... rest of config

  redis:
    image: redis:7-alpine
    container_name: kirimchat-redis
    # ... rest of config

  backend:
    image: ghcr.io/johndoe/kirimchat-backend:latest  # YOUR IMAGE
    container_name: kirimchat-backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    # ... rest of config
```

### Step 10: Deploy with Your Image

```bash
# Pull your image
docker compose pull backend

# Start services
docker compose up -d

# Check logs
docker compose logs -f backend
```

---

## Automated Build with GitHub Actions

### Optional: Setup CI/CD

Create `.github/workflows/docker-build.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]
    paths:
      - 'apps/backend/**'
      - 'Dockerfile'
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/kirimchat-backend

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/backend/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

**Benefits:**
- ✅ Auto-build on every push to main
- ✅ Auto-push to GHCR
- ✅ Tagged with commit SHA
- ✅ No manual build needed

---

## Troubleshooting

### Build fails

**Error: "Cannot find module"**
```bash
# Solution: Clean build
docker system prune -a
docker build --no-cache -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .
```

**Error: "COPY failed"**
```bash
# Solution: Check you're in project root
pwd  # Should show: /path/to/kichat-approved
ls apps/backend/Dockerfile  # Should exist
```

### Push fails

**Error: "denied: permission_denied"**
```bash
# Solution: Check token permissions
# Token must have 'write:packages' scope
# Re-login with correct token
docker logout ghcr.io
echo "NEW_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

**Error: "unauthorized: authentication required"**
```bash
# Solution: Login first
docker login ghcr.io
```

### Image too large

**Optimize image size:**
```bash
# Check image size
docker images | grep kirimchat-backend

# Current size: ~456MB (already optimized)
# If larger, check:
# - Using Alpine base image
# - Multi-stage build
# - Production dependencies only
```

### Can't pull image on server

**Error: "unauthorized"**
```bash
# Solution: Login on server
ssh your-server
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
docker compose pull backend
```

---

## 🔄 Update Workflow

### When you make changes:

```bash
# 1. Make changes to code
git add .
git commit -m "Update backend"
git push origin main

# 2. Build new image
docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .

# 3. Push to GHCR
docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest

# 4. Deploy on server
ssh your-server
cd ~/kirimchat-backend
docker compose pull backend
docker compose up -d backend
```

### With GitHub Actions (Automated):

```bash
# Just push to GitHub
git add .
git commit -m "Update backend"
git push origin main

# GitHub Actions will automatically:
# - Build image
# - Push to GHCR
# - Tag with latest and commit SHA

# Then on server:
ssh your-server
cd ~/kirimchat-backend
docker compose pull backend
docker compose up -d backend
```

---

## 📝 Best Practices

1. **Version Tagging:**
   ```bash
   # Tag with version
   docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:v1.0.0 -f apps/backend/Dockerfile .
   docker build -t ghcr.io/YOUR_USERNAME/kirimchat-backend:latest -f apps/backend/Dockerfile .
   
   # Push both tags
   docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:v1.0.0
   docker push ghcr.io/YOUR_USERNAME/kirimchat-backend:latest
   ```

2. **Security:**
   - Never commit tokens to Git
   - Use GitHub Secrets for CI/CD
   - Rotate tokens regularly
   - Use minimal permissions

3. **Testing:**
   - Always test image locally before pushing
   - Use staging environment
   - Keep backups before updating

---

**Build and push complete!** 🎉

Next: Deploy backend → See [01-BACKEND-DEPLOYMENT.md](01-BACKEND-DEPLOYMENT.md)