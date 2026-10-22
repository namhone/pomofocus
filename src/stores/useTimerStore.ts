import { create } from 'zustand';
import { recordFocusSessionAtomic } from '../db';
import { NotificationService } from '../services/notificationService';
import { TabCoordinator } from '../services/tabCoordinator';
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
let isInternalSync = false;

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
  isLeader: true,
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
        if (msg.type === 'TRIGGER_ACTION') {
          isInternalSync = true;
          try {
            const state = get();
            switch (msg.action) {
              case 'start':
                state.start();
                break;
              case 'pause':
                state.pause();
                break;
              case 'resume':
                state.resume();
                break;
              case 'reset':
                state.reset();
                break;
              case 'skip':
                state.skip();
                break;
            }
          } finally {
            isInternalSync = false;
          }
        }
      });

      // Yêu cầu lock để xác định Leader
      coordinatorInstance.requestLeadership().catch((err) => {
        console.warn('Lỗi request leadership:', err);
      });
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
          // Chỉ tab Leader ghi vào IndexedDB và gửi thông báo để tránh trùng lặp
          if (get().isLeader) {
            await recordFocusSessionAtomic(record);

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
  },

  start: () => {
    if (engineInstance) {
      engineInstance.start();
      if (!isInternalSync && coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'start' });
      }
    }
  },

  pause: () => {
    if (engineInstance) {
      engineInstance.pause();
      if (!isInternalSync && coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'pause' });
      }
    }
  },

  resume: () => {
    if (engineInstance) {
      engineInstance.resume();
      if (!isInternalSync && coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'resume' });
      }
    }
  },

  reset: () => {
    if (engineInstance) {
      engineInstance.reset();
      if (!isInternalSync && coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'reset' });
      }
    }
  },

  skip: () => {
    if (engineInstance) {
      engineInstance.skip();
      if (!isInternalSync && coordinatorInstance) {
        coordinatorInstance.broadcast({ type: 'TRIGGER_ACTION', action: 'skip' });
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
