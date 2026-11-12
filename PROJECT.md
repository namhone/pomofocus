# Project: PomoFocus V8.1 All-in-One Focus Hub, Meet Web & Standalone APK

## Architecture
- **Data Layer (Local-First Hybrid)**: Dexie.js v2 `PomoDatabase` with 8 tables (`tasks`, `focus_sessions`, `ai_messages`, `sync_queue`, `projects`, `notes`, `custom_backgrounds`, `planner_blocks`), backward compatible with `PomodoroDatabase`. Offline mutation queue with Supabase sync. Server-authoritative wallet/credits (`user_wallets`).
- **Mobile UI & Focus Hub**: MobileAppShell with `MobileAuthBottomSheet` (Google OAuth 1-tap, Magic Link, Bento Grid Profile), `MobileFocusView` (Quick Task Bar 1-tap with sliding picker drawer, Pocket Lock `🔒` with 1.5s hold, Hold to Start 800ms with escalating haptics, Pure Zen Black `#09090b` 1-tap, Task priority reordering, 24h Daily Flow Strip, 7-day Weekly Insights, AudioContext keep-alive & phase haptics).
- **Meet Rooms Web (/rooms)**: Supabase Realtime Broadcast `room:${roomId}` for Group Synced Pomodoro (`room-timer-sync`), Shared Whiteboard with dual in-memory and IndexedDB stroke persistence across tab switching and reloads.
- **Packaging, Testbed & Production Deployment**: `vite.config.ts` LAN host `0.0.0.0:5173`, Playwright Pixel 7 E2E testbed generating `mobile_test_report.png`, standalone `PomoFocus-v8.1.apk` packaging via Gradle, version bump to `8.1.0` with SHA-256 checksum, and dual Vercel deployment (`pomofocus-workspace.vercel.app` & `pomofocus-workplace.vercel.app`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Vite LAN Testbed | `server: { host: '0.0.0.0', port: 5173 }` in `vite.config.ts` | M4 | Survey E3 / Directive 1.1 |
| 2 | Playwright Pixel 7 E2E | Mobile test profile `devices['Pixel 7']` with `hasTouch: true`, `deviceScaleFactor: 2.75` producing `mobile_test_report.png` | M4 | Survey E3 / Directive 1.1 |
| 3 | Dexie.js v2 Schema | `PomoDatabase` with `tasks`, `focus_sessions`, `ai_messages`, `sync_queue` + 4 existing tables, 100% backward compatible | M1 | Survey E1 / Directive 2 |
| 4 | AI Message Persistence | Durable `db.ai_messages` persistence, eliminating 50-message cap and guest chat loss | M1 | Survey E1 / Directive 1.4, 2 |
| 5 | Sync Mutation Queue | Offline mutation queue `db.sync_queue` and bidirectional sync worker for cloud sync | M1 | Survey E1 / Directive 1.2, 2 |
| 6 | Liquid Bottom Sheet Auth | `MobileAuthBottomSheet.tsx` with Google 1-tap, Magic Link, and post-login Bento Grid Profile | M2 | Survey E2 / Directive 1.2, 3 |
| 7 | Auth Triggers | Header avatar button and settings card click triggers for `MobileAuthBottomSheet` | M2 | Survey E2 / Directive 3 |
| 8 | Pocket Lock 🔒 | Full-screen touch interceptor (`z-[70]`), tap to lock, hold 1.5s to unlock | M2 | Survey E2 / Directive 1.4, 4 |
| 9 | Hold to Start 800ms | Primary timer action button with 800ms hold & escalating haptics + accessible 1-tap | M2 | Survey E2 / Directive 4 |
| 10 | Quick Task Bar 1-Tap | Circular checkmark '○', jade burst animation, sliding task selection drawer without leaving screen | M2 | Survey E2 / Directive 4 |
| 11 | Pure Zen Black 1-Tap | 1-tap button at top of Spaces tab resetting to OLED pure black `#09090b` | M2 | Survey E2 / Directive 1.4 |
| 12 | AudioContext Keep-Alive | Continuous audio keep-alive and haptic pulse on phase transitions | M2 | Survey E2 / Directive 1.4 |
| 13 | Task Priority Reordering | Up/Down reorder controls in Mobile Tasks view adjusting `orderIndex` and IndexedDB | M2 | Survey E2 / Directive 1.4 |
| 14 | Weekly Insights 7-Day | 7-day focus distribution visualization connected to `db.focus_sessions` | M2 | Survey E2 / Directive 1.4, 4 |
| 15 | Group Synced Pomodoro | Supabase Realtime broadcast `room-timer-sync` on `room:${roomId}` synchronizing timer state across peers | M3 | Survey E3 / Directive 1.3, 5 |
| 16 | Persistent Shared Whiteboard | Strokes saved in state and IndexedDB so switching between camera grid and whiteboard preserves drawing | M3 | Survey E3 / Directive 1.3, 5 |
| 17 | Standalone APK v8.1 Build | Compile `PomoFocus-v8.1.apk` via `scripts/buildApk.ts`, compute SHA-256 and update download pointers | M4 | Survey E3 / Directive 6 |
| 18 | Version Synchronization 8.1.0 | Bump version to 8.1.0 across `version.json`, `android/app/build.gradle`, UI banners, download hubs, and 8 pinned test files | M4 | Survey E3 / Directive 6 |
| 19 | Dual Vercel Deployment | Deploy release simultaneously to `pomofocus-workspace.vercel.app` & `pomofocus-workplace.vercel.app` | M4 | Survey E3 / Directive 6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dexie.js v2 Storage & Sync Queue | `src/db/index.ts`, `src/types/`, `src/stores/useAiStore.ts`, `src/services/syncQueueService.ts`, backward compatibility with all 1,519 unit tests | none | DONE |
| M2 | Mobile Focus Hub & Liquid Auth | `src/components/mobile/auth/MobileAuthBottomSheet.tsx`, `MobileFocusView.tsx`, `MobileAppShell.tsx`, Pocket Lock, Hold to Start, Pure Zen Black, Reordering, Audio Keep-alive | M1 | DONE |
| M3 | Meet Rooms Realtime Sync & Whiteboard | `src/components/StudyRoomView.tsx`, `room-timer-sync` broadcast, IndexedDB stroke persistence | M1 | DONE |
| M4 | Standalone APK, Playwright & Deployment | `vite.config.ts`, `playwright.config.ts`, `scripts/buildApk.ts`, version 8.1.0 sync, `PomoFocus-v8.1.apk`, Pixel 7 visual report, dual Vercel deploy | M1, M2, M3 | DONE |
| M-E2E | Dual Track: E2E Test Suite | Opaque-box E2E test suite (Tiers 1-4) covering all features in inventory | parallel | DONE |
| M5 | Victory Claim & Final Audit | Master delivery synthesis, Sentinel Victory claim, final independent audit | M1-M4 | IN_PROGRESS |

## Code Layout
- `src/db/index.ts`: Dexie v2 database, tables, schema versioning, and transaction helpers.
- `src/types/tasks.ts`, `src/types/timer.ts`: Data types and entity models.
- `src/stores/`: Zustand stores (`useAiStore`, `useTaskStore`, `useTimerStore`, `useAuthStore`).
- `src/services/`: Services (`syncQueueService`, `authService`, `googleAuthService`).
- `src/components/mobile/`: Mobile UI components (`MobileAppShell.tsx`, `views/MobileFocusView.tsx`, `views/MobileSettingsView.tsx`, `auth/MobileAuthBottomSheet.tsx`).
- `src/components/StudyRoomView.tsx`: Meet room WebRTC, Supabase Realtime channel, and whiteboard coordination.
- `scripts/buildApk.ts`: Automated Capacitor Android APK packaging pipeline.
- `playwright.config.ts`, `tests/e2e/`: E2E test specifications.
- `public/version.json`, `public/downloads/`: Version manifest and distribution binaries.

## Interface Contracts
### Dexie Database (M1) ↔ Mobile & Meet (M2, M3)
- `db.tasks`: Table<LocalTask, string> (compatible with Task)
- `db.focus_sessions`: Table<LocalFocusSession, string> (compatible with FocusSessionRecord)
- `db.ai_messages`: Table<LocalAiMessage, string>
- `db.sync_queue`: Table<SyncMutation, string>
- `recordFocusSessionAtomic(record)`: ACID transaction returning Promise<boolean>

### Meet Realtime Sync (M3)
- Channel: `room:${roomId}`
- Event: `'room-timer-sync'`
- Payload: `{ action: 'START' | 'PAUSE' | 'RESET' | 'PHASE_CHANGE', remainingSeconds: number, isRunning: boolean, phase: string, senderId: string, timestamp: number }`
