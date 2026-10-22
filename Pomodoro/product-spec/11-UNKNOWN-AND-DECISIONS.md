# 11 — UNKNOWN AND DECISIONS (BẢN QUYẾT ĐỊNH KIẾN TRÚC HOÀN THIỆN V4)

> **Mục tiêu:** Minh bạch các yếu tố nội bộ của LifeAt (`UNKNOWN`), ghi nhận các quyết định kiến trúc cường hóa trung thực sau phê duyệt có điều kiện cho giai đoạn scaffold (ngày 23/10/2026).

---

## 1. Danh Mục Các Ẩn Số Từ LifeAt Không Thể Xác Minh (`UNKNOWN`)

| Hạng mục | Trạng thái | Lý do không thể xác minh từ giao diện ngoài | Giải pháp kiến trúc thay thế của chúng ta |
| :--- | :---: | :--- | :--- |
| **Hạ tầng Backend & DB LifeAt** | `UNKNOWN` | Source code backend và DB của LifeAt được bảo mật nội bộ. | **Client-First / Local-First 100%:** Sử dụng IndexedDB cục bộ (Dexie.js), không cần backend trong MVP. |
| **Cơ chế Sync Phòng Học Nhóm** | `UNKNOWN` | Chưa rõ LifeAt dùng WebSocket, WebRTC Data Channel hay SSE. | Đưa tính năng phòng học nhóm sang **Deferred**; không triển khai trong MVP để bảo toàn mục tiêu 0 đồng. |
| **Bản Quyền & Nguồn Media LifeAt** | `UNKNOWN` | Nguồn gốc hàng trăm video nền 4K và các playlist nhạc của LifeAt có hợp đồng thương mại riêng. | Sử dụng 100% media bản quyền tự do: **Unsplash (CC0)** cho hình ảnh và **Freesound (CC0/Public Domain)** cho âm thanh. |

---

## 2. Bảng Quyết Định Kiến Trúc Sau Đợt Review Chuyên Môn (ADRs V4)

| Mã ADR | Vấn đề kỹ thuật | Quyết định sau Audit V4 | Lý do cốt lõi & Giảm thiểu rủi ro |
| :--- | :--- | :--- | :--- |
| **ADR-01** | Khung nền tảng & Dependency | **Vite 5.4.14 + React 18.3.1 + Tailwind 3.4.17** | Cố định phiên bản chính xác, tương thích tĩnh với `vite-plugin-pwa@0.20.5`. Bỏ chữ "LTS" không chính thức của Tailwind; chờ xác minh thực tế qua scaffold. |
| **ADR-02** | Điều phối Timer Đa Tab | **Web Locks API + IndexedDB ConstraintError** | Dùng Web Locks để bầu 1 Tab Leader. Fallback localStorage heartbeat chỉ là gợi ý; rào chắn chống duplicate duy nhất là IndexedDB Atomic Transaction với Primary Key constraint. |
| **ADR-03** | Xử Lý Đồng Hồ & Máy Ngủ | **`Date.now()` Wall-Clock + `performance.now()` Interval** | Mốc bền vững là `targetEndTime`. Dùng `performance.now()` phát hiện nhảy giờ khi tab active. Thừa nhận tính chính xác khi máy ngủ phụ thuộc vào thông tin OS cung cấp. |
| **ADR-04** | Hạn Mức Cache Workbox 2 MiB | **Tách biệt Precache vs Runtime Cache** | Precache App Shell + 3 ảnh WebP tĩnh < 2 MiB. Video nền WebM đưa vào Runtime Cache (`CacheFirst`) với cơ chế tự động fallback ảnh tĩnh khi offline. |
| **ADR-05** | Bảo Toàn Dữ Liệu Cục Bộ | **Đưa JSON Backup & Restore vào P0 MVP** | Cho phép người dùng chủ động xuất/nhập tệp `.json` bất kỳ lúc nào để phòng ngừa rủi ro bị xóa cache trình duyệt. |
| **ADR-06** | Khung Kiểm Thử Toàn Diện | **Vitest + Playwright E2E (100% Pass Rate)** | Sử dụng Playwright để kiểm thử Service Worker thật, ngắt mạng thật (`setOffline(true)`) và kiểm thử đa tab thật. Thống nhất **100% Pass Rate** cho test bắt buộc. |
| **ADR-07** | Âm Chuông & Chống Vỡ Tiếng | **Web Audio Synthesizer + DynamicsCompressor** | 6 âm chuông tổng hợp bằng Oscillator (0 bytes tải ngoài) + Compressor nén ở ngưỡng -6dB chống méo tiếng. Xử lý try/catch Autoplay thân thiện. |
| **ADR-08** | Nguồn Chân Lý Dữ Liệu | **IndexedDB là SSOT duy nhất** | IndexedDB chứa toàn bộ dữ liệu nghiệp vụ lâu dài. Zustand chỉ giữ in-memory viewmodel. LocalStorage chỉ lưu cấu hình layout và runtime timer. |
| **ADR-09** | Cắt Giảm Scope Creep | **Loại bỏ Cloud Sync & YouTube khỏi MVP** | Giữ MVP gọn gàng, kiểm thử được 100% cục bộ; đưa YouTube và Google Calendar sang P1; Cloud Sync sang P2; Voice Chat sang Deferred. |

---

## 3. Các Giả Định Kỹ Thuật & Giới Hạn Thực Tế

1. **Giả định về dung lượng hạn mức IndexedDB:** Trình duyệt hiện đại cấp tối thiểu vài trăm MB. Tính năng JSON Backup & Restore (`P0`) giải quyết triệt để rủi ro này.
2. **Web Locks API:** Trình duyệt hiện đại (Chrome 69+, Firefox 96+, Safari 15.4+, Edge 79+) đều đã hỗ trợ Web Locks API. Trên môi trường cũ, IndexedDB Atomic Transaction là chốt chặn an toàn cuối cùng.
3. **Giới hạn máy ngủ:** Không có Web API nào bảo đảm chạy code liên tục khi laptop tắt nắp (Sleep). Giải pháp tốt nhất là so sánh chênh lệch thời gian khi máy tỉnh giấc và cập nhật trạng thái hợp lý.
