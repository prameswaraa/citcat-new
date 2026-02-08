# KirimChat - White Label WhatsApp Business Platform

> **⚠️ CONFIDENTIAL - PRIVATE SOURCE CODE**
> 
> This is proprietary software. Unauthorized sharing or distribution is strictly prohibited.

---

## 📌 Version Info

Lihat file berikut untuk informasi versi:
- **`VERSION`** - Nomor versi saat ini
- **`CHANGELOG.md`** - Daftar perubahan dan fitur baru
- **`CONFIGURATION.md`** - Panduan konfigurasi (Google OAuth, SMTP, dll)
- **`LICENSE-TERMS.md`** - Syarat dan ketentuan penggunaan
- **`TROUBLESHOOTING.md`** - Panduan troubleshooting masalah umum

---

## 🚀 Quick Install (One-Click)

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |
| **RAM** | 2GB | 4GB+ |
| **Disk** | 10GB | 20GB+ |
| **CPU** | 1 vCPU | 2 vCPU+ |

**Juga diperlukan:**
- Domain yang sudah pointing ke IP server (A record)
- Port 80 dan 443 tersedia (tidak dipakai Nginx/Apache)

---

## 📋 Step-by-Step Installation

### Step 1: Persiapan Server (Fresh VPS)

Login ke VPS sebagai root atau user dengan sudo:

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install tools yang diperlukan
sudo apt install -y curl wget unzip
```

### Step 2: Install Docker

```bash
# Install Docker dengan script resmi
curl -fsSL https://get.docker.com | sh

# Tambahkan user saat ini ke group docker (agar tidak perlu sudo)
sudo usermod -aG docker $USER

# PENTING: Logout dan login kembali agar group docker aktif
exit
```

**Login kembali ke VPS**, lalu verifikasi Docker:

```bash
# Cek Docker sudah terinstall
docker --version
# Output: Docker version 24.x.x atau lebih baru

# Cek Docker Compose
docker compose version
# Output: Docker Compose version v2.x.x

# Test Docker berjalan
docker run hello-world
```

### Step 3: Siapkan Domain

Pastikan domain sudah pointing ke IP server:

```bash
# Cek IP server
curl ifconfig.me

# Cek DNS domain (ganti dengan domain kamu)
dig +short app.yourdomain.com
# Output harus sama dengan IP server
```

> **Catatan:** DNS propagation bisa memakan waktu 5-30 menit. Pastikan domain sudah resolve ke IP server sebelum lanjut.

### Step 4: Upload dan Extract

Upload file `kirimchat-v*.zip` ke server, lalu extract:

```bash
# Pindah ke home directory
cd ~

# Extract ZIP (ganti nama file sesuai versi)
unzip kirimchat-v1.0.0.zip

# Masuk ke folder
cd kirimchat-v1.0.0

# Set ownership (PENTING!)
sudo chown -R $USER:$USER .

# Buat semua script executable
chmod +x *.sh
```

### Step 5: Jalankan Installer

```bash
./install.sh
```

Installer akan menanyakan:
1. **Domain** - Contoh: `app.yourdomain.com`
2. **Email** - Untuk SSL certificate (Let's Encrypt)

Kemudian installer akan otomatis:
- ✅ Generate secure secrets
- ✅ Build Docker images (~5-10 menit)
- ✅ Start semua services
- ✅ Setup SSL certificate

### Step 6: Buat Admin User

Setelah instalasi selesai:

```bash
./create-admin.sh
```

Masukkan email dan password untuk akun admin.

### Step 7: Akses Aplikasi

Buka browser dan akses:
```
https://yourdomain.com
```

Login dengan akun admin yang baru dibuat.

---

## ✅ Verifikasi Instalasi

Cek status semua services:

```bash
./status.sh
```

Output yang diharapkan:
```
  SERVICE              STATUS          HEALTH          UPTIME
  PostgreSQL           Running         Healthy         5m
  Redis                Running         Healthy         5m
  Backend              Running         Healthy         4m
  Frontend             Running         Healthy         3m
  Caddy (SSL)          Running         -               5m
```

Jika ada yang tidak `Running` atau `Healthy`, lihat logs:

```bash
./logs.sh
```

---

## 📦 What's Included

| Service | Description | Port Internal |
|---------|-------------|---------------|
| **Frontend** | Next.js web application | 3000 |
| **Backend** | Hono API server | 3005 |
| **PostgreSQL** | Database with pgvector | 5432 |
| **Redis** | Cache and message queue | 6379 |
| **Caddy** | Reverse proxy with auto SSL | 80, 443 |

---

## 🛠️ Management Commands

### Script Utama

| Command | Description |
|---------|-------------|
| `./install.sh` | Install KirimChat |
| `./update.sh` | Update ke versi baru (dengan downtime) |
| `./update-live.sh` | Update tanpa downtime (zero downtime) |
| `./backup.sh` | Backup database & files |
| `./restore.sh <file>` | Restore dari backup |
| `./import-db.sh <file>` | Import database dari file SQL |
| `./create-admin.sh` | Buat admin user |
| `./status.sh` | Cek status services |
| `./logs.sh` | Lihat logs |
| `./uninstall.sh` | Hapus KirimChat |

### Zero Downtime Update

Update frontend dan backend tanpa mematikan website:

```bash
# Update frontend + backend
./update-live.sh

# Update frontend saja
./update-live.sh frontend

# Update backend saja
./update-live.sh backend
```

### Logs

```bash
# Lihat semua logs
./logs.sh

# Lihat log service tertentu
./logs.sh backend
./logs.sh frontend
./logs.sh postgres

# Follow logs (real-time)
./logs.sh -f
./logs.sh backend -f
```

### Docker Commands

```bash
# Restart semua services
docker compose -f docker/docker-compose.yml restart

# Restart service tertentu
docker compose -f docker/docker-compose.yml restart backend

# Stop semua services
docker compose -f docker/docker-compose.yml down

# Start semua services
docker compose -f docker/docker-compose.yml up -d

# Rebuild dan start (setelah update code)
docker compose -f docker/docker-compose.yml up -d --build
```

---

## 🔧 Configuration

Setelah instalasi, konfigurasi tambahan bisa dilakukan via:

### 1. Admin Dashboard
Login sebagai admin, pergi ke Settings untuk konfigurasi:
- Branding (logo, nama, warna)
- SMTP Email
- Payment gateway

### 2. Environment File
Edit file environment langsung:

```bash
nano docker/.env
```

Setelah edit, restart services:

```bash
docker compose -f docker/docker-compose.yml restart
```

### 3. Panduan Konfigurasi Lengkap

Lihat `CONFIGURATION.md` untuk panduan detail:
- Google OAuth setup
- SMTP Email configuration
- Payment Gateway (Duitku)
- OpenAI integration

---

## 📁 Directory Structure

```
kirimchat/
├── apps/
│   ├── backend/          # Backend API source code
│   └── frontend/         # Frontend source code
├── docker/
│   ├── docker-compose.yml
│   ├── Caddyfile
│   └── .env              # Configuration (setelah install)
├── install.sh            # One-click installer
├── update.sh             # Update script
├── backup.sh             # Backup script
├── restore.sh            # Restore script
├── create-admin.sh       # Create admin user
├── status.sh             # Check status
├── logs.sh               # View logs
├── uninstall.sh          # Uninstall script
├── secrets.txt           # Secrets backup (setelah install)
├── VERSION               # Current version
├── CHANGELOG.md          # Changelog
├── CONFIGURATION.md      # Configuration guide
├── TROUBLESHOOTING.md    # Troubleshooting guide
└── LICENSE-TERMS.md      # License terms
```

---

## 🔒 Security Notes

1. **Backup `secrets.txt`** - Simpan di tempat aman, file ini berisi semua password
2. **Jangan share** file `docker/.env` ke siapapun
3. **Update server** secara berkala: `sudo apt update && sudo apt upgrade`
4. **Gunakan SSH key** untuk login, disable password authentication
5. **Setup firewall** - Hanya buka port yang diperlukan:
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

---

## 🔄 Backup & Restore

### Backup Otomatis

```bash
./backup.sh
```

File backup akan disimpan di folder `backups/` dengan format:
`kirimchat-backup-YYYYMMDD-HHMMSS.tar.gz`

### Restore dari Backup

```bash
./restore.sh backups/kirimchat-backup-20250115-120000.tar.gz
```

### Backup Manual Database

```bash
docker exec kirimchat-postgres pg_dump -U postgres kirimchat > backup.sql
```

---

## 🆘 Troubleshooting

### Quick Checks

```bash
# Cek status
./status.sh

# Lihat logs
./logs.sh

# Lihat log service bermasalah
./logs.sh backend
./logs.sh frontend
```

### Common Issues

#### Permission Denied saat Install
```bash
sudo chown -R $USER:$USER ~/kirimchat-v1.0.0
chmod +x *.sh
./install.sh
```

#### Docker Permission Denied
```bash
sudo usermod -aG docker $USER
# Logout dan login kembali
exit
```

#### Port Already in Use
```bash
# Cek apa yang pakai port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Stop nginx/apache jika ada
sudo systemctl stop nginx
sudo systemctl stop apache2
```

#### SSL Certificate Error
- Pastikan domain sudah pointing ke IP server
- Tunggu DNS propagation (5-30 menit)
- Cek log Caddy: `./logs.sh caddy`

#### Out of Memory saat Build
```bash
# Tambah swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

Untuk troubleshooting lengkap, lihat **`TROUBLESHOOTING.md`**

---

## 📞 Support

Hubungi provider KirimChat Anda untuk bantuan teknis.

Saat menghubungi support, sertakan:
1. Output dari `./status.sh`
2. Log error dari `./logs.sh`
3. Langkah yang sudah dicoba

---

## 📄 License

Software ini dilisensikan secara komersial. Lihat `LICENSE-TERMS.md` untuk detail.
