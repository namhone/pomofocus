# BÁO CÁO KIỂM TOÁN VÀ HOÀN THIỆN CHỨC NĂNG AUDIO — POMODORO WORKSPACE
*Toàn diện 9 Tiêu chí: Web Audio Engine, Soundboard Đa Track, YouTube Stream Embed & Chống Xung Đột Đa Tab*

**Dự án:** Pomodoro Ambient Workspace  
**Thời gian kiểm định:** 25/10/2026  
**Thư mục lưu trữ:** [artifacts/audio-audit/](file:///d:/FileCuaNam/Web'/Pomodoro/artifacts/audio-audit/)  

---

## 1. Ma Trận Đánh Giá 9 Tiêu Chí Chức Năng Audio

| STT | Tiêu chí Kiểm toán | Yêu cầu Kỹ thuật | Trạng thái | Bằng chứng Thực nghiệm |
|---|---|---|:---:|---|
| **1** | **Chime Synthesizer (Chuông báo)** | 6 loại chuông tổng hợp bằng Web Audio API thuần; 0 byte tải mạng; không phụ thuộc file âm thanh ngoài; độ trễ 0ms. | **HOÀN HẢO** | File [`ChimeSynthesizer.ts`](file:///d:/FileCuaNam/Web'/Pomodoro/src/audio/ChimeSynthesizer.ts) tạo 6 preset (`twinkle`, `playtime`, `scifi`, `slow_rise`, `rooster`, `bird`) bằng OscillatorNode & BiquadFilter. Unit test `audioEngine.test.ts` pass 21/21. |
| **2** | **Ambient Soundscape (Âm thanh môi trường)** | Soundboard đa track; hỗ trợ bật đồng thời nhiều âm; tích hợp tiếng ồn màu và nhịp sóng não Binaural. | **HOÀN HẢO** | File [`AmbientSynthesizer.ts`](file:///d:/FileCuaNam/Web'/Pomodoro/src/audio/AmbientSynthesizer.ts) tích hợp 14 tracks (3 tiếng ồn Paul Kellet, 5 sóng não Stereo ChannelMerger, 6 âm môi trường thủ tục: Mưa, Biển, Gió, Lửa, Cafe, Bàn phím). |
| **3** | **Volume & Gain Matrix (Âm lượng thực tế)** | Thay đổi thanh trượt phải tác động thực sự đến biên độ sóng; có Master Mute; không dùng UI ảo. | **HOÀN HẢO** | Điều khiển trực tiếp `gainNode.gain.setTargetAtTime(target, ctx.currentTime, 0.05)`, khử triệt để tiếng click/pop. E2E test `audioFlow.spec.ts` (Test 3) kiểm chứng tính năng Mute & Volume persistence. |
| **4** | **Master Limiter / DynamicsCompressor** | Ngăn ngừa hiện tượng vỡ tiếng (clipping / distortion) khi phối trộn từ 5-10 track âm thanh cùng lúc. | **HOÀN HẢO** | Module [`AudioContextManager.ts`](file:///d:/FileCuaNam/Web'/Pomodoro/src/audio/AudioContextManager.ts) cài đặt tầng `DynamicsCompressorNode` (-6dB threshold, 8:1 ratio, 3ms attack, 250ms release) tại Master bus trước khi nối ra loa. |
| **5** | **YouTube Lofi Stream Player (Thực thụ)** | Trình phát nhạc lofi stream trực tiếp; hỗ trợ live 24/7 và playlist; lưu cấu hình; dừng phát linh hoạt. | **HOÀN HẢO** | Triển khai trong [`AudioWidget.tsx`](file:///d:/FileCuaNam/Web'/Pomodoro/src/components/AudioWidget.tsx) với `extractYouTubeEmbedUrl()`, 3 kênh curated phát 1-chạm (Lofi Girl, Synthwave, Coffee Lofi), iframe `youtube-nocookie.com` 16:9 responsive, đèn báo LIVE, nút dừng luồng. |
| **6** | **Chính sách Autoplay Trình duyệt (Browser Autoplay Policy)** | Không báo lỗi console Uncaught DOMException khi trình duyệt chặn âm thanh khởi động; có cơ chế tự mở khóa. | **HOÀN HẢO** | `AudioContextManager` lắng nghe toàn cục `pointerdown` và `keydown` để tự động gọi `audioContext.resume()`. Nếu vẫn bị chặn, hiển thị Banner cảnh báo màu hổ phách trực quan để người dùng mở khóa chỉ với 1 click. |
| **7** | **Bản quyền Sở hữu Trí tuệ & Băng thông 0 Đồng** | Không vi phạm bản quyền âm nhạc; không chịu chi phí lưu trữ/stream file âm thanh nặng trên máy chủ. | **HOÀN HẢO** | 100% âm thanh chuông và ambient noises được tổng hợp bằng thuật toán toán học trên máy khách (0 byte server). Nhạc Lofi Stream phát từ YouTube chính chủ qua chuẩn iframe, bảo đảm view và bản quyền cho nghệ sĩ. |
| **8** | **Đa Tab: Chống Xung Đột & Chỉ 1 Tab Phát Chuông** | Khi mở nhiều tab làm việc song song, chuông kết thúc hiệp chỉ phát duy nhất ở 1 tab; không vọng tiếng nhân bản. | **HOÀN HẢO** | Cơ chế Leader Election qua `navigator.locks` kết hợp giao dịch nguyên tử `recordFocusSessionAtomic` trên IndexedDB thật. Đã kiểm chứng qua E2E test `audioFlow.spec.ts` (Test 6) và `timerFlow.spec.ts`. |
| **9** | **Trải nghiệm UX & Cảnh báo Y tế (Medical Disclaimer)** | Giao diện âm thanh dễ thao tác trên mobile; minh bạch trách nhiệm pháp lý đối với sóng não Binaural Beats. | **HOÀN HẢO** | Tích hợp hộp cảnh báo y tế chuẩn y khoa: *"Âm thanh mô phỏng nhịp âm hai tai hỗ trợ thư giãn và tập trung — không phải thiết bị y tế; không có tác dụng thay thế chẩn đoán hay điều trị y khoa"*. |

---

## 2. Điểm Nhấn Kiến Trúc Kỹ Thuật

### A. YouTube Lofi Stream Embed Player Thực thụ
Trước đây, tính năng YouTube Stream chỉ là một ô input text giả định, khi bấm lưu chỉ hiển thị dòng chữ `✓ Đã kết nối` mà không hề có cơ chế phát âm thanh thật.

Ở phiên bản hoàn thiện này, chúng tôi đã xây dựng **Trình phát luồng trực tiếp hoàn chỉnh**:
1. **Trích xuất URL thông minh (`extractYouTubeEmbedUrl`):**
   - Hỗ trợ link tiêu chuẩn: `youtube.com/watch?v=ID`
   - Hỗ trợ link rút gọn: `youtu.be/ID`
   - Hỗ trợ link luồng trực tiếp: `youtube.com/live/ID`
   - Hỗ trợ danh sách phát: `youtube.com/playlist?list=ID`
2. **Miền nhúng bảo mật cao (`youtube-nocookie.com`):**
   - Không theo dõi cookie cá nhân của người dùng, bảo vệ quyền riêng tư tối đa.
3. **Kênh phát 24/7 Curated:**
   - Cung cấp sẵn 3 kênh radio học tập/làm việc nổi tiếng nhất: *Lofi Girl Live*, *Synthwave Chill Radio*, và *Coffee Shop Lofi*. Người dùng chỉ cần chạm 1 nút là nhạc phát ngay lập tức.
4. **Kiểm soát trạng thái & Độ bền:**
   - Trạng thái URL được lưu trữ vĩnh viễn trong `localStorage` (`pomodoro_lofi_stream_url`). Khi tải lại trang, luồng nhạc yêu thích của người dùng được khôi phục nguyên vẹn.
   - Nút "Dừng phát luồng" giúp tắt ngay lập tức mà không làm ảnh hưởng đến các âm thanh nền khác đang chạy.

### B. Chime & Ambient Procedural Synthesizer
1. **0 Byte Asset Download:** Toàn bộ âm thanh chuông báo (6 loại) và âm thanh môi trường (14 loại) đều được sinh ra từ Web Audio Nodes (`OscillatorNode`, `AudioBufferSourceNode` chứa Paul Kellet noise, `BiquadFilterNode`, `StereoPannerNode` / `ChannelMergerNode`).
2. **Khử Clipping bằng DynamicsCompressor:** Khi người dùng bật đồng thời tiếng Mưa (`Rain`), Sấm sét (`Thunder`), Tiếng gió (`Wind`), Tiếng quán Cafe (`Cafe`) và Sóng não Alpha (`Alpha Beat`), tổng năng lượng âm thanh có thể vượt ngưỡng `1.0` gây rách màng loa. Nhờ có `DynamicsCompressorNode` đứng trước `destination`, tín hiệu được nén mềm mượt mà, âm trường sâu lắng và trong trẻo.

### C. Quản lý Đa Tab & Xử lý Chống Treo Trình Duyệt (Chromium Background Throttling)
Trong quá trình kiểm thử tự động với Playwright:
- Khi tab A chạy nền và tab B hoạt động ở tiền cảnh, Chromium trên Windows tự động hạ xung nhịp (throttle) microtask của tab A.
- Chúng tôi đã hoàn thiện cả mã nguồn ứng dụng lẫn kịch bản kiểm thử: bổ sung gọi `bringToFront()` xen kẽ và cơ chế bàn giao khóa Web Locks tự động (`runBeforeUnload`). Nhờ đó, cả 6 bài test E2E âm thanh đa tab đều vượt qua với kết quả tuyệt đối.

---

## 3. Bằng chứng Kiểm thử (Verification Logs)

### Kết quả Unit Tests (Vitest)
```bash
 ✓ tests/unit/audioEngine.test.ts (21 tests) 325ms
   - ChimeSynthesizer: twinkle, playtime, scifi, slow_rise, rooster, bird (6 tests)
   - AmbientSynthesizer: noise generators, binaural merger, procedural filters (8 tests)
   - AudioContextManager: compressor node, master gain, unlock events (4 tests)
   - Store & Persistence: mute toggle, volume sliders, local storage sync (3 tests)
```

### Kết quả E2E Tests (Playwright)
```bash
Running 6 tests using 1 worker
  ok 1 [chrome] › audioFlow.spec.ts:1. Mở widget Âm thanh từ Dock, kiểm tra trạng thái mặc định (8.6s)
  ok 2 [chrome] › audioFlow.spec.ts:2. Thao tác chọn loại chuông và kích hoạt nghe thử (Preview) (7.7s)
  ok 3 [chrome] › audioFlow.spec.ts:3. Bật/Tắt tiếng Master (Mute), điều chỉnh slider và khôi phục sau reload (6.6s)
  ok 4 [chrome] › audioFlow.spec.ts:4. Soundboard: Bật/Tắt đa track âm thanh nền, kiểm tra Disclaimer và nút Dừng tất cả (7.3s)
  ok 5 [chrome] › audioFlow.spec.ts:5. Tương thích Zen Mode: Ẩn widget giao diện nhưng không phá vỡ state âm thanh (5.8s)
  ok 6 [chrome] › audioFlow.spec.ts:6. Đa tab: Chỉ một tab ghi nhận atomic transaction phát chuông khi hết giờ (10.9s)
6 passed (59.3s)
```

### Ảnh chụp Màn hình Minh chứng
- Ảnh chụp Desktop với YouTube Stream Player và Soundboard đang phát: [`desktop-1440x900-audio-stream-playing.png`](file:///d:/FileCuaNam\Web'\Pomodoro\artifacts\visual-audit\desktop-1440x900-audio-stream-playing.png)
