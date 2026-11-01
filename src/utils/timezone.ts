/**
 * Tiện ích thời gian chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh / GMT+7)
 * Đảm bảo mọi logic reset ngày (0h sáng), thống kê học tập và đếm phòng
 * hoạt động chính xác theo giờ Việt Nam, bất kể người dùng hay máy chủ đang ở múi giờ nào.
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Trả về chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (GMT+7)
 * Ví dụ: '2026-11-02'
 */
export function getVietnamTodayDateKey(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch {
    // Fallback nếu Intl không hỗ trợ timeZone
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().split('T')[0];
  }
}

/**
 * Kiểm tra xem một mốc thời gian timestamp có cùng ngày hôm nay (theo giờ VN) hay không
 */
export function isTodayVietnam(timestamp: number | string | Date): boolean {
  const d = new Date(timestamp);
  return getVietnamTodayDateKey(d) === getVietnamTodayDateKey();
}
