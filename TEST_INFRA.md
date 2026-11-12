# E2E Test Infra: PomoFocus V8.1

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Derived from ORIGINAL_REQUEST.md.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Target: Pixel 7 mobile profile (`hasTouch: true`, `deviceScaleFactor: 2.75`) + desktop Chrome.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | Vite LAN Testbed | ORIGINAL_REQUEST §1.1 | 5 | 5 | ✓ | ✓ |
| 2 | Playwright Pixel 7 E2E | ORIGINAL_REQUEST §1.1 | 5 | 5 | ✓ | ✓ |
| 3 | Dexie.js v2 Schema | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ | ✓ |
| 4 | AI Message Persistence | ORIGINAL_REQUEST §1.4, §2 | 5 | 5 | ✓ | ✓ |
| 5 | Sync Mutation Queue | ORIGINAL_REQUEST §1.2, §2 | 5 | 5 | ✓ | ✓ |
| 6 | Liquid Bottom Sheet Auth | ORIGINAL_REQUEST §1.2, §3 | 5 | 5 | ✓ | ✓ |
| 7 | Auth Triggers | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ | ✓ |
| 8 | Pocket Lock 🔒 | ORIGINAL_REQUEST §1.4, §4 | 5 | 5 | ✓ | ✓ |
| 9 | Hold to Start 800ms | ORIGINAL_REQUEST §4 | 5 | 5 | ✓ | ✓ |
| 10 | Quick Task Bar 1-Tap | ORIGINAL_REQUEST §4 | 5 | 5 | ✓ | ✓ |
| 11 | Pure Zen Black 1-Tap | ORIGINAL_REQUEST §1.4 | 5 | 5 | ✓ | ✓ |
| 12 | AudioContext Keep-Alive | ORIGINAL_REQUEST §1.4 | 5 | 5 | ✓ | ✓ |
| 13 | Task Priority Reordering | ORIGINAL_REQUEST §1.4 | 5 | 5 | ✓ | ✓ |
| 14 | Weekly Insights 7-Day | ORIGINAL_REQUEST §1.4, §4 | 5 | 5 | ✓ | ✓ |
| 15 | Group Synced Pomodoro | ORIGINAL_REQUEST §1.3, §5 | 5 | 5 | ✓ | ✓ |
| 16 | Persistent Shared Whiteboard | ORIGINAL_REQUEST §1.3, §5 | 5 | 5 | ✓ | ✓ |
| 17 | Standalone APK v8.1 Build | ORIGINAL_REQUEST §6 | 5 | 5 | ✓ | ✓ |
| 18 | Version Synchronization 8.1.0 | ORIGINAL_REQUEST §6 | 5 | 5 | ✓ | ✓ |
| 19 | Dual Vercel Deployment | ORIGINAL_REQUEST §6 | 5 | 5 | ✓ | ✓ |

## Coverage Goals
- 19 features * 5 = 95 Tier 1 tests
- 19 features * 5 = 95 Tier 2 tests
- 19 pairwise Tier 3 tests
- 10 Tier 4 end-to-end user journeys
- Total: >= 219 comprehensive test cases
