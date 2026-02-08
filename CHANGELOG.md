# KirimChat Changelog

Semua perubahan penting pada KirimChat akan didokumentasikan di file ini.

Format: [Semantic Versioning](https://semver.org/)

---

## [1.4.0] - 2026-01-19

### ✨ New Features

#### Customer Export & Import Improvements
Meningkatkan fitur manajemen customer dengan fungsionalitas export/import yang lebih fleksibel dan informatif.

**Backend:**
- **Export by Channel** - Mendukung ekspor customer berdasarkan channel (`whatsapp`, `instagram`, `messenger`) via query parameter.
- **Export by Selection** - Mendukung ekspor baris tertentu menggunakan parameter `ids`.
- **Informasi Channel** - Menambahkan kolom `Channels` di CSV untuk menunjukkan platform aktif setiap customer.
- **Audit Logging** - Mencatat aktivitas ekspor termasuk detail channel yang dipilih.

**Frontend:**
- **Flexible CSV Parsing** - Logika impor baru yang mendukung berbagai variasi header (e.g., "phone number", "phone", "no hp").
- **CSV Template** - Menambahkan fitur untuk mengunduh template CSV yang benar langsung dari dashboard.
- **Improved UI** - Memindahkan tombol Export ke toolbar tabel dan mereorganisasi tombol aksi utama (Import/Add) agar lebih responsif.
- **Visual Feedback** - Menambahkan ringkasan hasil impor (berhasil/gagal) via toast notifications.

#### Interactive WhatsApp Messages via Public API
Menambahkan dukungan untuk mengirim pesan interaktif WhatsApp via Public API.

**Tipe Interaktif yang Didukung:**
- **CTA URL Button** - Tombol yang mengarahkan ke URL eksternal
- **Reply Buttons** - Hingga 3 tombol quick reply untuk customer

**Perubahan:**
- Tambah message_type `interactive` ke WhatsApp messages
- Validasi schema untuk CTA URL (type, body, action dengan display_text dan url)
- Validasi schema untuk Reply Buttons (type, body, action dengan buttons array)
- Detailed error handling untuk WhatsApp API errors (TemplateError, RecipientError)

#### Public API - Templates Endpoint
Menambahkan endpoint untuk list dan get WhatsApp message templates via Public API.

**Endpoints:**
- `GET /api/v1/public/templates` - List templates dengan filter dan pagination
- `GET /api/v1/public/templates/:templateId` - Get template by ID

**Query Parameters:**
- `status` - Filter by status (APPROVED, PENDING, REJECTED, PAUSED, DISABLED)
- `category` - Filter by category (MARKETING, UTILITY, AUTHENTICATION)
- `limit` - Max results (default: 100, max: 500)
- `offset` - Pagination offset

### 🔧 Improvements

#### Template Submission Reliability & UI
- Backend: cegah submit ketika WABA/phoneNumber disconnected/disabled dan beri error jelas untuk media_id invalid (131009/2494102) tanpa langsung menandai template REJECTED.
- Frontend: sembunyikan input Header (tipe/media) pada form create/update template untuk mencegah penggunaan media header saat WABA belum siap.

#### Template Creation & Rendering Fixes
- Simpan `headerMediaId` yang dikirim frontend sebagai sample header secara konsisten pada create/update template.
- Perbaiki renderer template agar lebih tahan terhadap konten header/body yang hilang atau tidak lengkap.

#### Customers Table & Export Polishing
- Penyesuaian kolom dan schema tabel Customers (label, pipeline data) agar konsisten dengan ekspor/impor.
- Toolbar Customers diperhalus (actions, pagination) dan ekspor tetap menghormati filter terbaru.

#### WABA Primary Number UI & API
- Halaman WABA menampilkan aksi set primary dengan refresh state terbaru.
- Helper API WABA diperbarui untuk memanggil endpoint set primary number.

#### WABA Primary Phone Number Management
- **Backend:** Menambahkan endpoint `POST /api/v1/waba/:wabaId/phone-numbers/primary` untuk set primary phone number secara lokal dengan access checks dan audit logging (`apps/backend/src/routes/waba/phone-numbers.ts`).
- **Frontend API:** Menambahkan helper `wabaApi.setPrimaryPhoneNumber` untuk memanggil endpoint baru (`apps/frontend/src/lib/api/waba.ts`).
- **Dashboard:** Halaman WABA kini menampilkan semua nomor dengan aksi "Set as primary", badge primary mengikuti pilihan terbaru, dan state refresh setelah perubahan (`apps/frontend/src/app/[locale]/(dashboard)/waba/page.tsx`).

#### Developer Documentation - Interactive Messages
- Tambah section dokumentasi untuk Send Interactive messages
- Tambah contoh CTA URL Button dan Reply Buttons
- Tambah API Playground examples untuk interactive messages
- Update sidebar navigation dengan link ke Interactive docs

#### CRM Pipeline - Stages Management
- Backend PUT endpoint sekarang support update stages dalam satu request
- Atomic transaction untuk create, update, dan delete stages
- Audit log untuk pipeline updates

#### Optimistic UI Improvements
Memperbaiki responsivitas UI dengan optimistic updates:

- **Customer Tags** - Update langsung terlihat, tag baru muncul di filter options
- **Customer Stage** - Perubahan stage langsung terlihat tanpa delay
- **Customer Notes** - Note langsung muncul, replace dengan real data setelah success
- **Pipeline Settings** - Save langsung update UI, rollback otomatis jika gagal

#### Pipeline Stages Drag & Drop
- Implementasi drag & drop untuk reorder stages menggunakan `@hello-pangea/dnd`
- Portal rendering saat dragging untuk menghindari clipping
- Visual feedback yang jelas saat dragging (shadow, border, bold text)

**Files Changed:**
- `apps/backend/src/routes/customers/export.ts`
- `apps/backend/src/routes/customers/import.ts`
- `apps/backend/src/routes/customers/index.ts`
- `apps/backend/src/routes/customers/list.ts`
- `apps/frontend/src/app/[locale]/(dashboard)/customers/components/customers-primary-actions.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/customers/components/data-table-toolbar.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/customers/components/customers-columns.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/customers/data/schema.ts`
- `apps/frontend/src/app/[locale]/(dashboard)/customers/page.tsx`
- `apps/backend/src/routes/api/v1/public/index.ts`
- `apps/backend/src/routes/api/v1/public/messages.ts`
- `apps/backend/src/routes/api/v1/public/templates.ts` (NEW)
- `apps/backend/src/routes/crm/pipelines.ts`
- `apps/frontend/src/app/[locale]/(dashboard)/developers/components/api-playground.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/developers/components/docs-sidebar.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/developers/docs/page.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/oneinbox/hooks/use-crm-data.ts`
- `apps/frontend/src/app/[locale]/(dashboard)/settings/crm/components/pipelines-settings.tsx`

---

## [1.3.0] - 2026-01-14

### ✨ New Features

#### Configurable Legal Pages URLs
Menambahkan kemampuan untuk mengkonfigurasi URL halaman Terms of Service dan Privacy Policy dari Admin Dashboard. Halaman legal internal dihapus karena dashboard akan diakses via subdomain (app.domain.com) terpisah dari landing page (domain.com).

**Backend:**
- Tambah field `termsUrl` dan `privacyUrl` ke `BrandingSettings` interface
- Tambah setting keys `terms_url` dan `privacy_url` ke `BRANDING_SETTINGS_KEYS`
- Tambah validasi URL format untuk terms dan privacy URL di `AdminSettingsService`
- Update `DEFAULT_BRANDING` dengan default URLs

**Frontend:**
- Hapus folder `(legal)` beserta halaman terms dan privacy internal
- Buat komponen `LegalLinks` untuk menampilkan link legal dari branding settings
- Update halaman login dan register untuk menggunakan `LegalLinks` component
- Tambah section "Legal Pages" di halaman Admin > Settings > Branding
- Update `BrandingSettings` interface dan `useBranding` hook dengan field baru

**Files Changed:**
- `apps/backend/src/types/admin-settings.ts`
- `apps/backend/src/services/admin/settings-service.ts`
- `apps/frontend/src/lib/api/branding-api.ts`
- `apps/frontend/src/hooks/use-branding.ts`
- `apps/frontend/src/components/auth/legal-links.tsx` (NEW)
- `apps/frontend/src/app/[locale]/(auth)/login/page.tsx`
- `apps/frontend/src/app/[locale]/(auth)/register/page.tsx`
- `apps/frontend/src/app/[locale]/admin/settings/branding/page.tsx`
- `apps/frontend/src/app/[locale]/(legal)/` (DELETED)

### 🔧 Improvements

#### Single Pipeline dengan Drag & Drop Stages
Memperbaiki fitur CRM Pipeline agar lebih fungsional dan user-friendly.

**Perubahan:**
- **Single Pipeline** - User sekarang hanya bisa memiliki 1 pipeline (tombol "New Pipeline" tersembunyi jika sudah ada)
- **Edit Stages** - Backend PUT endpoint sekarang support update stages (nama, warna, order) dalam satu request
- **Drag & Drop Stages** - Implementasi drag & drop untuk reorder stages saat edit pipeline menggunakan `@hello-pangea/dnd`
- **Portal saat Dragging** - Stage yang di-drag di-render via portal ke document.body agar tidak ter-clip oleh dialog overflow
- **Visual yang Jelas** - Stage yang di-drag menampilkan nama dan warna dengan jelas (shadow besar, border primary, nama bold)

**Optimistic UI:**
- **Pipeline Settings** - Save langsung update UI tanpa loading, rollback otomatis jika gagal
- **Customer Stage Change** - Perubahan stage customer di OneInbox langsung terlihat tanpa delay
- **Customer Tags Update** - Update tags langsung terlihat, tag baru langsung muncul di filter options
- **Add Customer Note** - Note langsung muncul di list, replace dengan real data setelah API success

**Files Changed:**
- `apps/frontend/src/app/[locale]/(dashboard)/settings/crm/components/pipelines-settings.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/oneinbox/hooks/use-crm-data.ts`
- `apps/backend/src/routes/crm/pipelines.ts`

### 🐛 Bug Fixes

#### Messenger User Profile Display
Memperbaiki masalah dimana nama user Messenger hanya menampilkan PSID (nomor) bukan nama asli.

**Problem:** Conversation Messenger menampilkan ID seperti "25710659028554725" bukan nama user
**Root Cause:** OAuth scope tidak menyertakan permission `pages_read_engagement` yang diperlukan untuk mengakses user profile
**Solution:** 
- Tambah `pages_read_engagement` ke OAuth scope untuk Messenger
- Tambah detailed error logging untuk debugging profile fetch failures
- Setelah Meta approve permission, user perlu reconnect Facebook Page

**Files Changed:**
- `apps/backend/src/services/messenger/oauth.ts`
- `apps/backend/src/services/messenger/messaging.ts`
- `apps/backend/src/routes/messenger/webhooks.ts`

### 🔧 Improvements

#### Better Error Logging for Messenger
- Menambahkan detailed error logging di `getUserProfile()` dengan error code dan subcode dari Facebook API
- Menambahkan logging di webhook handler untuk profile fetch results
- Membantu debugging issues terkait Facebook API permissions

---

## [1.2.0] - 2026-01-11

### ✨ New Features

#### Instagram & Messenger Channel Toggle
Menambahkan fitur on/off untuk channel Instagram dan Messenger di Admin Dashboard. Ketika channel di-disable, link di sidebar akan disembunyikan.

**Backend:**
- Tambah field `enabled: boolean` ke `InstagramSettings` dan `MessengerSettings` interface
- Tambah setting key `enabled` untuk Instagram dan Messenger di `INSTAGRAM_SETTINGS_KEYS` dan `MESSENGER_SETTINGS_KEYS`
- Buat endpoint publik `GET /api/v1/channels/status` untuk fetch status channel (no auth required)
- Tambah cache invalidation untuk channel status saat update/reset settings

**Frontend:**
- Tambah Switch toggle "Enable Instagram/Messenger Channel" di Admin Settings
- Disable semua input fields saat channel disabled
- Buat hook `useChannelStatus()` untuk fetch status channel
- Update `useSidebarData()` untuk filter Instagram/Messenger links berdasarkan enabled status

**Files Changed:**
- `apps/backend/src/types/admin-settings.ts`
- `apps/backend/src/routes/channels.ts` (NEW)
- `apps/backend/src/services/admin/settings-service.ts`
- `apps/backend/src/index.ts`
- `apps/frontend/src/lib/api/channels-api.ts` (NEW)
- `apps/frontend/src/hooks/use-channel-status.ts` (NEW)
- `apps/frontend/src/app/[locale]/admin/settings/components/instagram-settings-form.tsx`
- `apps/frontend/src/app/[locale]/admin/settings/components/messenger-settings-form.tsx`
- `apps/frontend/src/components/layout/data/use-sidebar-data.tsx`

---

## [1.1.0] - 2026-01-10

### 🔧 Refactoring

#### OneInbox Hook Refactoring
Memecah file `use-unified-inbox.ts` (2104 baris) menjadi 9 file yang lebih kecil dan terorganisir untuk meningkatkan maintainability:

- **`unified-inbox-types.ts`** (202 baris) - Type definitions untuk semua hooks
- **`use-crm-data.ts`** (436 baris) - CRM data loading, customer details, dan updates
- **`use-assignment.ts`** (300 baris) - Conversation assignment ke user/AI
- **`use-whatsapp-messaging.ts`** (542 baris) - WhatsApp message sending (text, template, media, CTA, reply buttons)
- **`use-instagram-messaging.ts`** (139 baris) - Instagram message sending
- **`use-messenger-messaging.ts`** (142 baris) - Messenger message sending
- **`use-conversation-filters.ts`** (111 baris) - Filtering logic (channel, read status, tags, pipeline)
- **`use-websocket-handlers.ts`** (166 baris) - WebSocket event handlers
- **`use-unified-inbox.ts`** (575 baris) - Main hook yang compose semua hooks
- **`index.ts`** (19 baris) - Export file

### 🐛 Bug Fixes

#### React Infinite Loop Fix (Error #185)
- **Problem**: Maximum update depth exceeded error saat membuka OneInbox
- **Root Cause**: 
  - Object dependencies di useCallback menyebabkan re-create setiap render
  - Inline functions di hook options membuat function baru setiap render
  - Circular dependencies antara hooks dan loadConversations
- **Solution**:
  - Menggunakan `useRef` untuk stable function references
  - Menggunakan refs untuk CRM data maps
  - Memperbaiki dependency arrays di useCallback dan useEffect
  - Menghapus circular dependencies

#### Media Proxy Error Handling
- **Problem**: Console log spam dengan error 500 saat WhatsApp tidak dikonfigurasi
- **Solution**:
  - Frontend: Jika media URL adalah media ID (bukan full URL), langsung tampilkan "Media tidak tersedia" tanpa mencoba fetch
  - Backend: Menambahkan pengecekan apakah WhatsApp sudah dikonfigurasi sebelum proxy
  - Backend: Return 503 Service Unavailable dengan pesan jelas jika WhatsApp tidak dikonfigurasi

### ✨ Improvements

#### Backend: Media Proxy (`apps/backend/src/routes/media.ts`)
- Menambahkan try-catch khusus untuk `getWhatsAppClientAsync()` 
- Return 503 dengan pesan "WhatsApp is not configured" jika tidak ada konfigurasi
- Menambahkan handling untuk error 401/403 (token issues)
- Menambahkan deteksi WhatsApp API error codes (code 100, etc.)
- Menambahkan deteksi error message patterns (expired, not found, unavailable)
- Pesan error yang lebih informatif ke client

#### Backend: WhatsApp Client (`apps/backend/src/utils/whatsapp.ts`)
- Menambahkan logging detail untuk `getMediaUrl()` dan `downloadMedia()`
- Log mencakup: mediaId, status HTTP, error code dari WhatsApp API

#### Frontend: Media Preview (`apps/frontend/src/app/[locale]/(dashboard)/messages/components/media-preview.tsx`)
- Refactor `getDisplayUrl()` untuk return object dengan `url` dan `isProxied` flag
- Jika `isProxied = true`, langsung render "Media tidak tersedia" tanpa fetch
- Pesan error yang lebih informatif: "Media WhatsApp hanya tersedia sekitar 30 hari"
- Menghilangkan console error spam untuk media yang tidak tersedia

---

## [1.0.0] - 2026-01-15

###  Initial Release

####  WhatsApp Business API
- Embedded Signup untuk koneksi WABA
- Coexistence mode (Cloud API + WhatsApp Business App)
- Template message management (create, edit, delete, sync)
- Send & receive messages (text, image, video, document, audio, sticker)
- Message status tracking (sent, delivered, read)
- Quality rating monitoring
- Phone number management

####  Multi-Channel Inbox
- **WhatsApp** - Full messaging support
- **Instagram DM** - Direct message integration
- **Facebook Messenger** - Messenger integration
- **OneInbox** - Unified inbox untuk semua channel

####  Customer Management (CRM)
- Customer list dengan search & filter
- Customer detail & profile
- Custom fields
- Notes & activities
- Tags & labels
- Import/Export customers (CSV)
- Blacklist management
- Marketing consent tracking
- CRM Pipeline

####  Analytics & Insights
- Dashboard overview
- Message analytics
- Template performance
- Customer insights
- Broadcast analytics
- Revenue tracking (Admin)

####  Broadcast
- Bulk message sending
- Template-based broadcast
- Audience targeting
- Broadcast scheduling
- Delivery reports

####  AI Features
- AI Agents configuration
- Knowledge base management
- Auto-reply dengan AI
- AI Orchestrator

####  Team Collaboration
- Team member management
- Role-based access (Admin, Business Owner, Agent)
- Conversation assignment
- Team invitation via email

####  Developer Tools
- API Keys management
- Webhook configuration
- Events & logs viewer
- Public API untuk integrasi eksternal
- API documentation

####  Subscription & Payment
- Subscription tiers (Free, Basic, Lite, PRO)
- Payment gateway integration (Duitku, Xendit)
- Payment history
- Subscription plans management

####  Admin Panel (White-Label)
- User management
- Subscription management
- Subscription plans configuration
- Revenue dashboard
- System health monitoring
- Audit logs
- Branding settings (logo, nama, support contact)

####  Authentication & Security
- Email/password login
- Google OAuth
- Email verification
- Password reset (forgot password)
- Rate limiting
- API key authentication

####  Localization
- Multi-language support (English, Indonesian)
- Timezone support

####  Deployment
- One-click installer
- Docker-based deployment (5 services)
- Auto SSL dengan Caddy
- PostgreSQL dengan pgvector
- Redis untuk caching & queue
- Backup & restore scripts
- Update script

---

## System Requirements

- Ubuntu 24.04+ / Debian 11+
- Docker & Docker Compose
- 2GB+ RAM (4GB recommended)
- 10GB+ disk space
- Domain dengan DNS pointing ke server

---

## Quick Start

```bash
# Extract dan install
unzip kirimchat-v1.0.0.zip
cd kirimchat-v1.0.0
chmod +x *.sh
./install.sh

# Create admin user
./create-admin.sh
```

---

## Support

Jika mengalami masalah:
1. Cek logs: `cd docker && docker compose logs`
2. Lihat troubleshooting di README.md
3. Hubungi support team
