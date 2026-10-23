import { TimerPhase, TimerStatus } from '../types/timer';

export interface TimerSyncPayload {
  sessionId: string;
  phase: TimerPhase;
  status: TimerStatus;
  currentRound: number;
  durationMinutes: number;
  remainingMs: number;
  targetEndTimeMs: number | null;
  pausedRemainingMs: number | null;
  timestamp: number;
}

export type TabMessage =
  | { type: 'SYNC_STATE'; payload: TimerSyncPayload }
  | { type: 'TRIGGER_ACTION'; action: 'start' | 'pause' | 'resume' | 'reset' | 'skip'; payload: TimerSyncPayload }
  | { type: 'REQUEST_CURRENT_STATE' };

export class TabCoordinator {
  private channel: BroadcastChannel | null = null;
  private isLeaderFlag = false;
  private lockAbortController: AbortController | null = null;
  private onMessageCallback: ((msg: TabMessage) => void) | null = null;
  private onLeaderChangeCallback: ((isLeader: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('pomodoro_bus');
      this.channel.onmessage = (event) => {
        if (this.onMessageCallback && event.data) {
          this.onMessageCallback(event.data as TabMessage);
        }
      };
    }
  }

  public get isLeader(): boolean {
    return this.isLeaderFlag;
  }

  public setOnMessage(cb: (msg: TabMessage) => void): void {
    this.onMessageCallback = cb;
  }

  public setOnLeaderChange(cb: (isLeader: boolean) => void): void {
    this.onLeaderChangeCallback = cb;
  }

  /**
   * Bắt đầu yêu cầu quyền Leader thông qua Web Locks API.
   * Nếu trình duyệt không hỗ trợ Web Locks, fallback là leader = true,
   * và việc chống ghi trùng được bảo vệ hoàn toàn bởi khóa chính duy nhất của IndexedDB.
   */
  public async requestLeadership(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks) {
      this.lockAbortController = new AbortController();

      // Sử dụng Web Locks API: lock có tên 'pomodoro_timer_leader'
      // Duy nhất một tab có thể giữ lock này tại một thời điểm
      navigator.locks.request(
        'pomodoro_timer_leader',
        { signal: this.lockAbortController.signal },
        async () => {
          this.isLeaderFlag = true;
          if (this.onLeaderChangeCallback) {
            this.onLeaderChangeCallback(true);
          }

          // Giữ lock cho đến khi tab đóng hoặc abort signal kích hoạt
          return new Promise<void>((resolve) => {
            if (this.lockAbortController) {
              this.lockAbortController.signal.addEventListener('abort', () => {
                this.isLeaderFlag = false;
                if (this.onLeaderChangeCallback) {
                  this.onLeaderChangeCallback(false);
                }
                resolve();
              });
            }
          });
        }
      ).catch(() => {
        // Lock bị hủy hoặc từ chối
        this.isLeaderFlag = false;
        if (this.onLeaderChangeCallback) {
          this.onLeaderChangeCallback(false);
        }
      });
    } else {
      // Fallback khi Web Locks không hỗ trợ: xem tab hiện tại có quyền đếm
      this.isLeaderFlag = true;
      if (this.onLeaderChangeCallback) {
        this.onLeaderChangeCallback(true);
      }
    }
  }

  public broadcast(msg: TabMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.warn('Lỗi khi gửi BroadcastChannel message:', err);
      }
    }
  }

  public destroy(): void {
    if (this.lockAbortController) {
      this.lockAbortController.abort();
      this.lockAbortController = null;
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
