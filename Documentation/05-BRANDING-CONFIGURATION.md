# Branding Configuration Guide

Panduan untuk mengkonfigurasi branding aplikasi sesuai dengan brand Anda sendiri.

## Overview

Aplikasi ini mendukung white-label branding yang memungkinkan Anda mengubah:
- Nama aplikasi
- Logo
- API key prefix
- Email dan kontak support
- URL Terms & Privacy
- Nama package n8n untuk dokumentasi developer

## Environment Variables

### Backend (.env)

```env
# API key prefix untuk generated keys
# Contoh: "kc" menghasilkan "kc_live_xxx"
# Ubah sesuai brand Anda (e.g., "otk" untuk Otika, "myapp" untuk MyApp)
API_KEY_PREFIX=kc

# Webhook header prefix untuk white-label (default: Citcat)
# Mengubah header webhook: X-{PREFIX}-Signature, X-{PREFIX}-Event, dll
# Contoh: WEBHOOK_HEADER_PREFIX=MyBrand -> X-MyBrand-Signature
WEBHOOK_HEADER_PREFIX=Citcat
```

### Frontend (.env)

```env
# Nama aplikasi yang ditampilkan di UI, page title, dll
NEXT_PUBLIC_APP_NAME=Citcat

# API key prefix untuk placeholder di dokumentasi
# Harus sama dengan backend API_KEY_PREFIX
NEXT_PUBLIC_API_KEY_PREFIX=kc
```

### Docker (.env)

```env
# Nama aplikasi
APP_NAME=Citcat

# API key prefix
API_KEY_PREFIX=kc
```

## Admin Dashboard Configuration

Selain environment variables, Anda juga bisa mengatur branding melalui Admin Dashboard:

1. Login sebagai admin
2. Buka **Settings → Branding**
3. Konfigurasi:

### Website Branding
   - **Website Name**: Nama yang ditampilkan di seluruh aplikasi
   - **Logo URL**: URL logo aplikasi

### Support Contact
   - **Support Email**: Email untuk support
   - **Support WhatsApp**: Nomor WhatsApp support

### Legal Pages
   - **Terms URL**: Link ke halaman Terms of Service
   - **Privacy URL**: Link ke halaman Privacy Policy

### Developer Integrations
   - **n8n Package Name**: Nama NPM package yang ditampilkan di Developer Docs untuk integrasi n8n (default: `@kichat/n8n-nodes-kirimchat`)

> **Note**: Konfigurasi di Admin Dashboard akan override default dari environment variables.

## API Key Prefix

### Format API Key

API key memiliki format: `{PREFIX}_live_{RANDOM_STRING}`

Contoh:
- Default: `kc_live_abc123xyz...`
- Custom (otk): `otk_live_abc123xyz...`

### Backward Compatibility

API key dengan prefix lama (`kc_live_`) tetap valid meskipun Anda mengubah `API_KEY_PREFIX`. Ini memastikan API key yang sudah dibuat sebelumnya tetap berfungsi.

## Langkah-langkah Rebranding

### 1. Update Environment Variables

**Backend:**
```env
API_KEY_PREFIX=myapp
WEBHOOK_HEADER_PREFIX=MyApp
```

**Frontend:**
```env
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_API_KEY_PREFIX=myapp
```

### 2. Rebuild Aplikasi

```bash
# Dari root monorepo
# Build semua (frontend + backend)
pnpm build

# Atau build terpisah:
pnpm --filter frontend build
pnpm --filter backend build

# Restart services setelah build
pm2 restart all
# atau jika pakai docker:
docker compose restart
```

### 3. Konfigurasi via Admin Dashboard

1. Login ke admin dashboard
2. Buka Settings → Branding
3. Upload logo dan atur informasi lainnya

## Komponen yang Terpengaruh

### Frontend
- Page title (browser tab)
- Header/Navbar
- Login/Register page
- Footer
- API Documentation
- Developer Docs (n8n Integration)
- Email templates

### Backend
- Generated API keys
- Email notifications
- Webhook headers (X-{PREFIX}-Signature, X-{PREFIX}-Event, X-{PREFIX}-Delivery, X-{PREFIX}-Idempotency-Key)

## Troubleshooting

### Nama aplikasi tidak berubah setelah update .env

**Penyebab**: `NEXT_PUBLIC_*` variables di-inline saat build time.

**Solusi**: Rebuild frontend setelah mengubah `.env`:
```bash
# Dari root monorepo
pnpm --filter frontend build
```

### API key masih menggunakan prefix lama

**Penyebab**: `API_KEY_PREFIX` hanya berlaku untuk API key baru.

**Penjelasan**: API key yang sudah ada tetap menggunakan prefix saat dibuat. Ini by design untuk backward compatibility.

### Logo tidak muncul

**Penyebab**: URL logo tidak valid atau tidak accessible.

**Solusi**:
1. Pastikan URL logo bisa diakses publik
2. Gunakan format gambar yang didukung (PNG, JPG, SVG)
3. Pastikan CORS mengizinkan akses dari domain frontend
