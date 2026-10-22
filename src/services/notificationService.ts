/**
 * Notification Service xử lý thông báo trình duyệt an toàn.
 * Tuyệt đối không để việc bị từ chối quyền hoặc trình duyệt không hỗ trợ làm lỗi Timer.
 */
export class NotificationService {
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      return await Notification.requestPermission();
    } catch (error) {
      console.warn('Lỗi khi xin quyền Notification:', error);
      return 'denied';
    }
  }

  public static notify(title: string, options?: NotificationOptions): void {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/vite.svg',
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
