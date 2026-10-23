import { create } from 'zustand';
import { recordFocusSessionAtomic } from '../db';
import { NotificationService } from '../services/notificationService';
import { TabCoordinator, TimerSyncPayload } from '../services/tabCoordinator';
import { DEFAULT_SETTINGS, TimerEngine } from '../services/timerEngine';
import { FocusSessionRecord, TimerPhase, TimerSettings, TimerStatus } from '../types/timer';

interface TimerStoreState {
  phase: TimerPhase;
  status: TimerStatus;
  currentRound: number;
  remainingMs: number;
  settings: TimerSettings;
  isLeader: boolean;
  notificationPermission: NotificationPermission;

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  updateSettings: (newSettings: Partial<TimerSettings>) => void;
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

function updateDocumentTitle(remainingMs: number, phase: TimerPhase, status: TimerStatus): void {
  if (typeof document === 'undefined') return;

  if (status === 'running') {
    const timeStr = formatTime(remainingMs);
    const label = phase === 'pomodoro' ? 'Focus' : phase === 'short_break' ? 'Short Break' : 'Long Break';
    document.title = `${timeStr} | ${label} - Pomodoro`;
  } else if (status === 'paused') {
    document.title = `[Tạm dừng] Pomodoro`;
  } else {
    document.title = 'Immersive Pomodoro Workspace';
  }
}

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  phase: 'pomodoro',
  status: 'idle',
  currentRound: 1,
  remainingMs: DEFAULT_SETTINGS.pomodoroMinutes * 60 * 1000,
  settings: DEFAULT_SETTINGS,
  isLeader: false,
  notificationPermission: NotificationService.getPermission(),

  init: () => {
    if (typeof window === 'undefined') return;

    // 1. Khởi tạo Tab Coordinator
    if (!coordinatorInstance) {
      coordinatorInstance = new TabCoordinator();
      coordinatorInstance.setOnLeaderChange((isLeader) => {
        set({ isLeader });
      });

      coordinatorInstance.setOnMessage((msg) => {
        if (msg.type === 'SYNC_STATE' || msg.type === 'TRIGGER_ACTION') {
          const payload = msg.payload;
          // Ngăn ngừa Out-of-Order messages: Chỉ nhận snapshot có timestamp mới hơn hoặc bằng
          if (payload && payload.timestamp >= lastSyncTimestamp) {
            lastSyncTimestamp = payload.timestamp;
            if (engineInstance) {
              engineInstance.syncFromSnapshot(payload);
            }
            set({
              phase: payload.phase,
              status: payload.status,
              currentRound: payload.currentRound,
              remainingMs: payload.remainingMs
            });
            updateDocumentTitle(payload.remainingMs, payload.phase, payload.status);
          }
        } else if (msg.type === 'REQUEST_CURRENT_STATE') {
          // Tab khác mới mở yêu cầu Leader cung cấp state hiện tại
          if (coordinatorInstance && coordinatorInstance.isLeader && engineInstance) {
            coordinatorInstance.broadcast({
              type: 'SYNC_STATE',
              payload: engineInstance.getSnapshot()
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
          updateDocumentTitle(remainingMs, phase, status);
        },
        onPhaseChange: (phase, currentRound) => {
          set({ phase, currentRound });
        },
        onComplete: async (record: FocusSessionRecord, nextPhase: TimerPhase) => {
          // Thử ghi nhận phiên vào IndexedDB bằng Atomic Transaction
          const wasRecorded = await recordFocusSessionAtomic(record);

          // CHỈ tab nào ghi thành công (wasRecorded === true) mới được kích hoạt side-effect
          // Loại bỏ 100% race condition gửi 2 thông báo notification khi có 2 tab cùng mở
          if (wasRecorded) {
            const phaseName = record.phase === 'pomodoro' ? 'Hiệp tập trung' : 'Giờ giải lao';
            NotificationService.notify(`🎉 ${phaseName} đã hoàn thành!`, {
              body: `Tiếp theo: ${nextPhase === 'pomodoro' ? 'Tập trung' : 'Nghỉ ngơi'}.`
            });
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
        settings: engineInstance.getSettings()
      });
    }

    // Gắn dọn dẹp khi đóng tab
    if (!hasBoundUnload) {
      hasBoundUnload = true;
      window.addEventListener('beforeunload', () => {
        if (coordinatorInstance) {
          coordinatorInstance.destroy();
        }
      });
    }
  },

  start: () => {
    if (engineInstance) {
      engineInstance.start();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'start', payload });
      }
    }
  },

  pause: () => {
    if (engineInstance) {
      engineInstance.pause();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'pause', payload });
      }
    }
  },

  resume: () => {
    if (engineInstance) {
      engineInstance.resume();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'resume', payload });
      }
    }
  },

  reset: () => {
    if (engineInstance) {
      engineInstance.reset();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'reset', payload });
      }
    }
  },

  skip: () => {
    if (engineInstance) {
      engineInstance.skip();
      const payload: TimerSyncPayload = engineInstance.getSnapshot();
      lastSyncTimestamp = payload.timestamp;

      set({
        phase: payload.phase,
        status: payload.status,
        currentRound: payload.currentRound,
        remainingMs: payload.remainingMs
      });
      updateDocumentTitle(payload.remainingMs, payload.phase, payload.status);

      if (coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'skip', payload });
      }
    }
  },

  updateSettings: (newSettings: Partial<TimerSettings>) => {
    if (engineInstance) {
      engineInstance.updateSettings(newSettings);
      set({ settings: engineInstance.getSettings() });
    }
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
