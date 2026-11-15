/**
 * Notification Service xử lý thông báo trình duyệt và Android native an toàn.
 * Tuân thủ Android 13+ (POST_NOTIFICATIONS, NotificationChannel IMPORTANCE_HIGH, SCHEDULE_EXACT_ALARM allowWhileIdle).
 * Tuyệt đối không để việc bị từ chối quyền hoặc môi trường thiếu API làm lỗi Timer.
 */

export interface ExactAlarmOptions {
  id?: number;
  title: string;
  body: string;
  triggerAt: number | Date;
  allowWhileIdle?: boolean;
}

export class NotificationService {
  public static readonly CHANNEL_ID = 'pomofocus_timer_channel';
  public static readonly CHANNEL_NAME = 'Pomodoro Timer Alerts';

  private static scheduledTimers = new Map<number, any>();
  private static defaultAlarmId = 1001;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && ('Notification' in window || Boolean((window as any).Capacitor?.Plugins?.LocalNotifications));
  }

  public static getPermission(): NotificationPermission {
    if (typeof window === 'undefined') return 'denied';
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  }

  /**
   * Khởi tạo Notification Channel với mức IMPORTANCE_HIGH (Android 8.0+)
   */
  public static async ensureChannel(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const localNotif = (window as any).Capacitor?.Plugins?.LocalNotifications;
      if (localNotif && typeof localNotif.createChannel === 'function') {
        await localNotif.createChannel({
          id: this.CHANNEL_ID,
          name: this.CHANNEL_NAME,
          description: 'Thông báo kết thúc hiệp Pomodoro và chuông báo thức',
          importance: 5, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          vibration: true,
          lights: true,
          sound: 'default'
        });
      }
    } catch (err) {
      console.debug('[NotificationService] ensureChannel fallback/ignored:', err);
    }
  }

  /**
   * Xin quyền thông báo runtime (Android 13+ POST_NOTIFICATIONS & Web Notification API)
   */
  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') return 'denied';

    // 1. Android Native Capacitor LocalNotifications
    try {
      const localNotif = (window as any).Capacitor?.Plugins?.LocalNotifications;
      if (localNotif && typeof localNotif.requestPermissions === 'function') {
        const res = await localNotif.requestPermissions();
        if (res?.display === 'granted') {
          await this.ensureChannel();
          return 'granted';
        }
      }
    } catch (err) {
      console.debug('[NotificationService] Capacitor requestPermissions error:', err);
    }

    // 2. Web Notification API standard
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm;
      } catch (error) {
        console.warn('Lỗi khi xin quyền Notification:', error);
        return 'denied';
      }
    }

    return 'denied';
  }

  /**
   * Đặt lịch thông báo chính xác tuyệt đối (Exact Alarm / allowWhileIdle) khi kết thúc hiệp
   */
  public static async scheduleExactAlarm(options: ExactAlarmOptions): Promise<void> {
    const alarmId = options.id ?? this.defaultAlarmId;
    await this.cancelExactAlarm(alarmId);

    const targetTimestamp = options.triggerAt instanceof Date ? options.triggerAt.getTime() : options.triggerAt;
    const delayMs = Math.max(0, targetTimestamp - Date.now());

    // 1. Native Capacitor LocalNotifications (cho phép reo khi màn hình khóa / Doze mode)
    try {
      const localNotif = (window as any).Capacitor?.Plugins?.LocalNotifications;
      if (localNotif && typeof localNotif.schedule === 'function') {
        await this.ensureChannel();
        await localNotif.schedule({
          notifications: [
            {
              id: alarmId,
              title: options.title,
              body: options.body,
              schedule: {
                at: new Date(targetTimestamp),
                allowWhileIdle: options.allowWhileIdle ?? true
              },
              channelId: this.CHANNEL_ID,
              smallIcon: 'ic_launcher',
              iconColor: '#10b981'
            }
          ]
        });
      }
    } catch (err) {
      console.debug('[NotificationService] Native scheduleExactAlarm error/ignored:', err);
    }

    // 2. In-memory setTimeout fallback cho môi trường Web / WebView
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        this.scheduledTimers.delete(alarmId);
        this.notify(options.title, { body: options.body });
      }, delayMs);

      this.scheduledTimers.set(alarmId, timer);
    }
  }

  /**
   * Hủy báo thức chính xác đã đặt trước đó (khi pause, reset, hoặc skip hiệp)
   */
  public static async cancelExactAlarm(id?: number): Promise<void> {
    const alarmId = id ?? this.defaultAlarmId;

    // 1. Hủy in-memory timer
    const timer = this.scheduledTimers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(alarmId);
    }

    // 2. Hủy native local notification
    try {
      const localNotif = (window as any).Capacitor?.Plugins?.LocalNotifications;
      if (localNotif && typeof localNotif.cancel === 'function') {
        await localNotif.cancel({ notifications: [{ id: alarmId }] });
      }
    } catch (err) {
      console.debug('[NotificationService] Native cancelExactAlarm error/ignored:', err);
    }
  }

  /**
   * Phát thông báo tức thì (foreground notification)
   */
  public static notify(title: string, options?: NotificationOptions): void {
    if (!this.isSupported()) return;

    // Native Capacitor notification if available
    try {
      const localNotif = (window as any).Capacitor?.Plugins?.LocalNotifications;
      if (localNotif && typeof localNotif.schedule === 'function') {
        localNotif.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 100000) + 10,
              title,
              body: options?.body || '',
              channelId: this.CHANNEL_ID,
              smallIcon: 'ic_launcher',
              iconColor: '#10b981'
            }
          ]
        }).catch(() => {});
      }
    } catch {}

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.svg',
        silent: false,
        ...options
      });

      // Tự động đóng sau 5 giây để không làm phiền màn hình
      setTimeout(() => {
        try {
          notification.close();
        } catch {
          // Bỏ qua lỗi đóng
        }
      }, 5000);
    } catch (error) {
      console.warn('Không thể hiển thị notification:', error);
    }
  }
}
