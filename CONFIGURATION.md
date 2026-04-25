# Citcat - Configuration Guide

Panduan konfigurasi untuk mengaktifkan fitur-fitur tambahan.

---

## 📁 Lokasi File Konfigurasi

```
docker/.env
```

Setelah edit, restart services:
```bash
cd docker && docker compose up -d
```

---

## 🔐 Google OAuth (Login dengan Google)

### Langkah 1: Buat Project di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih existing project
3. Buka **APIs & Services** → **Credentials**

### Langkah 2: Buat OAuth Client ID

1. Klik **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Citcat`
4. Authorized JavaScript origins:
   ```
   https://citcat.id
   ```
5. Authorized redirect URIs:
   ```
   https://citcat.id/api/auth/callback/google
   ```
6. Klik **Create**
7. Copy **Client ID** dan **Client Secret**

### Langkah 3: Update .env

```bash
nano docker/.env
```

Tambahkan:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Langkah 4: Restart

```bash
cd docker && docker compose up -d
```

---

## 📧 SMTP Email (Email Verification, Password Reset)

### Contoh Konfigurasi

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Citcat
SMTP_SECURE=false
```
> ⚠️ Untuk Gmail, gunakan [App Password](https://support.google.com/accounts/answer/185833)

#### Brevo (Sendinblue)
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email
SMTP_PASSWORD=your-smtp-key
SMTP_FROM_EMAIL=noreply@citcat.id
SMTP_FROM_NAME=Citcat
SMTP_SECURE=false
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@citcat.id
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=noreply@citcat.id
SMTP_FROM_NAME=Citcat
SMTP_SECURE=false
```

#### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-user
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=noreply@citcat.id
SMTP_FROM_NAME=Citcat
SMTP_SECURE=false
```

---

## 💳 Payment Gateway

### Duitku

1. Daftar di [Duitku](https://duitku.com/)
2. Dapatkan Merchant Code dan API Key dari dashboard

```env
DUITKU_MERCHANT_CODE=your-merchant-code
DUITKU_API_KEY=your-api-key
DUITKU_CALLBACK_URL=https://citcat.id/api/v1/webhooks/duitku/callback
```

### Xendit

1. Daftar di [Xendit](https://xendit.co/)
2. Dapatkan API Key dari dashboard

```env
XENDIT_API_KEY=your-xendit-api-key
XENDIT_CALLBACK_TOKEN=your-callback-verification-token
XENDIT_CALLBACK_URL=https://citcat.id/api/v1/webhooks/xendit/callback
```

---

## 🤖 AI Features (OpenAI)

1. Daftar di [OpenAI](https://platform.openai.com/)
2. Buat API Key di dashboard

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

---

## 🔄 Setelah Edit .env

**PENTING:** Setelah mengubah `.env`, restart services:

```bash
cd docker
docker compose down
docker compose up -d
```

Atau untuk restart tanpa downtime:
```bash
cd docker
docker compose up -d --force-recreate
```

---

## ✅ Verifikasi Konfigurasi

### Cek Backend Logs
```bash
docker logs kirimchat-backend --tail 50
```

### Cek Environment Variables
```bash
docker exec kirimchat-backend printenv | grep -E "(GOOGLE|SMTP|META|OPENAI)"
```

### Test SMTP
Coba fitur "Forgot Password" di halaman login.

### Test Google OAuth
Coba klik "Login with Google" di halaman login.

---

## 🆘 Troubleshooting

### Google OAuth Error

**Error: redirect_uri_mismatch**
- Pastikan Authorized redirect URI di Google Console sama persis:
  ```
  https://citcat.id/api/auth/callback/google
  ```

**Error: invalid_client**
- Cek GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah benar
- Pastikan tidak ada spasi atau karakter tersembunyi

### SMTP Error

**Error: Connection refused**
- Cek SMTP_HOST dan SMTP_PORT
- Pastikan firewall tidak memblokir port SMTP

**Error: Authentication failed**
- Untuk Gmail, pastikan menggunakan App Password
- Cek username dan password sudah benar

### Environment Variables Tidak Terbaca

- Pastikan tidak ada spasi di sekitar `=`
- Pastikan tidak ada quote yang tidak perlu
- Restart container setelah edit

---

## 📞 Support

Jika masih mengalami masalah, hubungi support team dengan menyertakan:
1. Screenshot error
2. Output dari `docker logs kirimchat-backend --tail 100`
3. Konfigurasi (tanpa secrets/password!)
