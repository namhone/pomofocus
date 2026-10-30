import { FocusSessionRecord, PersistedTimerRuntime, TimerPhase, TimerSettings, TimerStatus } from '../types/timer';
import { TimerSyncPayload } from './tabCoordinator';

export const DEFAULT_SETTINGS: TimerSettings = {
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoTransition: false,
  notificationEnabled: false,
};

export const SETTINGS_STORAGE_KEY = 'pomodoro_timer_settings_v1';
export const RUNTIME_STORAGE_KEY = 'pomodoro_timer_runtime';

export function loadStoredSettings(): TimerSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      pomodoroMinutes: typeof parsed.pomodoroMinutes === 'number' && parsed.pomodoroMinutes > 0 ? parsed.pomodoroMinutes : DEFAULT_SETTINGS.pomodoroMinutes,
      shortBreakMinutes: typeof parsed.shortBreakMinutes === 'number' && parsed.shortBreakMinutes > 0 ? parsed.shortBreakMinutes : DEFAULT_SETTINGS.shortBreakMinutes,
      longBreakMinutes: typeof parsed.longBreakMinutes === 'number' && parsed.longBreakMinutes > 0 ? parsed.longBreakMinutes : DEFAULT_SETTINGS.longBreakMinutes,
      roundsBeforeLongBreak: typeof parsed.roundsBeforeLongBreak === 'number' && parsed.roundsBeforeLongBreak > 0 ? parsed.roundsBeforeLongBreak : DEFAULT_SETTINGS.roundsBeforeLongBreak,
      autoTransition: Boolean(parsed.autoTransition),
      notificationEnabled: Boolean(parsed.notificationEnabled),
    };
  } catch (err) {
    console.warn('Lỗi khi đọc timer settings từ localStorage:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: TimerSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Lỗi khi lưu timer settings vào localStorage:', err);
  }
}

export interface TimerCallbacks {
  onTick?: (remainingMs: number, phase: TimerPhase, status: TimerStatus) => void;
  onPhaseChange?: (newPhase: TimerPhase, currentRound: number) => void;
  onComplete?: (record: FocusSessionRecord, nextPhase: TimerPhase) => void;
}

export class TimerEngine {
  private sessionId: string;
  private phase: TimerPhase = 'pomodoro';
  private status: TimerStatus = 'idle';
  private currentRound = 1;
  private durationMinutes: number;
  private remainingMs: number;
  private targetEndTimeMs: number | null = null;
  private pausedRemainingMs: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Liên kết task với Pomodoro
  private linkedTaskId: string | null = null;
  private linkedTaskTitle: string | null = null;

  private settings: TimerSettings;
  private callbacks: TimerCallbacks;

  constructor(settings?: Partial<TimerSettings>, callbacks?: TimerCallbacks) {
    const stored = loadStoredSettings();
    this.settings = { ...stored, ...settings };
    this.callbacks = callbacks || {};
    this.sessionId = this.generateId();
    this.durationMinutes = this.settings.pomodoroMinutes;
    this.remainingMs = this.durationMinutes * 60 * 1000;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getPhase(): TimerPhase {
    return this.phase;
  }

  public getStatus(): TimerStatus {
    return this.status;
  }

  public getCurrentRound(): number {
    return this.currentRound;
  }

  public getRemainingMs(): number {
    return this.remainingMs;
  }

  public getTargetEndTimeMs(): number | null {
    return this.targetEndTimeMs;
  }

  public getLinkedTaskId(): string | null {
    return this.linkedTaskId;
  }

  public getLinkedTaskTitle(): string | null {
    return this.linkedTaskTitle;
  }

  public setLinkedTask(taskId: string | null, taskTitle: string | null): void {
    this.linkedTaskId = taskId;
    this.linkedTaskTitle = taskTitle;
    this.persist();
  }

  public getSettings(): TimerSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<TimerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    persistSettings(this.settings);
    if (this.status === 'idle') {
      this.durationMinutes = this.getDurationForPhase(this.phase);
      this.remainingMs = this.durationMinutes * 60 * 1000;
      this.persist();
      this.notifyTick();
    }
  }

  public start(): void {
    if (this.status === 'running') return;

    if (this.status === 'paused' && this.pausedRemainingMs !== null) {
      this.resume();
      return;
    }

    this.sessionId = this.generateId();
    this.durationMinutes = this.getDurationForPhase(this.phase);
    this.remainingMs = this.durationMinutes * 60 * 1000;
    this.targetEndTimeMs = Date.now() + this.remainingMs;
    this.pausedRemainingMs = null;
    this.status = 'running';

    this.startInterval();
    this.persist();
    this.notifyTick();
  }

  public pause(): void {
    if (this.status !== 'running') return;

    this.stopInterval();
    if (this.targetEndTimeMs !== null) {
      this.pausedRemainingMs = Math.max(0, this.targetEndTimeMs - Date.now());
      this.remainingMs = this.pausedRemainingMs;
    }
    this.targetEndTimeMs = null;
    this.status = 'paused';

    this.persist();
    this.notifyTick();
  }

  public resume(): void {
    if (this.status !== 'paused') return;

    const remaining = this.pausedRemainingMs ?? this.remainingMs;
    this.targetEndTimeMs = Date.now() + remaining;
    this.pausedRemainingMs = null;
    this.status = 'running';

    this.startInterval();
    this.persist();
    this.notifyTick();
  }

  public reset(): void {
    this.stopInterval();
    this.status = 'idle';
    this.targetEndTimeMs = null;
    this.pausedRemainingMs = null;
    this.durationMinutes = this.getDurationForPhase(this.phase);
    this.remainingMs = this.durationMinutes * 60 * 1000;
    this.sessionId = this.generateId();

    this.persist();
    this.notifyTick();
  }

  public skip(): void {
    this.stopInterval();
    this.targetEndTimeMs = null;
    this.pausedRemainingMs = null;
    this.status = 'idle';

    const nextPhase = this.calculateNextPhase();
    this.setPhase(nextPhase.phase, nextPhase.round);
    this.sessionId = this.generateId();

    this.persist();
    this.notifyTick();
  }

  public getSnapshot(): TimerSyncPayload {
    return {
      sessionId: this.sessionId,
      phase: this.phase,
      status: this.status,
      currentRound: this.currentRound,
      durationMinutes: this.durationMinutes,
      remainingMs: this.remainingMs,
      targetEndTimeMs: this.targetEndTimeMs,
      pausedRemainingMs: this.pausedRemainingMs,
      timestamp: Date.now(),
      linkedTaskId: this.linkedTaskId,
      linkedTaskTitle: this.linkedTaskTitle
    };
  }

  public syncFromSnapshot(payload: TimerSyncPayload): void {
    this.sessionId = payload.sessionId;
    this.phase = payload.phase;
    this.status = payload.status;
    this.currentRound = payload.currentRound;
    this.durationMinutes = payload.durationMinutes;
    this.targetEndTimeMs = payload.targetEndTimeMs;
    this.pausedRemainingMs = payload.pausedRemainingMs;
    this.linkedTaskId = payload.linkedTaskId ?? null;
    this.linkedTaskTitle = payload.linkedTaskTitle ?? null;

    if (this.status === 'running' && this.targetEndTimeMs !== null) {
      const now = Date.now();
      if (now < this.targetEndTimeMs) {
        this.remainingMs = this.targetEndTimeMs - now;
        this.startInterval();
      } else {
        this.remainingMs = 0;
        this.handleComplete();
      }
    } else if (this.status === 'paused') {
      this.stopInterval();
      this.remainingMs = payload.remainingMs;
    } else {
      this.stopInterval();
      this.remainingMs = payload.remainingMs;
    }

    this.persist();
    this.notifyTick();
    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(this.phase, this.currentRound);
    }
  }

  public tick(): void {
    if (this.status !== 'running' || this.targetEndTimeMs === null) return;

    const currentWall = Date.now();
    // Tính toán thời gian còn lại dựa trên deadline tuyệt đối (Wall-Clock Date.now())
    this.remainingMs = Math.max(0, this.targetEndTimeMs - currentWall);

    if (this.remainingMs <= 0) {
      this.handleComplete();
    } else {
      this.notifyTick();
    }
  }

  private handleComplete(): void {
    this.stopInterval();
    this.status = 'completed';
    this.remainingMs = 0;
    this.notifyTick();

    const record: FocusSessionRecord = {
      id: this.sessionId,
      taskId: this.linkedTaskId,
      taskTitle: this.linkedTaskTitle,
      phase: this.phase,
      durationMinutes: this.durationMinutes,
      completedAt: Date.now(),
      dateString: new Date().toISOString().split('T')[0]
    };

    const nextPhaseInfo = this.calculateNextPhase();

    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(record, nextPhaseInfo.phase);
    }

    if (this.settings.autoTransition) {
      this.setPhase(nextPhaseInfo.phase, nextPhaseInfo.round);
      this.start();
    } else {
      this.setPhase(nextPhaseInfo.phase, nextPhaseInfo.round);
      this.status = 'idle';
      this.persist();
      this.notifyTick();
    }
  }

  public setPhase(phase: TimerPhase, round?: number): void {
    this.phase = phase;
    if (round !== undefined) {
      this.currentRound = round;
    }
    this.durationMinutes = this.getDurationForPhase(this.phase);
    this.remainingMs = this.durationMinutes * 60 * 1000;
    this.targetEndTimeMs = null;
    this.pausedRemainingMs = null;

    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(this.phase, this.currentRound);
    }
  }

  private calculateNextPhase(): { phase: TimerPhase; round: number } {
    if (this.phase === 'pomodoro') {
      if (this.currentRound >= this.settings.roundsBeforeLongBreak) {
        return { phase: 'long_break', round: this.currentRound };
      }
      return { phase: 'short_break', round: this.currentRound };
    } else if (this.phase === 'short_break') {
      return { phase: 'pomodoro', round: this.currentRound + 1 };
    } else {
      // long_break xong -> quay về pomodoro vòng 1
      return { phase: 'pomodoro', round: 1 };
    }
  }

  public getDurationForPhase(phase: TimerPhase): number {
    switch (phase) {
      case 'pomodoro':
        return this.settings.pomodoroMinutes;
      case 'short_break':
        return this.settings.shortBreakMinutes;
      case 'long_break':
        return this.settings.longBreakMinutes;
    }
  }

  private startInterval(): void {
    this.stopInterval();
    this.intervalId = setInterval(() => this.tick(), 200);
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private notifyTick(): void {
    if (this.callbacks.onTick) {
      this.callbacks.onTick(this.remainingMs, this.phase, this.status);
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }

  public persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const runtime: PersistedTimerRuntime = {
      sessionId: this.sessionId,
      phase: this.phase,
      status: this.status,
      currentRound: this.currentRound,
      durationMinutes: this.durationMinutes,
      targetEndTimeMs: this.targetEndTimeMs,
      pausedRemainingMs: this.pausedRemainingMs,
      lastUpdatedMs: Date.now(),
      linkedTaskId: this.linkedTaskId,
      linkedTaskTitle: this.linkedTaskTitle
    };

    try {
      localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(runtime));
    } catch (e) {
      console.warn('Lỗi khi lưu runtime timer vào localStorage:', e);
    }
  }

  public restoreFromStorage(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    try {
      const raw = localStorage.getItem(RUNTIME_STORAGE_KEY);
      if (!raw) return false;

      const runtime: PersistedTimerRuntime = JSON.parse(raw);
      this.sessionId = runtime.sessionId;
      this.phase = runtime.phase;
      this.currentRound = runtime.currentRound;
      this.durationMinutes = runtime.durationMinutes;
      this.linkedTaskId = runtime.linkedTaskId ?? null;
      this.linkedTaskTitle = runtime.linkedTaskTitle ?? null;

      if (runtime.status === 'running' && runtime.targetEndTimeMs !== null) {
        const now = Date.now();
        if (now < runtime.targetEndTimeMs) {
          // Vẫn còn thời gian trong hiệp
          this.status = 'running';
          this.targetEndTimeMs = runtime.targetEndTimeMs;
          this.remainingMs = runtime.targetEndTimeMs - now;
          this.startInterval();
        } else {
          // Đã hết giờ trong lúc đóng tab/máy ngủ
          this.targetEndTimeMs = runtime.targetEndTimeMs;
          this.remainingMs = 0;
          this.handleComplete();
        }
      } else if (runtime.status === 'paused') {
        this.status = 'paused';
        this.pausedRemainingMs = runtime.pausedRemainingMs;
        this.remainingMs = runtime.pausedRemainingMs ?? (this.durationMinutes * 60 * 1000);
      } else {
        this.status = 'idle';
        this.remainingMs = this.durationMinutes * 60 * 1000;
      }

      this.notifyTick();
      return true;
    } catch (err) {
      console.warn('Lỗi khi khôi phục timer từ localStorage:', err);
      return false;
    }
  }

  public destroy(): void {
    this.stopInterval();
  }
}
