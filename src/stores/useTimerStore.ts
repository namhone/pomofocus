import { create } from 'zustand';
import { recordFocusSessionAtomic } from '../db';
import { NotificationService } from '../services/notificationService';
import { TabCoordinator, TimerSyncPayload } from '../services/tabCoordinator';
import { TimerEngine, loadStoredSettings, persistSettings } from '../services/timerEngine';
import { FocusSessionRecord, TimerPhase, TimerSettings, TimerStatus } from '../types/timer';

interface TimerStoreState {
  phase: TimerPhase;
  status: TimerStatus;
  currentRound: number;
  remainingMs: number;
  settings: TimerSettings;
  isLeader: boolean;
  notificationPermission: NotificationPermission;
  linkedTaskId: string | null;
  linkedTaskTitle: string | null;

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  updateSettings: (newSettings: Partial<TimerSettings>) => void;
  setLinkedTask: (taskId: string | null, taskTitle: string | null) => void;
  requestNotificationPermission: () => Promise<void>;
  init: () => void;
  destroy: () => void;
}

let engineInstance: TimerEngine | null = null;
let coordinatorInstance: TabCoordinator | null = null;
let lastSyncTimestamp = 0;
let hasBoundUnload = false;

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const ROUTE_STATIC_TITLES: Record<string, string> = {
  '/billing': 'Bảng Giá & Gói Cước | PomoFocus',
  '/subscription': 'Bảng Giá & Gói Cước | PomoFocus',
  '/rooms': 'Phòng Học Nhóm Live | PomoFocus',
  '/meet': 'Phòng Học Nhóm Live | PomoFocus',
  '/calendar': 'Lịch Biểu Học Tập | PomoFocus',
  '/dashboard': 'Thống Kê Năng Suất | PomoFocus',
  '/history': 'Thống Kê Năng Suất | PomoFocus',
  '/stats': 'Thống Kê Năng Suất | PomoFocus',
  '/help': 'Trung Tâm Trợ Giúp | PomoFocus',
  '/contact': 'Liên Hệ & Phản Hồi | PomoFocus',
  '/account/security': 'Trung Tâm Bảo Mật | PomoFocus',
  '/security': 'Trung Tâm Bảo Mật | PomoFocus',
  '/profile': 'Hồ Sơ Cá Nhân | PomoFocus',
  '/settings': 'Cài Đặt Hệ Thống | PomoFocus',
  '/privacy-data': 'Quản Lý Dữ Liệu Riêng Tư | PomoFocus',
  '/data': 'Quản Lý Dữ Liệu Riêng Tư | PomoFocus',
  '/login': 'Đăng Nhập | PomoFocus',
  '/signup': 'Đăng Ký Tài Khoản | PomoFocus',
  '/terms': 'Điều Khoản Dịch Vụ | PomoFocus',
  '/privacy': 'Chính Sách Bảo Mật | PomoFocus',
  '/about': 'Giới Thiệu | PomoFocus',
  '/': 'PomoFocus — Không Gian Học Tập Tập Trung',
  '/landing': 'PomoFocus — Không Gian Học Tập Tập Trung'
};

export function getStaticRouteTitle(pathname: string): string {
  const clean = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (ROUTE_STATIC_TITLES[clean]) {
    return ROUTE_STATIC_TITLES[clean];
  }
  if (clean.startsWith('/rooms/') || clean.startsWith('/room/')) {
    return 'Phòng Học Trực Tuyến | PomoFocus';
  }
  return 'PomoFocus — Không Gian Học Tập Tập Trung';
}

export function updateDocumentTitle(
  remainingMs: number,
  phase: TimerPhase,
  status: TimerStatus,
  taskTitle?: string | null
): void {
  if (typeof document === 'undefined') return;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isWorkspace = currentPath === '/app' || currentPath.startsWith('/app/');

  // KHÓA PHẠM VI (SIDE-EFFECT ISOLATION):
  // Chỉ cập nhật tiêu đề đếm ngược khi người dùng đang ở trong không gian học tập (/app).
  // Khi ở trang khác (/billing, /profile, /rooms...), luôn hiển thị tiêu đề trang tĩnh tương ứng.
  if (!isWorkspace) {
    document.title = getStaticRouteTitle(currentPath);
    return;
  }

  if (status === 'running') {
    const timeStr = formatTime(remainingMs);
    const phaseLabel = phase === 'pomodoro' ? 'Tập trung' : phase === 'short_break' ? 'Nghỉ ngắn' : 'Nghỉ dài';
    const taskPrefix = taskTitle ? `[${taskTitle}] ` : '';
    document.title = `${taskPrefix}${timeStr} - ${phaseLabel} | PomoFocus`;
  } else if (status === 'paused') {
    const timeStr = formatTime(remainingMs);
    const taskPrefix = taskTitle ? `[${taskTitle}] ` : '';
    document.title = `[Tạm dừng] ${taskPrefix}${timeStr} | PomoFocus`;
  } else {
    document.title = 'PomoFocus — Không Gian Học Tập Tập Trung';
  }
}

const initialSettings = loadStoredSettings();

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  phase: 'pomodoro',
  status: 'idle',
  currentRound: 1,
  remainingMs: initialSettings.pomodoroMinutes * 60 * 1000,
  settings: initialSettings,
  isLeader: false,
  notificationPermission: NotificationService.getPermission(),
  linkedTaskId: null,
  linkedTaskTitle: null,

  init: () => {
    if (typeof window === 'undefined') return;

    // 1. Khởi tạo Tab Coordinator
    if (!coordinatorInstance) {
      coordinatorInstance = new TabCoordinator();
      coordinatorInstance.setOnLeaderChange((isLeader) => {
        set({ isLeader });
        if (isLeader && engineInstance) {
          // Tab vừa được thăng cấp lên Leader: Đồng bộ lại trạng thái từ storage
          engineInstance.restoreFromStorage();
          const snapshot = engineInstance.getSnapshot();
          snapshot.fromLeader = true;
          lastSyncTimestamp = snapshot.timestamp;
          set({
            phase: snapshot.phase,
            status: snapshot.status,
            currentRound: snapshot.currentRound,
            remainingMs: snapshot.remainingMs,
            linkedTaskId: snapshot.linkedTaskId ?? null,
            linkedTaskTitle: snapshot.linkedTaskTitle ?? null
          });
          updateDocumentTitle(snapshot.remainingMs, snapshot.phase, snapshot.status, snapshot.linkedTaskTitle);
        }
      });

      coordinatorInstance.setOnMessage((msg) => {
        if (msg.type === 'SYNC_STATE' || msg.type === 'TRIGGER_ACTION') {
          const payload = msg.payload;
          if (!payload) return;

          // Conflict Resolution:
          // 1. Nếu payload mới hơn (timestamp > lastSyncTimestamp) -> Chấp nhận.
          // 2. Nếu timestamp bằng nhau (Date.now collision) -> Ưu tiên snapshot từ Leader (fromLeader = true).
          // 3. Nếu timestamp cũ hơn -> Bỏ qua (Stale message).
          const isNewer = payload.timestamp > lastSyncTimestamp;
          const isTieBreakerWon = payload.timestamp === lastSyncTimestamp && Boolean(payload.fromLeader);

          if (isNewer || isTieBreakerWon) {
            lastSyncTimestamp = payload.timestamp;
            if (engineInstance) {
              engineInstance.syncFromSnapshot(payload);
            }
            set({
              phase: payload.phase,
              status: payload.status,
              currentRound: payload.currentRound,
              remainingMs: payload.remainingMs,
              linkedTaskId: payload.linkedTaskId ?? null,
              linkedTaskTitle: payload.linkedTaskTitle ?? null
            });
            updateDocumentTitle(payload.remainingMs, payload.phase, payload.status, payload.linkedTaskTitle);
          }
        } else if (msg.type === 'REQUEST_CURRENT_STATE') {
          if (coordinatorInstance && coordinatorInstance.isLeader && engineInstance) {
            const snapshot = engineInstance.getSnapshot();
            snapshot.fromLeader = true;
            coordinatorInstance.broadcast({
              type: 'SYNC_STATE',
              payload: snapshot
            });
          }
        }
      });

      // Yêu cầu lock để xác định Leader
      coordinatorInstance.requestLeadership().catch((err) => {
        console.warn('Lỗi request leadership:', err);
      });

      // Hỏi Leader hiện tại về state mới nhất
      coordinatorInstance.broadcast({ type: 'REQUEST_CURRENT_STATE' });
    }

    // 2. Khởi tạo Timer Engine
    if (!engineInstance) {
      engineInstance = new TimerEngine(get().settings, {
        onTick: (remainingMs, phase, status) => {
          set({ remainingMs, phase, status });
          updateDocumentTitle(remainingMs, phase, status, get().linkedTaskTitle);
        },
        onPhaseChange: (phase, currentRound) => {
          set({ phase, currentRound });
        },
        onComplete: async (record: FocusSessionRecord, nextPhase: TimerPhase) => {
          // Thử ghi nhận phiên vào IndexedDB bằng Atomic Transaction
          let wasRecorded = false;
          try {
            wasRecorded = await recordFocusSessionAtomic(record);
          } catch (err) {
            console.error('Lỗi khi ghi nhận phiên vào IndexedDB:', err);
            wasRecorded = false;
          }

          if (wasRecorded) {
            // Cập nhật phản ứng tức thời vào useTaskStore
            if (record.taskId && record.phase === 'pomodoro') {
              try {
                const { useTaskStore } = await import('./useTaskStore');
                await useTaskStore.getState().loadTasksAndProjects();
              } catch (err) {
                console.warn('Lỗi cập nhật task store sau phiên Pomodoro:', err);
              }
            }

            const phaseName = record.phase === 'pomodoro' ? 'Hiệp tập trung' : 'Giờ giải lao';
            const taskInfo = record.taskTitle ? ` cho việc "${record.taskTitle}"` : '';
            NotificationService.notify(`🎉 ${phaseName}${taskInfo} đã hoàn thành!`, {
              body: `Tiếp theo: ${nextPhase === 'pomodoro' ? 'Tập trung' : 'Nghỉ ngơi'}.`
            });
            // Chuông báo kết thúc hiệp (chỉ duy nhất tab ghi nhận thành công mới phát chuông)
            try {
              const { useAudioStore } = await import('./useAudioStore');
              useAudioStore.getState().playChime().catch((err) => {
                console.warn('Lỗi phát chuông báo kết thúc hiệp:', err);
              });
            } catch (err) {
              console.warn('Không thể nạp module âm thanh để phát chuông:', err);
            }
          }

          // Tab Leader đồng bộ trạng thái hiệp kế tiếp tới các tab khác
          if (get().isLeader && coordinatorInstance && engineInstance) {
            const snapshot = engineInstance.getSnapshot();
            snapshot.fromLeader = true;
            lastSyncTimestamp = snapshot.timestamp;
            coordinatorInstance.broadcast({ type: 'SYNC_STATE', payload: snapshot });
          }
        }
      });

      // Khôi phục từ localStorage nếu có
      engineInstance.restoreFromStorage();

      set({
        phase: engineInstance.getPhase(),
        status: engineInstance.getStatus(),
        currentRound: engineInstance.getCurrentRound(),
        remainingMs: engineInstance.getRemainingMs(),
        settings: engineInstance.getSettings(),
        linkedTaskId: engineInstance.getLinkedTaskId(),
        linkedTaskTitle: engineInstance.getLinkedTaskTitle()
      });
    }

    // Gắn dọn dẹp khi đóng hoặc rời tab chuẩn Best Practices (beforeunload, pagehide)
    if (!hasBoundUnload) {
      hasBoundUnload = true;
      const cleanupTab = () => {
        if (coordinatorInstance) {
          coordinatorInstance.destroy();
        }
      };
      window.addEventListener('beforeunload', cleanupTab);
      window.addEventListener('pagehide', cleanupTab);
    }
  },

  setLinkedTask: (taskId: string | null, taskTitle: string | null) => {
    if (engineInstance) {
      engineInstance.setLinkedTask(taskId, taskTitle);
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      payload.fromLeader = get().isLeader;
      lastSyncTimestamp = payload.timestamp;

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'SYNC_STATE', payload });
      }
    }
    set({
      linkedTaskId: taskId,
      linkedTaskTitle: taskTitle
    });
    updateDocumentTitle(get().remainingMs, get().phase, get().status, taskTitle);
  },

  start: () => {
    if (engineInstance) {
      engineInstance.start();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      payload.fromLeader = get().isLeader;
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs,
        linkedTaskId: payload.linkedTaskId ?? null,
        linkedTaskTitle: payload.linkedTaskTitle ?? null
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status, payload.linkedTaskTitle);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'start', payload });
      }
    }
  },

  pause: () => {
    if (engineInstance) {
      engineInstance.pause();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      payload.fromLeader = get().isLeader;
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status, get().linkedTaskTitle);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'pause', payload });
      }
    }
  },

  resume: () => {
    if (engineInstance) {
      engineInstance.resume();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      payload.fromLeader = get().isLeader;
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status, get().linkedTaskTitle);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'resume', payload });
      }
    }
  },

  reset: () => {
    if (engineInstance) {
      engineInstance.reset();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      payload.fromLeader = get().isLeader;
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status, get().linkedTaskTitle);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'reset', payload });
      }
    }
  },

  skip: () => {
    if (engineInstance) {
      engineInstance.skip();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      payload.fromLeader = get().isLeader;
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status, get().linkedTaskTitle);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'skip', payload });
      }
    }
  },

  updateSettings: (newSettings: Partial<TimerSettings>) => {
    if (engineInstance) {
      engineInstance.updateSettings(newSettings);
      set({
        settings: engineInstance.getSettings(),
        remainingMs: engineInstance.getRemainingMs(),
        phase: engineInstance.getPhase(),
        status: engineInstance.getStatus()
      });
    } else {
      const merged = { ...get().settings, ...newSettings };
      persistSettings(merged);
      set({
        settings: merged,
        remainingMs: merged.pomodoroMinutes * 60 * 1000
      });
    }

    // Tự động lưu thiết lập đồng hồ vào public.profiles.settings trên Cloud
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawUser = localStorage.getItem('pomodoro_study_auth_session');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u?.id) {
            import('../services/userSettingsService')
              .then(({ userSettingsService }) => {
                userSettingsService.saveSettings(u.id);
              })
              .catch(() => {});
          }
        }
      }
    } catch {}
  },

  requestNotificationPermission: async () => {
    const permission = await NotificationService.requestPermission();
    set({ notificationPermission: permission });
  },

  destroy: () => {
    if (engineInstance) {
      engineInstance.destroy();
      engineInstance = null;
    }
    if (coordinatorInstance) {
      coordinatorInstance.destroy();
      coordinatorInstance = null;
    }
  }
}));

if (typeof window !== 'undefined') {
  (window as unknown as { useTimerStore: typeof useTimerStore; recordFocusSessionAtomic: typeof recordFocusSessionAtomic }).useTimerStore = useTimerStore;
  (window as unknown as { useTimerStore: typeof useTimerStore; recordFocusSessionAtomic: typeof recordFocusSessionAtomic }).recordFocusSessionAtomic = recordFocusSessionAtomic;
}

