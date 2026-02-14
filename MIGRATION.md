# Panduan Migrasi dari Instalasi Lama ke One-Click Installer

Panduan ini untuk user yang sudah punya KirimChat terinstall (manual/Easypanel/PM2) dan ingin migrasi ke One-Click Installer.

---

## 📋 Sebelum Mulai

### Yang Perlu Disiapkan:
- [ ] Akses ke server lama (tempat KirimChat saat ini)
- [ ] Akses ke server baru (untuk One-Click Installer)
- [ ] Domain yang sudah pointing ke IP server baru
- [ ] File `kirimchat-v*.zip` (One-Click Installer package)

### Yang Akan Dimigrasi:
- ✅ Database (semua data: users, contacts, messages, templates, dll)
- ✅ File uploads (gambar, dokumen yang diupload)
- ✅ Konfigurasi (perlu setup ulang di `.env`)

### Estimasi Waktu:
- Backup: 5-10 menit
- Install One-Click: 10-15 menit
- Import database: 5-10 menit
- Konfigurasi: 10-15 menit
- **Total: ~30-50 menit**

---

## 🔍 Step 1: Identifikasi Instalasi Lama

### Cek Tipe Instalasi

```bash
# Cek apakah pakai Docker
docker ps | grep -E "kirimchat|postgres"

# Cek apakah pakai PM2
pm2 list

# Cek apakah PostgreSQL jalan di host
systemctl status postgresql
```

### Cari Connection String Database

**Jika pakai PM2/manual:**
```bash
# Cek file .env di backend
cat ~/kirimchat/apps/backend/.env | grep DATABASE_URL
# atau
cat /var/www/kirimchat/apps/backend/.env | grep DATABASE_URL
```

**Jika pakai Docker:**
```bash
# Cek environment di container
docker exec kirimchat-backend env | grep DATABASE_URL
```

**Jika pakai Easypanel:**
- Buka Easypanel dashboard
- Pergi ke service backend
- Lihat Environment Variables → `DATABASE_URL`

### Contoh Connection String:
```
postgresql://kirimchat:password123@localhost:5432/kirimchat
postgresql://postgres:secret@postgres:5432/kirimchat
```

**Catat informasi ini:**
- Username: `kirimchat` atau `postgres`
- Password: `password123` atau sesuai
- Host: `localhost` atau nama container
- Database: `kirimchat`

---

## 💾 Step 2: Backup Database dari Server Lama

### Opsi A: PostgreSQL di Host (PM2/Manual)

```bash
# Install pg_dump jika belum ada
sudo apt install postgresql-client -y

# Cari lokasi pg_dump
find /usr -name "pg_dump" 2>/dev/null

# Backup (ganti password sesuai)
PGPASSWORD='password_kamu' /usr/bin/pg_dump -U kirimchat -h localhost -p 5432 kirimchat > backup.sql

# Atau jika user postgres
PGPASSWORD='password_kamu' /usr/bin/pg_dump -U postgres -h localhost -p 5432 kirimchat > backup.sql
```

### Opsi B: PostgreSQL di Docker

```bash
# Cek nama container PostgreSQL
docker ps | grep postgres

# Backup dari container
docker exec NAMA_CONTAINER pg_dump -U postgres kirimchat > backup.sql

# Contoh:
docker exec kirimchat-postgres pg_dump -U postgres kirimchat > backup.sql
docker exec kirimchat_postgres_1 pg_dump -U postgres kirimchat > backup.sql
```

### Opsi C: Easypanel/External PostgreSQL

```bash
# Backup dari external host
PGPASSWORD='password' pg_dump -U username -h hostname -p 5432 kirimchat > backup.sql
```

### Verifikasi Backup

```bash
# Cek ukuran file (harus > 0)
ls -lh backup.sql

# Cek isi (harus ada SQL statements)
head -50 backup.sql

# Harus terlihat seperti:
# --
# -- PostgreSQL database dump
# --
# CREATE TABLE ...
```

---

## 📂 Step 3: Backup File Uploads (Opsional)

Jika ada file yang diupload (gambar, dokumen), backup juga:

```bash
# Cari folder uploads
find / -type d -name "uploads" 2>/dev/null | grep kirimchat

# Biasanya di:
# ~/kirimchat/apps/backend/uploads
# /var/www/kirimchat/apps/backend/uploads
# /app/uploads (di Docker)

# Compress uploads folder
tar -czvf uploads_backup.tar.gz /path/to/uploads/
```

**Jika pakai Docker:**
```bash
# Copy dari container
docker cp kirimchat-backend:/app/uploads ./uploads_backup
tar -czvf uploads_backup.tar.gz uploads_backup/
```

---

## 🚀 Step 4: Setup Server Baru dengan One-Click Installer

### 4.1 Persiapan Server Baru

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install tools
sudo apt install -y curl wget unzip

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# PENTING: Logout dan login kembali
exit
```

### 4.2 Upload dan Extract

```bash
# Login kembali ke server
cd ~

# Upload kirimchat-v*.zip via SCP/SFTP

# Extract
unzip kirimchat-v1.0.0.zip
cd kirimchat-v1.0.0

# Set permission
sudo chown -R $USER:$USER .
chmod +x *.sh
```

### 4.3 Jalankan Installer

```bash
./install.sh
```

Masukkan:
- Domain baru (harus sudah pointing ke IP server baru)
- Email untuk SSL

**Tunggu sampai selesai (~10-15 menit)**

---

## 📥 Step 5: Import Database

### 5.1 Transfer Backup ke Server Baru

**Dari server lama:**
```bash
scp backup.sql user@IP_SERVER_BARU:~/kirimchat-v1.0.0/
```

**Atau dari server baru:**
```bash
scp user@IP_SERVER_LAMA:~/backup.sql ~/kirimchat-v1.0.0/
```

### 5.2 Import Database

```bash
cd ~/kirimchat-v1.0.0
./import-db.sh backup.sql
```

Ketik `IMPORT` untuk konfirmasi.

---

## 📂 Step 6: Restore Uploads (Jika Ada)

```bash
# Transfer uploads backup ke server baru
scp uploads_backup.tar.gz user@IP_SERVER_BARU:~/kirimchat-v1.0.0/

# Extract
cd ~/kirimchat-v1.0.0
tar -xzvf uploads_backup.tar.gz

# Copy ke container
docker cp uploads_backup/. kirimchat-backend:/app/uploads/

# Set permission di container
docker exec kirimchat-backend chown -R backend:nodejs /app/uploads/
```

---

## ⚙️ Step 7: Konfigurasi Tambahan

### 7.1 Copy Konfigurasi dari Server Lama

Dari `.env` lama, copy nilai-nilai berikut ke `docker/.env` di server baru:

```bash
nano docker/.env
```

**Yang perlu dicopy (jika sudah dikonfigurasi):**

```env
# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASSWORD=xxx
SMTP_FROM_EMAIL=xxx
SMTP_FROM_NAME=xxx

# Meta/WhatsApp (jika ada)
META_APP_ID=xxx
META_APP_SECRET=xxx
# META_ACCESS_TOKEN sudah DIHAPUS - setiap WABA menggunakan token OAuth sendiri (per kebijakan Meta)
META_CONFIG_ID=xxx

# Payment Gateway (jika ada)
DUITKU_MERCHANT_CODE=xxx
DUITKU_API_KEY=xxx

# OpenAI (jika ada)
OPENAI_API_KEY=xxx
```

### 7.2 Restart Services

```bash
docker compose -f docker/docker-compose.yml restart
```

### 7.3 Update Webhook URL di Meta (Jika Pakai WhatsApp)

Jika domain berubah, update webhook URL di Meta Developer Console:
- Webhook URL baru: `https://DOMAIN_BARU/api/v1/webhooks`

### 7.4 Update Google OAuth Redirect URI

Di Google Cloud Console, update Authorized redirect URIs:
- `https://DOMAIN_BARU/api/v1/auth/callback/google`

---

## ✅ Step 8: Verifikasi

### Cek Status Services

```bash
./status.sh
```

Semua harus `Running` dan `Healthy`.

### Cek Logs

```bash
./logs.sh
```

Pastikan tidak ada error.

### Test Login

1. Buka `https://domain-baru.com`
2. Login dengan akun yang ada di database lama
3. Cek data (contacts, templates, dll) sudah ada

### Test Fitur

- [ ] Login berhasil
- [ ] Dashboard tampil dengan benar
- [ ] Data contacts ada
- [ ] Data templates ada
- [ ] Kirim pesan WhatsApp (jika sudah setup)
- [ ] Upload file berfungsi

---

## 🔄 Step 9: Cutover (Pindah Domain)

Jika menggunakan domain yang sama:

### Opsi A: Langsung Pindah DNS

1. Update DNS A record ke IP server baru
2. Tunggu propagation (5-30 menit)
3. Test akses

### Opsi B: Maintenance Window

1. Stop server lama
2. Final backup dari server lama
3. Import ke server baru
4. Update DNS
5. Test

---

## 🧹 Step 10: Cleanup Server Lama

Setelah yakin migrasi berhasil (tunggu 1-7 hari):

**Jika pakai PM2:**
```bash
pm2 delete all
sudo systemctl stop postgresql
```

**Jika pakai Docker:**
```bash
docker compose down -v
docker system prune -a
```

**Jika pakai Easypanel:**
- Delete project dari Easypanel dashboard

---

## ❓ Troubleshooting Migrasi

### Error: "role kirimchat does not exist"

Database lama pakai user berbeda. Saat import, ganti owner:

```bash
# Edit backup.sql, ganti semua "kirimchat" ke "postgres"
sed -i 's/Owner: kirimchat/Owner: postgres/g' backup.sql
sed -i 's/OWNER TO kirimchat/OWNER TO postgres/g' backup.sql

# Import ulang
./import-db.sh backup.sql
```

### Error: "relation already exists"

Database tidak kosong. Reset dulu:

```bash
# Drop database manual
docker exec kirimchat-postgres psql -U postgres -c "DROP DATABASE IF EXISTS kirimchat;"
docker exec kirimchat-postgres psql -U postgres -c "CREATE DATABASE kirimchat;"

# Import ulang
./import-db.sh backup.sql
```

### Error: "password authentication failed"

Password di connection string salah. Cek ulang password di `.env` server lama.

### Login Gagal Setelah Migrasi

JWT_SECRET berbeda antara server lama dan baru. User perlu login ulang (session lama tidak valid).

### File Uploads Tidak Muncul

Pastikan uploads sudah dicopy dan permission benar:

```bash
docker exec kirimchat-backend ls -la /app/uploads/
docker exec kirimchat-backend chown -R backend:nodejs /app/uploads/
```

---

## 📞 Butuh Bantuan?

Jika mengalami masalah saat migrasi:

1. Kumpulkan informasi:
   ```bash
   ./status.sh > status.txt
   ./logs.sh > logs.txt
   ```

2. Screenshot error yang muncul

3. Hubungi support dengan informasi di atas

---

## 📋 Checklist Migrasi

```
□ Backup database dari server lama
□ Backup uploads dari server lama (jika ada)
□ Setup server baru dengan Docker
□ Jalankan install.sh
□ Transfer backup.sql ke server baru
□ Import database dengan import-db.sh
□ Restore uploads (jika ada)
□ Copy konfigurasi (Google OAuth, SMTP, dll)
□ Restart services
□ Test login dan fitur
□ Update webhook URL (jika domain berubah)
□ Update DNS (jika perlu)
□ Monitoring 1-7 hari
□ Cleanup server lama
```
