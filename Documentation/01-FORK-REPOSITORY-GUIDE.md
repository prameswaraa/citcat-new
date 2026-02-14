# Panduan Fork Repository & Setup GitHub Sendiri

> **CONFIDENTIAL - PRIVATE SOURCE CODE**
>
> - DO NOT make your GitHub repository PUBLIC
> - DO NOT share source code with unauthorized persons
> - ALWAYS keep repository PRIVATE
>
> This is proprietary software. Unauthorized distribution is prohibited.

---

Panduan lengkap cara download/fork source code KirimChat dari repository utama, lalu push ke GitHub pribadi Anda.

## Table of Contents

1. [Pilihan: Fork vs Download](#pilihan-fork-vs-download)
2. [Cara A: Fork Repository (Recommended)](#cara-a-fork-repository)
3. [Cara B: Download & Push ke GitHub Baru](#cara-b-download--push-ke-github-baru)
4. [Sync Update dari Repo Utama](#sync-update-dari-repo-utama)
5. [FAQ](#faq)

---

## Pilihan: Fork vs Download

| | Fork | Download & Push |
|---|---|---|
| Cara | Klik tombol Fork di GitHub | Clone lalu push ke repo baru |
| Sync update | Mudah (`git fetch upstream`) | Sama, pakai upstream remote |
| Hubungan ke repo asli | Terlihat di GitHub sebagai fork | Tidak ada hubungan di GitHub |
| Recommended | Ya | Jika tidak bisa fork (repo private) |

---

## Cara A: Fork Repository

### Step 1: Fork di GitHub

1. Buka https://github.com/tech-provider/kirimchat
2. Klik tombol **Fork** (pojok kanan atas)
3. Di halaman "Create a new fork":
   - **Owner**: pilih akun GitHub Anda
   - **Repository name**: biarkan `kirimchat` atau ganti sesuai keinginan
   - **PENTING**: Centang **Private** (pastikan BUKAN public!)
4. Klik **Create fork**

### Step 2: Clone Fork ke Lokal

```bash
git clone https://github.com/GITHUB_ANDA/kirimchat.git
cd kirimchat
```

### Step 3: Tambah Upstream Remote

Supaya bisa tarik update dari repo utama di kemudian hari:

```bash
git remote add upstream https://github.com/tech-provider/kirimchat.git
```

Cek remotes:
```bash
git remote -v
```

Output:
```
origin    https://github.com/GITHUB_ANDA/kirimchat.git (fetch)
origin    https://github.com/GITHUB_ANDA/kirimchat.git (push)
upstream  https://github.com/tech-provider/kirimchat.git (fetch)
upstream  https://github.com/tech-provider/kirimchat.git (push)
```

Selesai! Repo sudah ada di GitHub Anda.

---

## Cara B: Download & Push ke GitHub Baru

Gunakan cara ini jika tidak bisa fork langsung (misal repo private, atau ingin repo tanpa hubungan fork).

### Step 1: Buat Repository Baru di GitHub

1. Buka https://github.com/new
2. Isi:
   - **Repository name**: `kirimchat` (atau nama lain)
   - **Visibility**: **Private**
   - **JANGAN** centang "Add a README file"
   - **JANGAN** centang "Add .gitignore"
3. Klik **Create repository**

### Step 2: Clone Repo Utama

```bash
git clone https://github.com/tech-provider/kirimchat.git kirimchat
cd kirimchat
```

### Step 3: Ganti Remote Origin ke Repo Anda

```bash
# Rename remote asal jadi upstream
git remote rename origin upstream

# Tambah remote origin ke repo GitHub Anda
git remote add origin https://github.com/GITHUB_ANDA/kirimchat.git
```

### Step 4: Push ke GitHub Anda

```bash
git push -u origin main
```

Cek remotes:
```bash
git remote -v
```

Output:
```
origin    https://github.com/GITHUB_ANDA/kirimchat.git (fetch)
origin    https://github.com/GITHUB_ANDA/kirimchat.git (push)
upstream  https://github.com/tech-provider/kirimchat.git (fetch)
upstream  https://github.com/tech-provider/kirimchat.git (push)
```

Selesai! Source code sekarang ada di GitHub Anda sendiri.

---

## Sync Update dari Repo Utama

Ketika ada versi baru dari repo utama, lakukan langkah ini untuk update.

### Step 1: Fetch Update

```bash
git fetch upstream
```

### Step 2: Merge ke Branch Anda

```bash
# Pastikan di branch main
git checkout main

# Merge update dari upstream
git merge upstream/main
```

### Step 3: Jika Ada Conflict

```bash
# Lihat file yang conflict
git status

# Edit file yang conflict - hapus marker <<<<<<, ======, >>>>>>
# Simpan file, lalu:
git add .
git commit -m "Merge upstream updates"
```

Atau jika ingin terima semua perubahan dari upstream:
```bash
git checkout --theirs .
git add .
git commit -m "Accept upstream changes"
```

Atau batalkan merge:
```bash
git merge --abort
```

### Step 4: Push ke GitHub Anda

```bash
git push origin main
```

---

## FAQ

### Q: Apakah repo saya harus private?
**Ya, WAJIB private.** Source code ini bersifat proprietary dan tidak boleh dipublikasikan.

### Q: Apakah orang lain bisa lihat repo saya?
Tidak, selama repo di-set **Private**. Hanya Anda dan collaborator yang Anda undang yang bisa akses.

### Q: Bagaimana cara invite team member?
1. Buka repo di GitHub
2. **Settings** > **Collaborators** > **Add people**
3. Masukkan username GitHub mereka

### Q: Saya sudah fork, tapi mau rename repo?
1. Buka repo di GitHub
2. **Settings** > **General** > **Repository name**
3. Ganti nama, klik **Rename**
4. Update remote di lokal:
   ```bash
   git remote set-url origin https://github.com/GITHUB_ANDA/NAMA_BARU.git
   ```

### Q: `git fetch upstream` error "remote upstream does not exist"
Berarti belum menambahkan upstream. Tambahkan:
```bash
git remote add upstream https://github.com/tech-provider/kirimchat.git
```

### Q: `git push` minta username/password?
GitHub sudah tidak support password. Gunakan salah satu:

**Option 1: Personal Access Token**
1. Buat token di GitHub > Settings > Developer settings > Personal access tokens
2. Gunakan token sebagai password saat `git push`

**Option 2: SSH Key (recommended)**
1. Generate SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "email@anda.com"
   ```
2. Copy public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Tambahkan di GitHub > Settings > SSH and GPG keys > New SSH key
4. Ganti remote ke SSH:
   ```bash
   git remote set-url origin git@github.com:GITHUB_ANDA/kirimchat.git
   ```

### Q: Setelah fork, langkah selanjutnya apa?
Lanjut ke panduan berikutnya sesuai kebutuhan:
- Deploy backend: [02-BACKEND-DEPLOYMENT.md](02-BACKEND-DEPLOYMENT.md)
- Deploy frontend: [03-FRONTEND-DEPLOYMENT.md](03-FRONTEND-DEPLOYMENT.md)
- Build Docker image sendiri (opsional): [04-OPSIONAL-BUILD-AND-PUSH.md](04-OPSIONAL-BUILD-AND-PUSH.md)
- Deploy via Easypanel (opsional): [05-OPSIONAL-EASYPANEL-DEPLOYMENT.md](05-OPSIONAL-EASYPANEL-DEPLOYMENT.md)

---

## Ringkasan Perintah

### Fork (Cara A)
```bash
# Clone fork
git clone https://github.com/GITHUB_ANDA/kirimchat.git
cd kirimchat

# Tambah upstream
git remote add upstream https://github.com/tech-provider/kirimchat.git
```

### Download & Push (Cara B)
```bash
# Clone repo utama
git clone https://github.com/tech-provider/kirimchat.git kirimchat
cd kirimchat

# Setup remotes
git remote rename origin upstream
git remote add origin https://github.com/GITHUB_ANDA/kirimchat.git

# Push ke GitHub Anda
git push -u origin main
```

### Sync Update
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```
