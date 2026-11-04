import { ProfileService } from './profileService';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useTimerStore } from '../stores/useTimerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { DockPosition, DockSize, ThemeAccent } from '../types/layout';

export interface UserCustomSettings {
  dock_position?: DockPosition;
  dock_size?: DockSize;
  theme?: ThemeAccent;
  volume?: number;
  pomodoro_custom_times?: {
    pomodoroMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    roundsBeforeLongBreak: number;
  };
}

export const USER_SETTINGS_KEY_PREFIX = 'pomofocus_user_settings_';

let saveDebounceTimer: any = null;

export const userSettingsService = {
  /**
   * Thu thập cài đặt hiện tại từ tất cả các store
   */
  collectCurrent(): UserCustomSettings {
    const layout = useLayoutStore.getState();
    const timer = useTimerStore.getState().settings;
    const audio = useAudioStore.getState();

    return {
      dock_position: layout.dockPosition,
      dock_size: layout.dockSize,
      theme: layout.themeAccent,
      volume: audio.settings?.masterVolume ?? 80,
      pomodoro_custom_times: {
        pomodoroMinutes: timer.pomodoroMinutes,
        shortBreakMinutes: timer.shortBreakMinutes,
        longBreakMinutes: timer.longBreakMinutes,
        roundsBeforeLongBreak: timer.roundsBeforeLongBreak
      }
    };
  },

  /**
   * Áp dụng cài đặt đã lưu vào các store ứng dụng
   */
  applySettings(settings: UserCustomSettings | null | undefined): void {
    if (!settings || typeof settings !== 'object') return;

    // 1. Cài đặt bố cục & giao diện (Layout Store)
    const layout = useLayoutStore.getState();
    if (settings.dock_position && settings.dock_position !== layout.dockPosition) {
      layout.setDockPosition(settings.dock_position);
    }
    if (settings.dock_size && settings.dock_size !== layout.dockSize) {
      layout.setDockSize(settings.dock_size);
    }
    if (settings.theme && settings.theme !== layout.themeAccent) {
      layout.setThemeAccent(settings.theme);
    }

    // 2. Cài đặt thời gian đồng hồ Pomodoro (Timer Store)
    if (settings.pomodoro_custom_times) {
      useTimerStore.getState().updateSettings({
        pomodoroMinutes: settings.pomodoro_custom_times.pomodoroMinutes,
        shortBreakMinutes: settings.pomodoro_custom_times.shortBreakMinutes,
        longBreakMinutes: settings.pomodoro_custom_times.longBreakMinutes,
        roundsBeforeLongBreak: settings.pomodoro_custom_times.roundsBeforeLongBreak
      });
    }

    // 3. Âm lượng âm thanh không gian (Audio Store)
    if (typeof settings.volume === 'number') {
      try {
        useAudioStore.getState().setMasterVolume(settings.volume);
      } catch {
        // Fallback safely
      }
    }
  },

  /**
   * Lưu cài đặt ngầm vào Supabase Cloud (public.profiles.settings) và cache cục bộ
   */
  async saveSettings(userId: string, partial?: Partial<UserCustomSettings>): Promise<void> {
    if (!userId) return;

    const current = this.collectCurrent();
    const merged: UserCustomSettings = {
      ...current,
      ...(partial || {})
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`${USER_SETTINGS_KEY_PREFIX}${userId}`, JSON.stringify(merged));
    }

    // Debounce 400ms để tránh spam API Supabase khi người dùng kéo thanh trượt / gõ liên tục
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }

    saveDebounceTimer = setTimeout(async () => {
      try {
        await ProfileService.updateFields(userId, {
          settings: merged as Record<string, any>
        });
      } catch (err) {
        console.warn('[userSettingsService] Lỗi lưu settings lên Supabase Cloud:', err);
      }
    }, 400);
  },

  /**
   * Nạp cài đặt từ cache cục bộ (nếu offline)
   */
  loadLocalSettings(userId: string): UserCustomSettings | null {
    if (!userId || typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(`${USER_SETTINGS_KEY_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};
