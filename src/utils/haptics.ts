import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticImpactPattern = 'light' | 'medium' | 'heavy';
export type HapticNotificationPattern = 'success' | 'warning' | 'error';

/**
 * Universal Haptics utility with native Capacitor support and safe Web Vibration API fallback.
 * Safe for SSR, unit tests (JSDOM), mobile web, and Android APK.
 */
export const haptics = {
  /**
   * Short impact vibration for button clicks, toggles, phase changes.
   */
  async impact(style: HapticImpactPattern = 'light'): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const impactStyle =
          style === 'heavy'
            ? ImpactStyle.Heavy
            : style === 'medium'
            ? ImpactStyle.Medium
            : ImpactStyle.Light;
        await Haptics.impact({ style: impactStyle });
        return;
      }
    } catch {
      // Fallback to Web Vibration API below
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        const ms = style === 'heavy' ? 40 : style === 'medium' ? 25 : 10;
        navigator.vibrate(ms);
      } catch {}
    }
  },

  /**
   * Notification vibration pattern for completion, warnings, errors.
   */
  async notification(type: HapticNotificationPattern = 'success'): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const notifType =
          type === 'warning'
            ? NotificationType.Warning
            : type === 'error'
            ? NotificationType.Error
            : NotificationType.Success;
        await Haptics.notification({ type: notifType });
        return;
      }
    } catch {
      // Fallback to Web Vibration API below
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (type === 'success') {
          navigator.vibrate([80, 40, 120]);
        } else if (type === 'warning') {
          navigator.vibrate([150, 50, 150]);
        } else {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }
      } catch {}
    }
  },

  /**
   * Selection change feedback for pickers, sliders, tabs.
   */
  async selectionChanged(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        await Haptics.selectionChanged();
        return;
      }
    } catch {}

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  },

  /**
   * Dedicated helper for timer completion (distinct celebratory pulse).
   */
  async timerComplete(): Promise<void> {
    await this.notification('success');
  },

  /**
   * Dedicated helper for task completion.
   */
  async taskComplete(): Promise<void> {
    await this.notification('success');
  },

  /**
   * Dedicated helper for phase changes (Pomodoro <-> Break).
   */
  async phaseChange(): Promise<void> {
    await this.impact('medium');
  },

  /**
   * Dedicated helper for timer start/stop.
   */
  async timerToggle(): Promise<void> {
    await this.impact('medium');
  },
};

export default haptics;
