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

export type LocalFocusSessionPhase =
  | 'work'
  | 'shortBreak'
  | 'longBreak'
  | 'pomodoro'
  | 'short_break'
  | 'long_break';

export interface FocusSessionRecord {
  id: string; // UUID v4 - Idempotency Key
  userId?: string;     // V8.1 Local-First user ownership
  taskId?: string | null;
  taskTitle?: string | null;
  phase: LocalFocusSessionPhase;
  durationMinutes: number;
  completedAt: number; // Timestamp ms
  dateString: string;  // YYYY-MM-DD
  synced?: boolean;   // V8.1 cloud sync status
}

export interface LocalFocusSession extends FocusSessionRecord {
  // Fully mutually compatible with FocusSessionRecord
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
  linkedTaskId?: string | null;
  linkedTaskTitle?: string | null;
}

export type RoomTimerPhase = 'work' | 'shortBreak' | 'longBreak';

export interface RoomTimerSyncPayload {
  action: 'START' | 'PAUSE' | 'RESET' | 'PHASE_CHANGE' | 'SYNC';
  remainingSeconds: number;
  isRunning: boolean;
  phase: RoomTimerPhase;
  senderId: string;
  timestamp: number;
}

