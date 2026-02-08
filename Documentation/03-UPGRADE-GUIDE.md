# 🔄 Upgrade Guide - KirimChat Backend

> **⚠️ CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> **DO NOT SHARE OR DISTRIBUTE**
>
> - ❌ DO NOT make repository PUBLIC
> - ❌ DO NOT share source code
> - ❌ DO NOT publish Docker images publicly
> - ✅ Keep everything PRIVATE
> - ✅ Only authorized access
>
> This is proprietary software. Unauthorized distribution is prohibited.

---

Panduan untuk upgrade backend ke versi terbaru dengan aman.

## 🛡️ Data Safety

**PENTING:** Setup kami dirancang untuk **AMAN** dan **TIDAK AKAN MENGHAPUS DATA** yang sudah ada.

### Bagaimana Cara Kerjanya?

Saat container start, entrypoint script akan:

1. ✅ Check apakah database sudah punya tables
2. ✅ Jika **sudah ada tables** → Skip schema push (data aman!)
3. ✅ Jika **database kosong** → Create schema (first-time setup)
4. ✅ Start backend server

### Contoh Output

**First-time deployment:**
```
🔍 Checking database status...
🔄 First-time setup: Creating database schema...
✅ Database schema created successfully!
🚀 Starting backend server...
```

**Existing deployment (upgrade):**
```
🔍 Checking database status...
✅ Database already initialized with 45 tables
⚠️  Skipping schema push to preserve existing data
🚀 Starting backend server...
```

## 📦 Upgrade Steps

### 1. Backup Database (Recommended)

Selalu backup sebelum upgrade:

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres kirimchat > backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh backup-*.sql
```

### 2. Pull Latest Image

```bash
# Pull image terbaru
docker compose pull backend

# Check image version
docker images | grep kirimchat-backend
```

### 3. Restart Backend

```bash
# Restart dengan image baru
docker compose up -d backend

# Monitor logs
docker compose logs -f backend
```

### 4. Verify

```bash
# Check health
curl http://localhost:3005/health

# Check logs untuk errors
docker compose logs backend | grep -i error
```

## 🔧 Schema Changes

Jika ada perubahan schema (new tables, columns, etc):

### Option 1: Manual Schema Update (Recommended)

```bash
# Review schema changes first
docker compose exec backend npx prisma db push --help

# Apply schema changes (safe, preserves data)
docker compose exec backend npx prisma db push

# Restart backend
docker compose restart backend
```

### Option 2: Using Migrations (Advanced)

Jika Anda punya migration files:

```bash
# Apply migrations
docker compose exec backend npx prisma migrate deploy

# Restart backend
docker compose restart backend
```

## ⚠️ Breaking Changes

Jika ada breaking changes di schema yang butuh data migration:

### 1. Stop Backend
```bash
docker compose stop backend
```

### 2. Backup Database
```bash
docker compose exec postgres pg_dump -U postgres kirimchat > backup-before-migration.sql
```

### 3. Run Custom Migration Script
```bash
# Connect to database
docker compose exec postgres psql -U postgres -d kirimchat

# Run your custom SQL migration
-- Your migration SQL here
```

### 4. Update Schema
```bash
docker compose exec backend npx prisma db push
```

### 5. Start Backend
```bash
docker compose up -d backend
```

## 🔄 Rollback

Jika ada masalah setelah upgrade:

### 1. Stop Services
```bash
docker compose down
```

### 2. Restore Database
```bash
# Restore from backup
cat backup-YYYYMMDD-HHMMSS.sql | docker compose exec -T postgres psql -U postgres kirimchat
```

### 3. Use Previous Image
```bash
# Edit docker-compose.yml, specify previous version
# image: ghcr.io/orif1n/kirimchat-backend:v1.0.0

# Start with old image
docker compose up -d
```

## 📋 Upgrade Checklist

Before upgrading:
- [ ] Backup database
- [ ] Check release notes for breaking changes
- [ ] Test in staging environment (if available)
- [ ] Schedule maintenance window
- [ ] Notify users (if applicable)

After upgrading:
- [ ] Verify health endpoint
- [ ] Check logs for errors
- [ ] Test critical features
- [ ] Monitor for 24 hours
- [ ] Keep backup for 7 days

## 🆘 Troubleshooting

### Backend won't start after upgrade

```bash
# Check logs
docker compose logs backend

# Check database connection
docker compose exec backend npx prisma db execute --stdin <<< "SELECT 1"

# Try manual schema push
docker compose exec backend npx prisma db push
```

### Schema mismatch errors

```bash
# Regenerate Prisma Client
docker compose exec backend npx prisma generate

# Push schema
docker compose exec backend npx prisma db push

# Restart
docker compose restart backend
```

### Data loss concerns

**Don't worry!** Our setup is designed to be safe:
- ✅ `prisma db push` preserves existing data
- ✅ Only adds new tables/columns
- ✅ Never drops tables automatically
- ✅ Requires explicit `--accept-data-loss` for destructive changes

## 📞 Support

Jika ada masalah:
1. Check logs: `docker compose logs backend`
2. Hubungi admin
3. Restore from backup jika perlu

## 🔐 Best Practices

1. **Always backup** before upgrading
2. **Test in staging** if possible
3. **Read release notes** for breaking changes
4. **Monitor logs** after upgrade
5. **Keep backups** for at least 7 days
6. **Schedule upgrades** during low-traffic periods

---

**Remember:** Your data is safe! The entrypoint script automatically detects existing databases and skips schema push to preserve your data. 🛡️