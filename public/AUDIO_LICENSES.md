# Audio Assets & Procedural Synthesis Licenses

Tài liệu xác nhận nguồn gốc, bản quyền và kiến trúc kỹ thuật của toàn bộ âm thanh môi trường (Ambient Soundscapes) và chuông báo Pomodoro (Chimes) trong Pomodoro Workspace:

| Danh mục âm thanh | Mã nhận diện (Track ID) | Nguồn gốc tạo âm | Thuật toán / Kỹ thuật | Giấy phép sở hữu |
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

## Cam kết kỹ thuật & Pháp lý:
1. **100% Offline & Tự Sinh (Zero Network Requests):** Toàn bộ âm thanh được tổng hợp thời gian thực thông qua bộ xử lý tín hiệu số của Web Audio API trong trình duyệt người dùng. Không tải bất kỳ tệp MP3, WAV, OGG từ máy chủ hoặc CDN bên ngoài.
2. **Bảo vệ phần cứng âm thanh:** Tích hợp `DynamicsCompressorNode` (-6dB threshold, 8:1 ratio, 3ms attack) tại đầu ra Master Gain để triệt tiêu hiện tượng clipping (vỡ âm) khi trộn đồng thời nhiều kênh âm thanh.
3. **Quy định về Binaural Beats (Medical Disclaimer):** Âm thanh mô phỏng sóng não (Alpha, Beta, Gamma, Theta, Delta) chỉ nhằm mục đích giải trí và hỗ trợ tập trung tinh thần, **không phải thiết bị y tế** và không thay thế cho các liệu pháp trị liệu chuyên khoa.
