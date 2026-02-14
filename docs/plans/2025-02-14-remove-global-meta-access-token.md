# Remove Global META_ACCESS_TOKEN Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the global `META_ACCESS_TOKEN` fallback mechanism and enforce per-WABA token usage to comply with Meta's policy.

**Architecture:** Replace singleton `WhatsAppAPI` client pattern with per-request client instantiation using decrypted tokens from `WhatsAppAccount`. Remove all references to `META_ACCESS_TOKEN` from codebase and documentation.

**Tech Stack:** TypeScript, Hono, Prisma, WhatsApp Cloud API

---

## Background

The current implementation has a **critical flaw**: it uses `META_ACCESS_TOKEN` as a fallback when per-account tokens are not available. This violates Meta's policy which requires each WABA to use its own OAuth-obtained token.

### Current Flow (Problematic):
```
1. resolveCredentialsForSending() -> gets per-account token
2. getWhatsAppClientAsync() -> IGNORES per-account token, uses global token
3. whatsapp.sendMessage() -> sends with WRONG token
```

### Target Flow (Correct):
```
1. resolveCredentialsForSending() -> gets per-account credentials
2. createWhatsAppApiForAccount(account) -> creates client with per-account token
3. whatsapp.sendMessage() -> sends with CORRECT token
```

---

## Task 1: Update WhatsApp Utility - Remove Global Token Fallback

**Files:**
- Modify: `apps/backend/src/utils/whatsapp.ts`

**Step 1: Remove getAccessToken fallback**

Replace lines 136-145:
```typescript
// Get fresh access token from cache or environment
private getAccessToken(): string {
  // Check cache first for database settings
  const cachedSettings = settingsCache.get<WhatsAppSettings>(CACHE_KEYS.whatsapp())
  if (cachedSettings?.accessToken && !cachedSettings.accessToken.includes('****')) {
    return cachedSettings.accessToken
  }
  // Fallback to process.env
  return process.env.META_ACCESS_TOKEN || this.accessToken
}
```

With:
```typescript
// Get access token - no fallback, must be provided in constructor
private getAccessToken(): string {
  return this.accessToken
}
```

**Step 2: Remove getWhatsAppClient sync function (lines 619-640)**

Delete the entire function and replace with error:
```typescript
/**
 * @deprecated Use createWhatsAppApiForAccount() from whatsapp-account-helper.ts instead
 * This function is removed to enforce per-account token usage
 */
export function getWhatsAppClient(): never {
  throw new Error(
    'getWhatsAppClient() is deprecated. Use createWhatsAppApiForAccount() from whatsapp-account-helper.ts with per-account credentials.'
  )
}
```

**Step 3: Remove getWhatsAppClientAsync function (lines 647-691)**

Replace with:
```typescript
/**
 * @deprecated Use createWhatsAppApiForAccount() from whatsapp-account-helper.ts instead
 * This function is removed to enforce per-account token usage
 */
export async function getWhatsAppClientAsync(): Promise<never> {
  throw new Error(
    'getWhatsAppClientAsync() is deprecated. Use createWhatsAppApiForAccount() from whatsapp-account-helper.ts with per-account credentials.'
  )
}
```

**Step 4: Remove invalidateWhatsAppClientCache and initWhatsAppClient (lines 696-723)**

Delete these functions as they manage the singleton which is being removed.

**Step 5: Remove refreshSettingsFromDb method (lines 151-181)**

This method refreshes from global settings which is no longer needed.

**Step 6: Commit**
```bash
git add apps/backend/src/utils/whatsapp.ts
git commit -m "refactor: deprecate global WhatsApp client functions

BREAKING: Remove META_ACCESS_TOKEN fallback to comply with Meta policy.
Each WABA must use its own OAuth token."
```

---

## Task 2: Update Admin Settings - Remove META_ACCESS_TOKEN Mapping

**Files:**
- Modify: `apps/backend/src/types/admin-settings.ts`

**Step 1: Remove access_token from WHATSAPP_SETTINGS_KEYS**

Replace lines 143-151:
```typescript
export const WHATSAPP_SETTINGS_KEYS: SettingKeyConfig[] = [
  { key: 'app_id', envKey: 'META_APP_ID', sensitive: false },
  { key: 'app_secret', envKey: 'META_APP_SECRET', sensitive: true },
  { key: 'access_token', envKey: 'META_ACCESS_TOKEN', sensitive: true },
  { key: 'verify_token', envKey: 'META_VERIFY_TOKEN', sensitive: true },
  { key: 'config_id', envKey: 'META_CONFIG_ID', sensitive: false },
  { key: 'webhook_base_url', envKey: 'WEBHOOK_BASE_URL', sensitive: false },
  { key: 'oauth_redirect_uri', envKey: 'OAUTH_REDIRECT_URI', sensitive: false },
];
```

With:
```typescript
export const WHATSAPP_SETTINGS_KEYS: SettingKeyConfig[] = [
  { key: 'app_id', envKey: 'META_APP_ID', sensitive: false },
  { key: 'app_secret', envKey: 'META_APP_SECRET', sensitive: true },
  // NOTE: access_token removed - each WABA uses its own OAuth token stored in WhatsAppAccount
  { key: 'verify_token', envKey: 'META_VERIFY_TOKEN', sensitive: true },
  { key: 'config_id', envKey: 'META_CONFIG_ID', sensitive: false },
  { key: 'webhook_base_url', envKey: 'WEBHOOK_BASE_URL', sensitive: false },
  { key: 'oauth_redirect_uri', envKey: 'OAUTH_REDIRECT_URI', sensitive: false },
];
```

**Step 2: Update WhatsAppSettings interface**

Replace lines 22-30:
```typescript
export interface WhatsAppSettings {
  appId: string;
  appSecret: string;      // sensitive
  accessToken: string;    // sensitive
  verifyToken: string;    // sensitive
  configId: string;
  webhookBaseUrl: string;
  oauthRedirectUri: string;
}
```

With:
```typescript
export interface WhatsAppSettings {
  appId: string;
  appSecret: string;      // sensitive
  // NOTE: accessToken removed - each WABA uses its own OAuth token stored in WhatsAppAccount
  verifyToken: string;    // sensitive
  configId: string;
  webhookBaseUrl: string;
  oauthRedirectUri: string;
}
```

**Step 3: Commit**
```bash
git add apps/backend/src/types/admin-settings.ts
git commit -m "refactor: remove global accessToken from WhatsApp settings

Each WABA now uses its own OAuth token from WhatsAppAccount table."
```

---

## Task 3: Update Public API - Conversations (Typing Indicator)

**Files:**
- Modify: `apps/backend/src/routes/api/v1/public/conversations.ts`

**Step 1: Replace getWhatsAppClientAsync with createWhatsAppApiForAccount**

Update import (line 4):
```typescript
// REMOVE:
import { getWhatsAppClientAsync } from '../../../../utils/whatsapp.js';

// ADD:
import { WhatsAppAPI } from '../../../../utils/whatsapp.js';
```

**Step 2: Update sendWhatsAppTyping function (around line 268)**

Current code:
```typescript
const whatsapp = await getWhatsAppClientAsync();
await whatsapp.markAsRead(credentials.phoneNumberId, lastMessage.wamId, true);
```

Replace with:
```typescript
const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken });
await whatsapp.markAsRead(credentials.phoneNumberId, lastMessage.wamId, true);
```

**Step 3: Commit**
```bash
git add apps/backend/src/routes/api/v1/public/conversations.ts
git commit -m "fix: use per-account token for WhatsApp typing indicator"
```

---

## Task 4: Update Public API - Messages (Send & Mark Read)

**Files:**
- Modify: `apps/backend/src/routes/api/v1/public/messages.ts`

**Step 1: Update import**

Replace line 5:
```typescript
// REMOVE:
import { getWhatsAppClientAsync } from '../../../../utils/whatsapp.js';

// ADD:
import { WhatsAppAPI } from '../../../../utils/whatsapp.js';
```

**Step 2: Update sendWhatsAppMessage function (line 462)**

Replace:
```typescript
const whatsapp = await getWhatsAppClientAsync();
```

With:
```typescript
const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken });
```

**Step 3: Update mark as read handler (line 1112)**

Replace:
```typescript
const whatsapp = await getWhatsAppClientAsync();
```

With:
```typescript
const whatsapp = new WhatsAppAPI({ accessToken: readCredentials.accessToken });
```

**Step 4: Commit**
```bash
git add apps/backend/src/routes/api/v1/public/messages.ts
git commit -m "fix: use per-account token for WhatsApp message sending and read receipts"
```

---

## Task 5: Update Media Download Service

**Files:**
- Modify: `apps/backend/src/services/media-download-service.ts`

**Step 1: Update import (line 15)**

Replace:
```typescript
import WhatsAppAPI, { getWhatsAppClientAsync } from '../utils/whatsapp.js'
```

With:
```typescript
import { WhatsAppAPI } from '../utils/whatsapp.js'
```

**Step 2: Update downloadAndStore method (lines 103-108)**

Current code:
```typescript
async downloadAndStore(mediaId: string, accessToken?: string): Promise<MediaDownloadResult> {
  try {
    // 1. Get WhatsApp client - use per-account token if available, fallback to global
    const whatsapp = accessToken
      ? new WhatsAppAPI({ accessToken })
      : await getWhatsAppClientAsync()
```

Replace with:
```typescript
async downloadAndStore(mediaId: string, accessToken: string): Promise<MediaDownloadResult> {
  try {
    if (!accessToken) {
      return {
        success: false,
        error: 'Access token is required for media download',
        mediaId
      }
    }
    
    // Create WhatsApp client with per-account token
    const whatsapp = new WhatsAppAPI({ accessToken })
```

**Step 3: Update getMediaUrl method (lines 185-195)**

Replace:
```typescript
async getMediaUrl(mediaId: string): Promise<string> {
  try {
    const whatsapp = await getWhatsAppClientAsync()
    const mediaInfo = await whatsapp.getMediaUrl(mediaId)
    return mediaInfo.url
  } catch (error) {
```

With:
```typescript
async getMediaUrl(mediaId: string, accessToken: string): Promise<string> {
  try {
    if (!accessToken) {
      throw new Error('Access token is required for media URL retrieval')
    }
    const whatsapp = new WhatsAppAPI({ accessToken })
    const mediaInfo = await whatsapp.getMediaUrl(mediaId)
    return mediaInfo.url
  } catch (error) {
```

**Step 4: Find and update all callers of mediaDownloadService**

Search for `mediaDownloadService.downloadAndStore` and `mediaDownloadService.getMediaUrl` calls and ensure they pass the accessToken.

**Step 5: Commit**
```bash
git add apps/backend/src/services/media-download-service.ts
git commit -m "fix: require access token for media download service"
```

---

## Task 6: Update Template Routes

**Files:**
- Modify: `apps/backend/src/routes/templates/delete.ts`
- Modify: `apps/backend/src/routes/templates/test.ts`
- Modify: `apps/backend/src/routes/templates/operations.ts`

**Step 1: Update delete.ts imports and usage**

Replace line 5:
```typescript
import { getWhatsAppClientAsync } from '../../utils/whatsapp.js'
```

With:
```typescript
import { WhatsAppAPI } from '../../utils/whatsapp.js'
```

Update line 44:
```typescript
const whatsapp = await getWhatsAppClientAsync()
```

With:
```typescript
const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken })
```

**Step 2: Update test.ts imports and usage**

Replace line 4:
```typescript
import { getWhatsAppClientAsync } from '../../utils/whatsapp.js'
```

With:
```typescript
import { WhatsAppAPI } from '../../utils/whatsapp.js'
```

Update line 73:
```typescript
const whatsapp = await getWhatsAppClientAsync()
```

With:
```typescript
const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken })
```

**Step 3: Update operations.ts**

Same pattern - replace import and usage at line 382.

**Step 4: Commit**
```bash
git add apps/backend/src/routes/templates/
git commit -m "fix: use per-account token for template operations"
```

---

## Task 7: Update Quality Route

**Files:**
- Modify: `apps/backend/src/routes/quality.ts`

**Step 1: Update import (line 5)**

Replace:
```typescript
import { getWhatsAppClientAsync } from '../utils/whatsapp.js'
```

With:
```typescript
import { WhatsAppAPI } from '../utils/whatsapp.js'
```

**Step 2: Update sync handler (line 91)**

Replace:
```typescript
const whatsapp = await getWhatsAppClientAsync()
```

With:
```typescript
const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken })
```

**Step 3: Commit**
```bash
git add apps/backend/src/routes/quality.ts
git commit -m "fix: use per-account token for quality sync"
```

---

## Task 8: Update Template Media Service

**Files:**
- Modify: `apps/backend/src/services/template-media-service.ts`

**Step 1: Update import (line 11)**

Replace:
```typescript
import { getWhatsAppClientAsync } from '../utils/whatsapp.js';
```

With:
```typescript
import { WhatsAppAPI } from '../utils/whatsapp.js';
```

**Step 2: Update uploadMediaToMeta function**

This function needs to accept accessToken parameter and pass it to WhatsAppAPI.

**Step 3: Find callers and ensure they provide credentials**

**Step 4: Commit**
```bash
git add apps/backend/src/services/template-media-service.ts
git commit -m "fix: use per-account token for template media upload"
```

---

## Task 9: Update User Support Service

**Files:**
- Modify: `apps/backend/src/services/admin/user-support-service.ts`

**Step 1: Update dynamic import (lines 466-469)**

Replace:
```typescript
const { getWhatsAppClientAsync } = await import("../../utils/whatsapp.js")
// ...
const whatsapp = await getWhatsAppClientAsync()
```

With:
```typescript
const { WhatsAppAPI } = await import("../../utils/whatsapp.js")
// Get credentials for the user being supported
const { resolveCredentialsForSending } = await import("../../utils/whatsapp-account-helper.js")
const credentials = await resolveCredentialsForSending(userId)
if (!credentials) {
  throw new Error('No WhatsApp credentials found for user')
}
const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken })
```

**Step 2: Commit**
```bash
git add apps/backend/src/services/admin/user-support-service.ts
git commit -m "fix: use per-account token for user support service"
```

---

## Task 10: Update Messages Read Route

**Files:**
- Modify: `apps/backend/src/routes/messages/read.ts`

Check if this file uses getWhatsAppClientAsync and update similarly.

**Step 1: Commit**
```bash
git add apps/backend/src/routes/messages/read.ts
git commit -m "fix: use per-account token for message read route"
```

---

## Task 11: Clean Up Environment Files

**Files:**
- Modify: `apps/backend/.env.example`
- Modify: `apps/backend/.env.production.example`
- Modify: `docker/docker-compose.yml`
- Modify: `docker/.env.example`
- Modify: `.env.docker.example`

**Step 1: Remove META_ACCESS_TOKEN from all env files**

Add deprecation comment instead:
```bash
# META_ACCESS_TOKEN is REMOVED - each WABA uses its own OAuth token
# See WhatsAppAccount table for per-account token storage
```

**Step 2: Commit**
```bash
git add apps/backend/.env.example apps/backend/.env.production.example docker/ .env.docker.example
git commit -m "docs: remove META_ACCESS_TOKEN from env examples

Per Meta policy, each WABA must use its own OAuth token.
Tokens are stored encrypted in WhatsAppAccount table."
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `Documentation/02-BACKEND-DEPLOYMENT.md`
- Modify: `MIGRATION.md`
- Modify: `install.sh`

**Step 1: Update documentation to reflect new token architecture**

Add migration note explaining:
1. META_ACCESS_TOKEN is no longer used
2. Each WABA must be connected via OAuth flow
3. Tokens are stored encrypted per-account

**Step 2: Update install.sh to not prompt for META_ACCESS_TOKEN**

**Step 3: Commit**
```bash
git add Documentation/ MIGRATION.md install.sh
git commit -m "docs: update deployment guides for per-account WABA tokens"
```

---

## Task 13: Verify Build and Tests

**Step 1: Run TypeScript compilation**
```bash
cd apps/backend && npm run build
```

Expected: No compilation errors

**Step 2: Run tests**
```bash
npm run test
```

Expected: All tests pass

**Step 3: Fix any issues found**

**Step 4: Final commit**
```bash
git add .
git commit -m "chore: fix build issues after META_ACCESS_TOKEN removal"
```

---

## Summary of Breaking Changes

1. **`getWhatsAppClient()`** - Removed, throws error
2. **`getWhatsAppClientAsync()`** - Removed, throws error  
3. **`META_ACCESS_TOKEN`** - No longer read from environment
4. **`WhatsAppSettings.accessToken`** - Removed from type
5. **Admin Dashboard** - WhatsApp settings no longer shows global access token field

## Migration for Existing Users

Users with existing `META_ACCESS_TOKEN` configuration must:
1. Connect each WABA via the OAuth Embedded Signup flow
2. The system will store per-account tokens automatically
3. Remove `META_ACCESS_TOKEN` from their `.env` file

---

## Verification Checklist

- [ ] All files compile without errors
- [ ] No references to `META_ACCESS_TOKEN` in code (except docs)
- [ ] No calls to `getWhatsAppClient()` or `getWhatsAppClientAsync()`
- [ ] All WhatsApp API calls use `new WhatsAppAPI({ accessToken: credentials.accessToken })`
- [ ] Tests pass
- [ ] Documentation updated
