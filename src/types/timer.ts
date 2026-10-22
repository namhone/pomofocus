export type TimerPhase = 'pomodoro' | 'short_break' | 'long_break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerSettings {
  pomodoroMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  autoTransition: boolean;
  notificationEnabled: boolean;
}

export interface FocusSessionRecord {
  id: string; // UUID v4 - Idempotency Key
  phase: TimerPhase;
  durationMinutes: number;
  completedAt: number; // Timestamp ms
  dateString: string;  // YYYY-MM-DD
}

export interface PersistedTimerRuntime {
  sessionId: string;
  phase: TimerPhase;
  status: TimerStatus;
  currentRound: number;
  durationMinutes: number;
  targetEndTimeMs: number | null;
  pausedRemainingMs: number | null;
  lastUpdatedMs: number;
}
