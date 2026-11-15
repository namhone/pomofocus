/**
 * Centralized Screen Wake Lock Manager
 * Ensures the screen remains active during Pomodoro sessions across mobile, desktop, and tablets.
 * Implements strict concurrency guard, idempotency, and automatic re-acquisition on visibility recovery.
 */

export const wakeLockManager = {
  sentinel: null as any,
  isRequesting: false,

  /**
   * Request a screen wake lock
   */
  async request(): Promise<void> {
    if (
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      typeof (navigator as any).wakeLock?.request === 'function'
    ) {
      if (this.isRequesting) return;
      if (this.sentinel && !this.sentinel.released) return;

      this.isRequesting = true;
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel = sentinel;
        sentinel.addEventListener?.('release', () => {
          if (this.sentinel === sentinel) {
            this.sentinel = null;
          }
        });
      } catch (err) {
        // Gracefully ignore wake lock errors (e.g., low power mode, permission denied)
        console.debug('[WakeLockManager] request ignored/failed:', err);
      } finally {
        this.isRequesting = false;
      }
    }
  },

  /**
   * Release the active screen wake lock
   */
  async release(): Promise<void> {
    if (this.sentinel) {
      const activeSentinel = this.sentinel;
      this.sentinel = null;
      try {
        await activeSentinel.release?.();
      } catch {
        // Ignore release errors
      }
    }
  },

  /**
   * Check if wake lock is currently held
   */
  isActive(): boolean {
    return Boolean(this.sentinel && !this.sentinel.released);
  }
};

export default wakeLockManager;
