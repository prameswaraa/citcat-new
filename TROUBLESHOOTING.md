# KirimChat Troubleshooting Guide

Panduan mengatasi masalah umum saat instalasi dan operasional KirimChat.

## Daftar Isi

- [Melihat Logs](#melihat-logs)
- [Masalah Instalasi](#masalah-instalasi)
- [Masalah Container](#masalah-container)
- [Masalah Database](#masalah-database)
- [Masalah SSL/HTTPS](#masalah-sslhttps)
- [Masalah Login & Authentication](#masalah-login--authentication)
- [Masalah WhatsApp/Meta](#masalah-whatsappmeta)
- [Masalah Performance](#masalah-performance)
- [Reset & Recovery](#reset--recovery)

---

## Melihat Logs

### Lihat Semua Logs
```bash
./logs.sh
```

### Lihat Log Service Tertentu
```bash
./logs.sh backend    # Log backend saja
./logs.sh frontend   # Log frontend saja
./logs.sh postgres   # Log database saja
./logs.sh redis      # Log Redis saja
./logs.sh caddy      # Log reverse proxy saja
```

### Lihat Log Real-time (Follow)
```bash
./logs.sh -f           # Semua services
./logs.sh backend -f   # Backend saja, real-time
```

### Lihat Log Manual dengan Docker
```bash
cd /root/kirimchat
docker compose -f docker/docker-compose.yml logs -f --tail=100
docker compose -f docker/docker-compose.yml logs backend -f --tail=100
```

---

## Masalah Instalasi

### Docker Tidak Terinstall

**Gejala:** Command `docker` not found

**Solusi:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout dan login kembali
```

### Port 80/443 Sudah Dipakai

**Gejala:** Error "port is already allocated"

**Cek port yang dipakai:**
```bash
sudo lsof -i :80
sudo lsof -i :443
sudo netstat -tlnp | grep -E ':80|:443'
```

**Solusi:**
```bash
# Stop service yang memakai port (contoh: nginx, apache)
sudo systemctl stop nginx
sudo systemctl stop apache2
sudo systemctl disable nginx
sudo systemctl disable apache2
```

### Disk Space Penuh

**Gejala:** Error "no space left on device"

**Cek disk:**
```bash
df -h
```

**Bersihkan Docker:**
```bash
docker system prune -a --volumes
```

### Build Gagal - Out of Memory

**Gejala:** Build process killed, exit code 137

**Solusi:** Tambah swap memory
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Masalah Container

### Cek Status Container

```bash
./status.sh
# atau
docker compose -f docker/docker-compose.yml ps
```

### Container Tidak Start

**Gejala:** Container status "Exited" atau "Restarting"

**Langkah debugging:**
```bash
# Lihat status
docker compose -f docker/docker-compose.yml ps -a

# Lihat log container yang bermasalah
docker compose -f docker/docker-compose.yml logs backend --tail=50
docker compose -f docker/docker-compose.yml logs frontend --tail=50

# Restart container
docker compose -f docker/docker-compose.yml restart backend
```

### Backend Tidak Healthy

**Gejala:** Backend status "unhealthy"

**Cek:**
```bash
# Lihat log backend
./logs.sh backend

# Test health endpoint manual
docker exec kirimchat-backend wget -qO- http://localhost:3005/health

# Restart backend
docker compose -f docker/docker-compose.yml restart backend
```

**Kemungkinan penyebab:**
- Database belum ready
- Redis connection gagal
- Environment variable salah

### Frontend Tidak Healthy

**Gejala:** Frontend status "unhealthy"

**Cek:**
```bash
# Lihat log frontend
./logs.sh frontend

# Test manual
docker exec kirimchat-frontend wget -qO- http://localhost:3000

# Restart frontend
docker compose -f docker/docker-compose.yml restart frontend
```

### Restart Semua Services

```bash
cd /root/kirimchat
docker compose -f docker/docker-compose.yml restart
```

### Rebuild dan Restart

```bash
cd /root/kirimchat
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d
```

---

## Masalah Database

### Database Connection Error

**Gejala:** "Connection refused" atau "ECONNREFUSED"

**Cek PostgreSQL:**
```bash
# Status container
docker compose -f docker/docker-compose.yml ps postgres

# Log PostgreSQL
./logs.sh postgres

# Test koneksi
docker exec kirimchat-postgres pg_isready -U postgres
```

**Solusi:**
```bash
# Restart PostgreSQL
docker compose -f docker/docker-compose.yml restart postgres

# Tunggu healthy, lalu restart backend
sleep 10
docker compose -f docker/docker-compose.yml restart backend
```

### Migration Gagal

**Gejala:** Error saat Prisma migrate

**Cek log:**
```bash
./logs.sh backend | grep -i "prisma\|migration"
```

**Jalankan migration manual:**
```bash
docker exec -it kirimchat-backend npx prisma migrate deploy
```

### Reset Database (HATI-HATI!)

**WARNING: Ini akan menghapus semua data!**

```bash
cd /root/kirimchat

# Stop services
docker compose -f docker/docker-compose.yml down

# Hapus volume database
docker volume rm kirimchat_postgres_data

# Start ulang (database fresh)
docker compose -f docker/docker-compose.yml up -d

# Buat admin baru
./create-admin.sh
```

### Backup Database Manual

```bash
docker exec kirimchat-postgres pg_dump -U postgres kirimchat > backup.sql
```

### Restore Database Manual

```bash
cat backup.sql | docker exec -i kirimchat-postgres psql -U postgres kirimchat
```

---

## Masalah SSL/HTTPS

### SSL Tidak Bekerja

**Gejala:** Browser menampilkan "Not Secure" atau certificate error

**Cek Caddy:**
```bash
./logs.sh caddy
```

**Kemungkinan penyebab:**

1. **Domain belum pointing ke server**
   ```bash
   # Cek DNS
   nslookup yourdomain.com
   dig yourdomain.com
   ```

2. **Port 80/443 diblokir firewall**
   ```bash
   # Buka port
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. **Rate limit Let's Encrypt**
   - Tunggu 1 jam dan coba lagi
   - Cek: https://letsencrypt.org/docs/rate-limits/

**Force renew certificate:**
```bash
docker compose -f docker/docker-compose.yml restart caddy
```

### Mixed Content Warning

**Gejala:** Beberapa resource tidak load (blocked mixed content)

**Cek:** Pastikan `NEXT_PUBLIC_API_URL` menggunakan `https://`

```bash
# Cek .env
cat docker/.env | grep NEXT_PUBLIC

# Harus https, bukan http
# NEXT_PUBLIC_API_URL=https://yourdomain.com
```

---

## Masalah Login & Authentication

### Tidak Bisa Login

**Gejala:** Login gagal, error 401/403

**Cek:**
```bash
# Lihat log backend
./logs.sh backend | grep -i "auth\|login\|error"

# Pastikan JWT_SECRET dan BETTER_AUTH_SECRET sudah di-set
cat docker/.env | grep -E "JWT_SECRET|BETTER_AUTH"
```

### Session Expired Terus

**Gejala:** User logout sendiri setelah beberapa saat

**Kemungkinan penyebab:**
- Cookie domain salah
- JWT_SECRET berubah setelah restart

**Cek:**
```bash
cat docker/.env | grep COOKIE_DOMAIN
# Harus sama dengan domain tanpa https://
```

### Google OAuth Tidak Bekerja

**Gejala:** Error saat login dengan Google

**Cek konfigurasi:**
1. Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` sudah di-set
2. Di Google Cloud Console, pastikan redirect URI benar:
   - `https://yourdomain.com/api/v1/auth/callback/google`

```bash
cat docker/.env | grep GOOGLE
```

### Reset Password Admin

```bash
# Buat admin baru
./create-admin.sh
```

---

## Masalah WhatsApp/Meta

### Webhook Tidak Terima Pesan

**Cek:**
1. Pastikan Meta App sudah configured dengan benar
2. Webhook URL: `https://yourdomain.com/api/v1/webhooks/whatsapp`
3. Verify token harus sama dengan `WEBHOOK_VERIFY_TOKEN`

```bash
cat docker/.env | grep WEBHOOK_VERIFY_TOKEN
```

### Token Expired

**Gejala:** Error "OAuthException" atau "Invalid OAuth access token"

**Solusi:** Generate token baru di Meta Developer Console dan update di dashboard.

---

## Masalah Performance

### Website Lambat

**Cek resource usage:**
```bash
docker stats
```

**Cek disk I/O:**
```bash
iostat -x 1
```

**Kemungkinan solusi:**
- Upgrade VPS (RAM/CPU)
- Optimasi database dengan index
- Clear Redis cache

### Redis Memory Penuh

**Gejala:** Error "OOM command not allowed"

**Cek:**
```bash
docker exec kirimchat-redis redis-cli -a YOUR_REDIS_PASSWORD INFO memory
```

**Flush cache (hati-hati):**
```bash
docker exec kirimchat-redis redis-cli -a YOUR_REDIS_PASSWORD FLUSHALL
```

### Database Lambat

**Cek slow queries:**
```bash
docker exec kirimchat-postgres psql -U postgres kirimchat -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

---

## Reset & Recovery

### Restart Semua Services

```bash
cd /root/kirimchat
docker compose -f docker/docker-compose.yml restart
```

### Full Reset (Tanpa Hapus Data)

```bash
cd /root/kirimchat
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d
```

### Full Reset (Hapus Semua Data) - DANGER!

```bash
cd /root/kirimchat
./uninstall.sh
# Kemudian install ulang
./install.sh
```

### Restore dari Backup

```bash
./restore.sh /path/to/backup-file.tar.gz
```

---

## Mendapatkan Bantuan

Jika masalah tidak teratasi:

1. **Kumpulkan informasi:**
   ```bash
   ./status.sh > status.txt
   ./logs.sh > logs.txt 2>&1
   ```

2. **Informasi yang diperlukan:**
   - Output dari `./status.sh`
   - Log error yang relevan
   - Langkah-langkah yang sudah dicoba
   - Spesifikasi VPS (RAM, CPU, OS)

3. **Hubungi support** dengan informasi di atas.

---

## Quick Reference

| Masalah | Command |
|---------|---------|
| Lihat status | `./status.sh` |
| Lihat logs | `./logs.sh` |
| Restart semua | `docker compose -f docker/docker-compose.yml restart` |
| Restart backend | `docker compose -f docker/docker-compose.yml restart backend` |
| Rebuild semua | `docker compose -f docker/docker-compose.yml build --no-cache` |
| Buat admin | `./create-admin.sh` |
| Backup | `./backup.sh` |
| Restore | `./restore.sh <file>` |
