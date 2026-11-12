# Original User Request

## Parameters

[skip-interview]
How this run was launched; not part of the task.

## Approved Task Prompt — 2026-11-11T13:29:00Z

/uiux-pro-max /pomofocus-backend-rebuild /karpathy-guidelines /deep-research /browser

# MASTER TECHNICAL DIRECTIVE: ĐẠI PHẪU THUẬT POMOFOCUS V8.1 TỔNG LỰC (ALL-IN-ONE FOCUS HUB, MEET WEB & STANDALONE APK)

## 1. MỤC TIÊU TỐI THƯỢNG VÀ NGUYÊN TẮC BẤT BIẾN
1. **Thiết lập Môi trường Testbed Thực tế cho Agent**:
   - Mở cổng mạng nội bộ: Cấu hình `vite.config.ts` với `server: { host: '0.0.0.0', port: 5173 }` để người dùng có thể mở điện thoại cùng mạng WiFi test trực tiếp theo thời gian thực (Hot-Reload).
   - Kiểm thử E2E di động bằng Playwright bắt buộc chạy trên profile `devices['Pixel 7']` (`hasTouch: true`, `deviceScaleFactor: 2.75`) và tự động chụp ảnh nghiệm thu bằng mắt (`mobile_test_report.png`).
2. **Kiến Trúc Đồng Bộ Đám Mây (Local-First Hybrid)**:
   - Khi chưa đăng nhập: Dữ liệu (công việc, số phút học, lịch sử chat AI, ghi chú) lưu 100% cục bộ vào IndexedDB (Dexie.js).
   - Khi đăng nhập: Kích hoạt khay đăng nhập vuốt từ đáy (Bottom Sheet Auth) hỗ trợ Google OAuth 1 chạm; tự động đồng bộ hai chiều (Bi-directional Sync) lên Supabase Cloud.
   - Số dư ví năng lượng `⚡` và quyền Pro nằm độc quyền tại Supabase Database (`user_wallets`), tuân thủ Stored Procedures nguyên tử (`preflight_ai_check`, `commit_ai_charge`).
3. **Hoàn thiện Chức năng Meet trên Web (`/rooms`) làm bàn đạp cho APK**:
   - Đồng bộ đồng hồ nhóm (Group Synced Timer) qua Supabase Realtime Broadcast `room:${roomId}`.
   - Bảng trắng nhóm (Shared Whiteboard) bảo toàn nét vẽ trong IndexedDB/state, không bị xóa khi chuyển tab.
4. **Triệt tiêu toàn bộ Hạt Sạn Trải Nghiệm trên Mobile**:
   - Lưu bền vững lịch sử chat AI vào IndexedDB (`db.ai_messages`), mở lại app không bị mất chat.
   - Khắc phục lỗi mất chuông khi tự chuyển hiệp bằng cách kích hoạt `AudioContext` liên tục + rung Haptic notification.
   - Nút "Tắt nền (Pure Zen Black)" 1 chạm ngay đầu tab Không gian để trả về nền đen tuyền OLED `#09090b`.
   - Khóa chạm chống bấm nhầm bỏ túi (Pocket Lock `🔒`): chạm để khóa, ấn giữ 1.5s để mở.
   - Kéo thả sắp xếp thứ tự ưu tiên công việc (Reorder Tasks).
   - Biểu đồ dòng thời gian trong ngày (Daily Flow Strip 24h) và biểu đồ 7 ngày (Weekly Insights).

---

## 2. NÂNG CẤP HẠ TẦNG DỮ LIỆU CỤC BỘ DEXIE.JS (`src/db/index.ts`)
Khởi tạo bảng lưu trữ hội thoại AI và hàng đợi đồng bộ bền vững trong `PomoDatabase`:
```typescript
import Dexie, { Table } from 'dexie';

export interface LocalTask {
  id: string;
  userId: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  completed: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface LocalFocusSession {
  id: string;
  userId: string;
  taskId?: string;
  durationMinutes: number;
  phase: 'work' | 'shortBreak' | 'longBreak';
  completedAt: number;
  dateString: string;
  synced: boolean;
}

export interface LocalAiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface SyncMutation {
  id: string;
  tableName: 'tasks' | 'notes' | 'focus_sessions';
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: number;
  retryCount: number;
}

export class PomoDatabase extends Dexie {
  tasks!: Table<LocalTask, string>;
  focus_sessions!: Table<LocalFocusSession, string>;
  ai_messages!: Table<LocalAiMessage, string>;
  sync_queue!: Table<SyncMutation, string>;

  constructor() {
    super('PomoFocusLocalDB_v2');
    this.version(2).stores({
      tasks: 'id, userId, completed, order, updatedAt, synced',
      focus_sessions: 'id, userId, dateString, completedAt, synced',
      ai_messages: 'id, conversationId, createdAt',
      sync_queue: 'id, tableName, recordId, createdAt, retryCount',
    });
  }
}

export const db = new PomoDatabase();
```
(Important compatibility note from existing workspace: keep existing `PomodoroDatabase`/`db` exports, tables like `projects`, `notes`, `custom_backgrounds`, `planner_blocks`, `recordFocusSessionAtomic`, and existing field mappings/migrations compatible or additive so all existing 1,519 unit tests continue passing cleanly unless explicitly upgraded!)

## 3. THI CÔNG KHAY ĐĂNG NHẬP VUỐT ĐÁY (`src/components/mobile/auth/MobileAuthBottomSheet.tsx`)
Xây dựng khay đăng nhập kính lỏng vuốt từ đáy (Liquid Bottom Sheet) khi người dùng chạm vào avatar trên Header hoặc nút Đăng nhập trong Cài đặt:
- Hỗ trợ nút đăng nhập Google 1 chạm (Supabase OAuth).
- Hỗ trợ đăng nhập Magic Link gửi về email.
- Khi đăng nhập thành công: Hiển thị khối Bento Grid hồ sơ cá nhân (Tổng giờ học, Chuỗi streak, Cà chua hoàn thành, Số dư ví `⚡`).

## 4. TÁI THIẾT KẾ MÀN HÌNH TẬP TRUNG (ALL-IN-ONE FOCUS HUB)
Trong `src/components/mobile/views/MobileFocusView.tsx`:
- Quick Task Bar 1 Chạm: Nằm ngay dưới cụm viên nang chọn hiệp; hiển thị `[ ○ 🎯 Tên task đang làm · 1/3 🍅 ]` kèm nút tích tròn `○` (ấn vào tích `✓`, hoàn thành task, bắn hoạt ảnh ngọc bích `animate-jade-burst`); chạm vào thân viên nang để mở menu trượt chọn nhanh task khác mà không rời màn hình. (Note: V8.0 already implemented baseline 1-Tap Quick Task Bar, `animate-jade-burst`, Forest Strict Mode `5s`, Daily Flow Strip 24h & Soundscape Mixer in `MobileFocusView.tsx` & `MobileAppShell.tsx` at commit `816c16e` — inspect and extend/refine carefully!)
- Khóa Chạm Bỏ Túi (Pocket Lock `🔒`): Icon ổ khóa nhỏ trên góc. Bấm vào vô hiệu hóa cảm ứng toàn màn hình; ấn giữ 1.5s để mở khóa, chống bấm nhầm khi đút túi quần.
- Daily Flow Strip (Dòng thời gian 24h & Tổng kết ngày): Thanh ngang mini 24 vạch hiển thị các khung giờ đã học lấy từ `db.focus_sessions`. Dòng tổng kết: `Hôm nay: {hours}g {minutes}ph • {completedPomos} 🍅 hoàn thành`.
- Nghi Thức Cam Kết Học (Hold to Start): Nút Bắt đầu hỗ trợ ấn giữ 800ms để kích hoạt, rung haptic tăng dần nhịp độ tạo mỏ neo tâm lý tập trung sâu (while keeping 1-tap start accessible too!).

## 5. HOÀN THIỆN CHỨC NĂNG POMOFOCUS MEET TRÊN WEB (`/rooms`)
- Group Synced Pomodoro: Sử dụng kênh Supabase Realtime Broadcast `room:${roomId}`. Khi Host bấm Bắt đầu/Tạm dừng/Đổi hiệp: Broadcast sự kiện để toàn bộ thành viên trong phòng đồng bộ thời gian tức thì.
- Shared Whiteboard: Lưu vết mảng nét vẽ strokes vào state và IndexedDB để khi chuyển qua lại giữa lưới camera và Whiteboard không bị mất hình vẽ.

## 6. QUY TRÌNH ĐÓNG GÓI APK STANDALONE & TRIỂN KHAI PRODUCTION
- Cấu hình `vite.config.ts`: Thêm `server: { host: '0.0.0.0', port: 5173 }`.
- Biên dịch & Đóng gói APK: `npm run build`, `npx cap sync android`, `cd android && ./gradlew assembleDebug` (or `npm run build:apk` updated for V8.1!), sao chép APK sạch ra `public/downloads/PomoFocus-v8.1.apk`, cập nhật `public/version.json` phiên bản `8.1.0` + SHA-256 + `WebDownloadHub.tsx` + `LiquidUpdateBanner.tsx` + version-pinned tests.
- Kiểm thử & Deploy: `npm run type-check` (0 lỗi), toàn bộ Vitest test suites (100% xanh lá), Playwright Pixel 7 test + `mobile_test_report.png`, push commit lên `master`/`main` và deploy đồng thời cả 2 domain Vercel (`pomofocus-workspace.vercel.app` & `pomofocus-workplace.vercel.app`), kiểm tra & xử lý lỗi `"Not authorized"` của Vercel CLI nếu token/team config cần điều chỉnh hoặc báo cáo chính xác nếu cần người dùng tái xác thực Vercel.

Quoted baseline verified before this directive:
- Current HEAD commit `816c16e` (`master` & `origin/main`): V8.0 code already in repo (`105` test files / `1519` unit tests passed), `public/downloads/PomoFocus-v8.0.apk`, `public/version.json` `8.0.0`.
- Remember mandatory governance in `AGENTS.md` and `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` (Playwright check + 5-step UI checklist + Founder VIP whitelist).
