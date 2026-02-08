# 🚀 Panduan Update KirimChat

Panduan ini menjelaskan cara update KirimChat ke versi terbaru dengan **mudah dan aman**.

---

## ⚡ CARA CEPAT (Direkomendasikan)

**Website tetap online selama proses update!**

### Langkah 1: Backup Dulu (Penting!)

```bash
cd ~/kirimchat-v1.x.x
./backup.sh
```

> 💡 **Kenapa backup?** Kalau ada masalah, kamu bisa restore data lama.

---

### Langkah 2: Upload File Update

Upload file `kirimchat-v1.x.x.zip` (versi baru) ke server kamu.

**Cara upload:**
- Gunakan FileZilla, WinSCP, atau aplikasi SFTP lainnya
- Upload ke folder home (`~` atau `/root`)

---

### Langkah 3: Extract File

```bash
cd ~
unzip kirimchat-v1.x.x.zip
```

> 📝 Ganti `v1.x.x` dengan nomor versi yang kamu download, contoh: `kirimchat-v1.4.0.zip`

---

### Langkah 4: Copy File Baru

```bash
# Hapus folder apps lama
rm -rf ~/kirimchat-v1.x.x/apps

# Copy file-file baru
cp -r ~/kirimchat-v1.4.0/apps ~/kirimchat-v1.x.x/
cp ~/kirimchat-v1.4.0/VERSION ~/kirimchat-v1.x.x/
cp ~/kirimchat-v1.4.0/CHANGELOG.md ~/kirimchat-v1.x.x/
cp ~/kirimchat-v1.4.0/*.sh ~/kirimchat-v1.x.x/
chmod +x ~/kirimchat-v1.x.x/*.sh
```

> ⚠️ **PENTING:** Jangan copy folder `docker/` karena akan menimpa konfigurasi `.env` kamu!

---

### Langkah 5: Jalankan Update

```bash
cd ~/kirimchat-v1.x.x
./update-live.sh
```

**Tunggu sampai selesai.** Proses ini akan:
- ✅ Build ulang frontend & backend
- ✅ Restart container satu per satu
- ✅ Website tetap online selama proses

---

### Langkah 6: Cek Hasil

```bash
./status.sh
cat VERSION
```

Pastikan:
- Semua container berstatus `Up` atau `healthy`
- Versi sudah berubah ke yang baru

---

### Langkah 7: Bersih-Bersih

```bash
rm -rf ~/kirimchat-v1.4.0
rm ~/kirimchat-v1.4.0.zip
```

---

## 🎯 Opsi Update Sebagian

Kamu bisa update **frontend saja** atau **backend saja**:

```bash
# Update frontend saja
./update-live.sh frontend

# Update backend saja
./update-live.sh backend
```

---

## 🔄 Metode Alternatif (Ada Downtime)

Gunakan ini jika metode cepat bermasalah. **Website akan offline sementara.**

```bash
cd ~/kirimchat-v1.x.x
./update.sh
```

---

## ❌ Kalau Ada Masalah?

### 1. Cek Log Error

```bash
./logs.sh frontend
./logs.sh backend
```

### 2. Restore Backup

Kalau update gagal dan website error:

```bash
./restore.sh
```

Ini akan mengembalikan semua ke kondisi sebelum update.

### 3. Hubungi Support

Jika masih bermasalah, hubungi tim support dengan informasi:
- Versi sebelumnya dan versi yang di-update
- Pesan error yang muncul
- Output dari `./status.sh`

---

## 📋 Checklist Sebelum Update

- [ ] Sudah backup database? (`./backup.sh`)
- [ ] Sudah upload file ZIP versi baru?
- [ ] Sudah baca CHANGELOG.md untuk tahu perubahan apa saja?
- [ ] Website sedang tidak dalam traffic tinggi?

---

## 💡 Tips

1. **Selalu backup** sebelum update
2. **Gunakan `update-live.sh`** untuk menghindari downtime
3. **Jangan copy folder `docker/`** saat update manual
4. **Cek status** setelah update selesai
5. **Simpan file backup** di tempat aman (Google Drive, dsb)

---

## 📚 File Penting

| File | Fungsi |
|------|--------|
| `update-live.sh` | Update tanpa downtime (RECOMMENDED) |
| `update.sh` | Update dengan restart semua container |
| `backup.sh` | Buat backup database |
| `restore.sh` | Restore dari backup |
| `status.sh` | Cek status semua container |
| `logs.sh` | Lihat log container |
| `VERSION` | File berisi nomor versi saat ini |
| `CHANGELOG.md` | Daftar perubahan tiap versi |

---

**Selamat meng-update! 🎉**
