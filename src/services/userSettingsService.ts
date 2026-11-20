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
  updated_at?: number;
  last_modified?: number;
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

    let lastModified = Date.now();
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('pomofocus_user_settings_last_modified');
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed > 0) {
          lastModified = parsed;
        }
      }
    }

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
      },
      updated_at: lastModified,
      last_modified: lastModified
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

    // Đồng bộ timestamp nếu có
    const ts = settings.updated_at || settings.last_modified;
    if (ts && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('pomofocus_user_settings_last_modified', String(ts));
    }
  },

  /**
   * Lưu cài đặt ngầm vào Supabase Cloud (public.profiles.settings) và cache cục bộ
   */
  async saveSettings(userId: string, partial?: Partial<UserCustomSettings>): Promise<void> {
    if (!userId) return;

    const now = Date.now();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('pomofocus_user_settings_last_modified', String(now));
    }

    const current = this.collectCurrent();
    const merged: UserCustomSettings = {
      ...current,
      ...(partial || {}),
      updated_at: now,
      last_modified: now
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
  },

  /**
   * Hợp nhất cài đặt trên cơ sở Dấu thời gian (Timestamp-Based Merge) khi đăng nhập.
   * Nếu cài đặt khách cục bộ được chỉnh sửa gần đây hơn cài đặt đám mây, bảo lưu cài đặt
   * cục bộ và tải lên Supabase Cloud, tránh ghi đè các tùy chỉnh của người dùng bằng mặc định cũ.
   */
  async mergeSettingsOnLogin(
    userId: string,
    cloudSettings?: UserCustomSettings | null,
    cloudUpdatedAtIso?: string
  ): Promise<void> {
    if (!userId) return;

    // 1. Xác định timestamp của cài đặt cục bộ (khách)
    let localTimestamp = 0;
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTs = localStorage.getItem('pomofocus_user_settings_last_modified');
      if (storedTs) {
        localTimestamp = parseInt(storedTs, 10) || 0;
      }
      if (!localTimestamp) {
        const guestSettingsRaw = localStorage.getItem(`${USER_SETTINGS_KEY_PREFIX}guest`);
        if (guestSettingsRaw) {
          try {
            const guestSettings = JSON.parse(guestSettingsRaw);
            localTimestamp = guestSettings.updated_at || guestSettings.last_modified || 0;
          } catch {}
        }
      }
    }

    // 2. Xác định timestamp của cài đặt trên đám mây
    let cloudTimestamp = 0;
    if (cloudSettings) {
      cloudTimestamp = cloudSettings.updated_at || cloudSettings.last_modified || 0;
    }
    if (!cloudTimestamp && cloudUpdatedAtIso) {
      const parsed = new Date(cloudUpdatedAtIso).getTime();
      if (!isNaN(parsed)) {
        cloudTimestamp = parsed;
      }
    }

    // 3. Nếu Cloud hoàn toàn chưa có cài đặt, đẩy cài đặt cục bộ hiện tại lên Cloud
    if (!cloudSettings) {
      await this.saveSettings(userId);
      return;
    }

    // 4. So sánh: Nếu cài đặt cục bộ mới hơn cài đặt Cloud
    if (localTimestamp > 0 && localTimestamp > cloudTimestamp) {
      // Bảo lưu cài đặt cục bộ hiện tại và đồng bộ ngược lên Cloud
      await this.saveSettings(userId);
    } else {
      // Cài đặt đám mây mới hơn hoặc bằng: Áp dụng cài đặt đám mây vào stores
      this.applySettings(cloudSettings);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${USER_SETTINGS_KEY_PREFIX}${userId}`, JSON.stringify(cloudSettings));
        if (cloudTimestamp > 0) {
          localStorage.setItem('pomofocus_user_settings_last_modified', String(cloudTimestamp));
        }
      }
    }
  }
};
