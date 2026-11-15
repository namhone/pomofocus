# Project: Pomofocus V8.1 Wave 1 (Đợt 1/4)
# Scope: Storage, UserAvatar, DB Sync, Payment Webhook & Timer/Task Logic

## Architecture
- **Tech Stack**: Vite, React 18, TypeScript, Tailwind CSS, Supabase Cloud, Dexie.js (IndexedDB), Zustand stores, Capacitor Android.
- **Data Layer Separation**:
  - `SafeStorage`: Ultra-lightweight configuration flags only in `localStorage` (`STORAGE_SCHEMA_VERSION`, volume, eco mode, `targetEndTimeMs` on state transition). Immune to `QuotaExceededError` and incognito mode via `MemoryStorage` fallback.
  - `Dexie.js` (`PomoFocusLocalDB` v3): Heavy data arrays (Tasks, Notes, Projects, Focus Sessions, AI Messages, Whiteboard Strokes, Custom Backgrounds, Sync Queue).
  - `Supabase Cloud`: Single source of truth for Meet rooms (`/api/rooms`), authenticated energy wallet (`user_wallets`), user profile & VIP permissions (`hasVipAccess`).
- **Unified Avatar Subsystem**:
  - `<UserAvatar />` component (`src/components/common/UserAvatar.tsx`): 3 priority cascades (Custom uploaded compressed <= 256x256 -> Google OAuth image with robust `onError` fallback -> Clean SVG with 'K' for guest / initials for user). Subscribed to `useAuthStore` for real-time reactivity.
- **Data Sync & DB Performance Subsystem**:
  - Standard RFC4122 UUID v4 (`src/utils/uuid.ts`).
  - Server clock skew offset calculation (`serverClockOffsetMs`).
  - Soft delete tombstones (`deleted_at`) preventing zombie records.
  - Dexie v3 schema with `userId` indexing and user data isolation.
  - Resilient `sync_queue` with status `'failed'` and exponential backoff.
  - Date index queries for `focus_sessions`, AI message pagination, and `safeParseJson` protecting against Captive Portals / Lie-Fi.
- **Payment & VietQR Subsystem**:
  - Google Apps Script `checkVietcombankEmails` with `LockService` mutex and 15-email batching.
  - `api/payment/webhook.ts` non-blocking response and idempotent 200 settlement.
  - Mandatory login guard for VietQR modals.
  - Transparent VietQR branding (clean up MoMo misnomer).
  - Explicit HTTP 429 rate limit handling.
- **Timer Engine & Task Logic Subsystem**:
  - Stepper adjustment synchronization at IDLE; next-round break application.
  - Phase change confirmation covering both `running` and `paused` states.
  - Atomic session recording preventing statistical inflation.
  - Activated midnight rollover (`checkMidnightRollover`).
  - Task linkage synchronization on update/soft-delete.
  - Global `AbortController` canceling prior AI stream on chat switch.

---

## Feature Inventory
Every feature identified during the Survey Phase is cataloged below and assigned to a milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SafeStorage Wrapper & Schema Version | `src/utils/safeStorage.ts` with QuotaExceededError protection, in-memory fallback, and `STORAGE_SCHEMA_VERSION = 1` auto-purge | M1 | Survey 1, ORIGINAL_REQUEST §1 |
| 2 | Heavy Data Array Evacuation | Remove `messages` from `useAiStore` persist; persist whiteboard strokes in Dexie table; clean obsolete mock stores | M1 | Survey 1, ORIGINAL_REQUEST §1 |
| 3 | Cloud-First Rooms & Energy Source of Truth | Remove local room stores from localStorage; use `/api/rooms` and Supabase Realtime channel; authenticated wallet strictly Cloud-first | M1 | Survey 1, ORIGINAL_REQUEST §1 |
| 4 | Unified `<UserAvatar />` Component | `src/components/common/UserAvatar.tsx` with 3-tier cascade (Custom <=256px -> OAuth -> SVG 'K'/initials), `onError` fallback, real-time sync | M1 | Survey 1, ORIGINAL_REQUEST §2 |
| 5 | Avatar Integration Across All Screens | Replace divergent avatar renders in Desktop Header, Mobile Shell, Mobile Settings, Bottom Sheet, Meet room tiles, and Modals | M1 | Survey 1, ORIGINAL_REQUEST §2 |
| 6 | RFC4122 UUID v4 Utility | `src/utils/uuid.ts` replacing `Date.now() + Math.random()` across stores, services, and UI components | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 7 | Server Clock Skew Synchronization | Calculate `serverClockOffsetMs` from HTTP headers; broadcast relative timer offsets for Meet rooms | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 8 | Soft Delete Tombstones (`deleted_at`) | Add `deletedAt` / `deleted_at` to Task, Note, and Project models to prevent zombie record resurrection | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 9 | Cloud Sync for Settings & Guest AI Messages | Sync personal settings to Supabase profile; expand `mergeGuestDataOnLogin` to migrate guest AI conversations and messages | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 10 | Resilient Sync Queue with Exponential Backoff | Dexie `sync_queue` with `status: 'failed'`, `nextRetryAt`, exponential backoff calculation, and manual retry UI hook | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 11 | User Data Isolation & Pre-Logout Queue Flush | Index `userId` in Dexie v3; filter store queries by `userId`; warn/flush queue before logout | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 12 | Query Optimization, AI Pagination & Captive Portal Shield | Index queries on `focus_sessions`, paginated AI message loading, and `safeParseJson` protecting against HTML Captive Portals | M2 | Survey 2, ORIGINAL_REQUEST §3 |
| 13 | Vietcombank GAS Script Hardening | Verify and refine `scripts/vcb_email_listener.js` (LockService mutex, batch size 15, per-message try-catch, 200 OK label) | M3 | Survey 3, ORIGINAL_REQUEST §4 |
| 14 | Webhook Idempotency & Non-Blocking Settlement | Ensure `api/payment/webhook.ts` rapidly returns HTTP 200 and handles Base36/legacy codes idempotently | M3 | Survey 3, ORIGINAL_REQUEST §4 |
| 15 | VietQR Modal Mandatory Login Gate | Block unauthenticated guests from opening/viewing VietQR top-up QR in `MoMoPaymentModal.tsx` / `AiCreditsTopupModal.tsx` | M3 | Survey 3, ORIGINAL_REQUEST §4 |
| 16 | Payment Branding Realignment | Rebrand "MoMo QR" to "VietQR (Vietcombank)" across modals and services | M3 | Survey 3, ORIGINAL_REQUEST §4 |
| 17 | Global Energy Balance Refresh & Rate Limiting | Add global `visibilitychange` listener in `App.tsx` to refresh `⚡`; handle HTTP 429 rate limit cooldown in `useAiStore.ts` | M3 | Survey 3, ORIGINAL_REQUEST §4 |
| 18 | Timer Stepper IDLE & Next Round Break Application | Stepper updates `remainingSeconds` at IDLE; mid-session break change applies dynamically to next interval | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 19 | Phase Change Confirmation for Paused Sessions | Extend `MobileFocusView.tsx` phase change guard to `status !== 'idle'` to protect paused sessions | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 20 | Skip Button & Round 4/4 Reset Verification | Verify skip records 0 stats; verify Round 4/4 long break resets cycle cleanly to Round 1/4 | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 21 | Atomic Stats Increment (Anti-Double Recording) | Increment store `dailyProgress` and `todayFocusMinutes` ONLY after `recordFocusSessionAtomic` succeeds | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 22 | Runtime Midnight Rollover Activation | Hook `checkMidnightRollover` into timer `tick()` (every 60s) and document `visibilitychange` | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 23 | Task Linkage Synchronization on Update & Delete | Ensure `updateTask` and `deleteTask` sync/unlink when `linkedTaskId === id` regardless of `activeTaskId` | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 24 | Global AI Stream AbortController | Store `activeAbortController` on `useAiStore` and abort prior stream on session change or unmount | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 25 | Strict Mode Dialog Exemptions & Timer Independence | Exempt OAuth, permissions, and payment modals from strict mode violation; prevent dual personal/meet countdowns | M4 | Survey 3, ORIGINAL_REQUEST §5 |
| 26 | Full Project Regression & Forensic Audit | 0 type errors (`npm run type-check`), 100% Vitest unit tests pass, independent Forensic Audit CLEAN | M5 | All Surveys, ORIGINAL_REQUEST §Nghiệm thu |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Storage Layer & Unified UserAvatar | Features 1, 2, 3, 4, 5 (`SafeStorage`, `STORAGE_SCHEMA_VERSION`, Dexie heavy array migration, `<UserAvatar />` component & screen integration) | none | DONE |
| M2 | 7 Data Sync & DB Performance Overhauls | Features 6, 7, 8, 9, 10, 11, 12 (`uuid.ts`, clock skew, soft delete tombstones, settings/AI sync, `sync_queue` backoff, `userId` isolation, captive portal shield) | M1 | DONE |
| M3 | Vietcombank Script, VietQR Webhook & Coupon | Features 13, 14, 15, 16, 17 (`vcb_email_listener.js`, `api/payment/webhook.ts`, login gate, branding alignment, global balance refresh, 429 rate limit) | M1, M2 | PLANNED |
| M4 | Timer Engine, Task Linkage & Concurrency Logic | Features 18, 19, 20, 21, 22, 23, 24, 25 (Stepper sync, paused phase guard, atomic stats increment, midnight rollover, task linkage, AI stream abort, strict mode exemption) | M1, M2 | PLANNED |
| M5 | Full Regression Verification & Gate Hardening | Feature 26 (Project type-check, 100% Vitest unit test suite pass, Forensic Integrity Audit CLEAN) | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### M1 Storage & UserAvatar Contracts
- `src/utils/safeStorage.ts`:
  ```typescript
  export interface ISafeStorage {
    getItem(key: string, fallback?: string | null): string | null;
    setItem(key: string, value: string): boolean;
    removeItem(key: string): void;
    clear(): void;
    safeGetJSON<T>(key: string, fallback: T): T;
    safeSetJSON<T>(key: string, value: T): boolean;
  }
  export const safeStorage: ISafeStorage;
  export const STORAGE_SCHEMA_VERSION = 1;
  export function runStorageSchemaMigration(): void;
  ```
- `src/components/common/UserAvatar.tsx`:
  ```typescript
  export interface UserAvatarProps {
    user?: UserProfile | null;
    name?: string;
    avatarUrl?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number; // xs: 24, sm: 28, md: 36, lg: 48, xl: 64
    className?: string;
    ring?: boolean | string;
    alt?: string;
    showStatusDot?: boolean;
    onClick?: () => void;
  }
  export const UserAvatar: React.FC<UserAvatarProps>;
  ```

### M2 Data Sync & DB Contracts
- `src/utils/uuid.ts`:
  ```typescript
  export function generateUUID(): string; // RFC4122 v4 compliant in secure & insecure contexts
  ```
- `src/utils/safeFetch.ts`:
  ```typescript
  export function safeParseJson<T = any>(
    res: Response,
    fallbackValue?: T | null
  ): Promise<{ ok: boolean; data: T | null; error?: string }>;
  ```
- Dexie Schema v3 (`src/db/index.ts`):
  - `tasks`: `'id, userId, completed, order, updatedAt, deletedAt, synced'`
  - `notes`: `'id, userId, linkedTaskId, linkedProjectId, updatedAt, deletedAt, synced'`
  - `projects`: `'id, userId, name, createdAt, deletedAt, synced'`
  - `focus_sessions`: `'id, userId, dateString, completedAt, phase, taskId, synced'`
  - `ai_messages`: `'id, userId, conversationId, createdAt'`
  - `sync_queue`: `'id, userId, tableName, recordId, action, status, createdAt, retryCount, nextRetryAt'`
  - `whiteboard_strokes`: `'roomId, updatedAt'`

### M3 Payment & Webhook Contracts
- `scripts/vcb_email_listener.js`:
  - `LockService.getScriptLock()` (10s timeout, try-finally)
  - `newer_than:2d` query filter, batch limit 15, per-message try-catch, mark read + `VcbProcessed` on HTTP 200.
- `api/payment/webhook.ts`:
  - Non-blocking execution, idempotent HTTP 200 response.
- `src/components/MoMoPaymentModal.tsx` & `src/components/AiCreditsTopupModal.tsx`:
  - `if (!user?.id) return <LoginRequiredView />;` (hard gate against guest payments).

### M4 Timer & Task Contracts
- `src/stores/useTimerStore.ts`:
  - `onComplete`: awaits `recordFocusSessionAtomic(record)`. Only if `true`, increments `dailyProgress` and `todayFocusMinutes`.
  - `checkMidnightRollover()`: invoked on `visibilitychange` and every 60s in `tick()`.
- `src/stores/useTaskStore.ts`:
  - `updateTask` and `deleteTask`: check `useTimerStore.getState().linkedTaskId === id` to sync/unlink title.
- `src/stores/useAiStore.ts`:
  - `activeAbortController: AbortController | null` stored and aborted on conversation switch.

---

## Code Layout
- `src/utils/safeStorage.ts`
- `src/utils/uuid.ts`
- `src/utils/safeFetch.ts`
- `src/components/common/UserAvatar.tsx`
- `src/db/index.ts`
- `src/services/timerEngine.ts`
- `src/stores/useTimerStore.ts`
- `src/stores/useTaskStore.ts`
- `src/stores/useAiStore.ts`
- `src/components/mobile/views/MobileFocusView.tsx`
- `src/components/MoMoPaymentModal.tsx`
- `src/components/AiCreditsTopupModal.tsx`
- `scripts/vcb_email_listener.js`
- `api/payment/webhook.ts`
- `tests/unit/safeStorage.test.ts`
- `tests/unit/userAvatarUnified.test.tsx`
- `tests/unit/dataSyncAndDbFixes.test.ts`
- `tests/unit/paymentAndWebhook.test.ts`
- `tests/unit/timerAndTaskLogic.test.ts`
