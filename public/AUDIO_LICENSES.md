# Audio Assets & Procedural Synthesis Licenses

Tài liệu xác nhận nguồn gốc, bản quyền và kiến trúc kỹ thuật của toàn bộ âm thanh môi trường (Ambient Soundscapes) và chuông báo Pomodoro (Chimes) trong Pomodoro Workspace:

## 1. Bảng Danh Mục Tín Hiệu & Thuật Toán Tổng Hợp Âm Thanh

| Danh mục âm thanh | Mã nhận diện (Track ID) | Nguồn gốc tạo âm | Thuật toán / Kỹ thuật | Giấy phép tín hiệu âm thanh |
| :--- | :--- | :--- | :--- | :--- |
| **Mưa Rào (Rain)** | `rain` | Web Audio API Procedural Synthesis | Pink noise qua bộ lọc Biquad Filter kép (Lowpass 1000Hz + Highpass 150Hz) | **CC0 1.0 Universal (Public Domain)** |
| **Sóng Biển (Ocean Waves)** | `ocean_waves` | Web Audio API Procedural Synthesis | Pink/Brown noise kết hợp Lowpass Biquad Filter điều biến LFO 0.12Hz mô phỏng chu kỳ sóng triều | **CC0 1.0 Universal (Public Domain)** |
| **Suối Nước (Stream)** | `stream` | Web Audio API Procedural Synthesis | Pink noise qua Bandpass Filter 650Hz với LFO 0.4Hz tạo nhịp nước chảy róc rách | **CC0 1.0 Universal (Public Domain)** |
| **Quán Cà Phê (Café)** | `cafe` | Web Audio API Procedural Synthesis | Hòa trộn Pink noise qua Lowpass Filter 500Hz dải tần ấm cúng | **CC0 1.0 Universal (Public Domain)** |
| **Bàn Phím Cơ (Keyboard)** | `keyboard` | Web Audio API Procedural Synthesis | White noise lọc dải hẹp Bandpass 2200Hz với hệ số Q cao (Q=4.0) | **CC0 1.0 Universal (Public Domain)** |
| **Lửa Trại (Campfire)** | `campfire` | Web Audio API Procedural Synthesis | Brown noise qua Lowpass Filter 450Hz dải trầm ấm áp | **CC0 1.0 Universal (Public Domain)** |
| **Tiếng Ồn Trắng (White Noise)** | `noise_white` | Web Audio API Procedural Synthesis | Thuật toán sinh mẫu ngẫu nhiên phân bố đều Math.random() | **CC0 1.0 Universal (Public Domain)** |
| **Tiếng Ồn Hồng (Pink Noise)** | `noise_pink` | Web Audio API Procedural Synthesis | Bộ lọc IIR 3-pole của Paul Kellet (-3dB/octave) | **CC0 1.0 Universal (Public Domain)** |
| **Tiếng Ồn Nâu (Brown Noise)** | `noise_brown` | Web Audio API Procedural Synthesis | Tích phân ngẫu nhiên Brownian Random Walk (-6dB/octave) | **CC0 1.0 Universal (Public Domain)** |
| **Nhịp Âm Hai Tai (Binaural Beats)** | `binaural_alpha`, `binaural_beta`, `binaural_gamma`, `binaural_theta`, `binaural_delta` | Web Audio API Procedural Synthesis | Dao động sóng sin thuần túy với ChannelMergerNode phân tách tần số lệch pha Stereo Trái/Phải | **CC0 1.0 Universal (Public Domain)** |
| **Chuông Báo (Chimes)** | `twinkle`, `playtime`, `scifi`, `slow_rise`, `rooster`, `bird` | Web Audio API Procedural Synthesis | Chuỗi bộ dao động Triangle/Sine/Sawtooth với bao phong Exponential Envelope | **CC0 1.0 Universal (Public Domain)** |

## 2. Phân Định Giấy Phép Rõ Ràng

1. **Tín hiệu âm thanh tự sinh (Synthesized Audio Waves):**
   - 100% âm thanh được tính toán bằng các công thức toán học và hàm số chuẩn của chuẩn Web Audio API W3C.
   - Tín hiệu âm thanh đầu ra thuộc diện **Public Domain / CC0 1.0 Universal** (không có quyền tác giả đối với dạng sóng dao động số thuần túy).
   - Tuyệt đối không sử dụng tệp âm thanh nhị phân (MP3, WAV, OGG, FLAC) từ bên ngoài.
2. **Mã nguồn ứng dụng (Application Source Code):**
   - Toàn bộ mã nguồn triển khai trong `src/services/` (`audioContextManager.ts`, `chimeSynthesizer.ts`, `ambientSynthesizer.ts`), `src/stores/useAudioStore.ts` và `src/components/AudioWidget.tsx` thuộc bản quyền mã nguồn của dự án Pomodoro Workspace theo giấy phép của kho lưu trữ.
3. **Thư viện phụ thuộc bên thứ ba (Third-party Dependencies):**
   - `zustand`: MIT License.
   - `lucide-react`: ISC License.
   - `dexie`: Apache-2.0 License.
   - `react` / `react-dom`: MIT License.

## 3. Nguyên Tắc Kỹ Thuật & Giới Hạn

1. **100% Offline & Tự Sinh (Zero Network Requests):** Toàn bộ âm thanh được tổng hợp thời gian thực qua Web Audio API. 0 request mạng, 0 byte tải ngoài.
2. **Kiểm soát dải động (Dynamic Range Management):** Tích hợp `DynamicsCompressorNode` (-6dB threshold, 8:1 ratio, 3ms attack, 250ms release) tại đầu ra Master Gain nhằm kiểm soát dải động và giảm nguy cơ clipping/vỡ âm khi kết hợp nhiều nguồn âm. Lưu ý kỹ thuật: Đây là bộ nén dải động phần mềm, không thể coi là bảo đảm tuyệt đối 100% chống méo tiếng trong mọi điều kiện âm lượng phần cứng hoặc đầu vào cực đoan.
3. **Lưu ý y tế về Binaural Beats (Medical Disclaimer):** Âm thanh mô phỏng sóng não (Alpha, Beta, Gamma, Theta, Delta) chỉ nhằm mục đích giải trí và hỗ trợ tạo không gian tập trung. **Không phải thiết bị y tế**, hiệu quả hỗ trợ tập trung hoặc cải thiện giấc ngủ chưa được chứng minh lâm sàng và không được bảo đảm bởi tính năng này; không có tác dụng thay thế chẩn đoán hay điều trị y khoa.
