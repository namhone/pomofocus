# 40 Mẫu Thiết Kế Apple Liquid Glass Kèm Liên Kết Thực Tế (Dành Cho /app)

Tài liệu này cung cấp 40 mẫu thiết kế Liquid Glass chuyên sâu cho không gian làm việc PomoFocus `/app`, được liên kết trực tiếp với các kho thiết kế uy tín thế giới: [Uiverse.io Glassmorphism](https://uiverse.io/tags/glassmorphism), [Uiverse.io Glass Cards](https://uiverse.io/ui/glassmorphism-cards), [Dribbble Liquid Glass Design](https://dribbble.com/tags/liquid-glass-web-design), và [Figma Community](https://www.figma.com/community).

---

### Nhóm 1: Khung Cửa Sổ Thấu Kính & Viền Phản Xạ (Window Containers)
1. **Liquid Glass Window Card**
   - *Tham chiếu thực tế*: [Uiverse Glassmorphism Card #73](https://uiverse.io/ui/glassmorphism-cards) & [Dribbble Liquid Glass UI](https://dribbble.com/tags/liquid-glass-web-design)
   - *Đặc tả*: `bg-zinc-950/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-3xl p-6`
2. **Specular Top Highlight**
   - *Tham chiếu*: [Uiverse Glass Card Bezel](https://uiverse.io/ui/glassmorphism-ui)
   - *Đặc tả*: Viền trên mô phỏng ánh sáng chiếu xiên `before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`
3. **Inner Glass Glow**
   - *Tham chiếu*: [Figma Community Liquid Glass](https://www.figma.com/community)
   - *Đặc tả*: Lớp hào quang viền trong `ring-1 ring-inset ring-white/5`
4. **Window Header Flatter**
   - *Tham chiếu*: [Uiverse Minimal Window Header](https://uiverse.io/cards)
   - *Đặc tả*: Thanh kéo cửa sổ cao 36px, không đường kẻ thô, 6 chấm kéo ẩn hiện khi hover
5. **Traffic Light Close Button**
   - *Tham chiếu*: [Apple macOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
   - *Đặc tả*: Nút tròn 14px `w-3.5 h-3.5 rounded-full bg-white/10 hover:bg-rose-500/80 transition-all`
6. **Capsule Minimize Pill**
   - *Tham chiếu*: [Uiverse Glass Capsule](https://uiverse.io/elements?search=glass)
   - *Đặc tả*: `rounded-full px-3 py-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10`
7. **Resize Corner Handle**
   - *Tham chiếu*: [Dribbble Window Resize](https://dribbble.com/tags/liquid-glass-web-design)
   - *Đặc tả*: 3 vạch xước khúc xạ ở góc dưới phải `opacity-30 hover:opacity-100 cursor-nwse-resize`
8. **Zero Header Ceiling Container**
   - *Tham chiếu*: [Apple visionOS Window System](https://developer.apple.com/visionos/)
   - *Đặc tả*: Cho phép widget kéo lên sát mép màn hình `top-2` (y = 8px)

### Nhóm 2: Đồng Hồ Pomodoro Kính Lỏng (Liquid Timer)
9. **Giant Refraction Timer Digits**
   - *Tham chiếu*: [Uiverse Glass Display](https://uiverse.io/ui/glassmorphism-ui)
   - *Đặc tả*: Chữ số đếm ngược 64px font mono trắng ngọc `drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)]`
10. **4-Stage Liquid Hiệp Dots**
    - *Tham chiếu*: [Uiverse Status Dots](https://uiverse.io/elements?search=dots)
    - *Đặc tả*: 4 chấm 8px `bg-white/10`, khi hoàn thành hiệp phát sáng xanh ngọc `bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]`
11. **Glass Pill Action Button**
    - *Tham chiếu*: [Uiverse Glass Buttons](https://uiverse.io/elements?search=glass+button)
    - *Đặc tả*: `bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-2.5 rounded-full border border-white/15 backdrop-blur-md active:scale-95 transition-all`
12. **Hidden Gear Quick Config**
    - *Tham chiếu*: [Dribbble Minimal Popover](https://dribbble.com/tags/liquid-glass-web-design)
    - *Đặc tả*: Icon bánh răng nhỏ góc trên, bấm vào mở popover kính chỉnh phút
13. **Glowing SVG Progress Ring**
    - *Tham chiếu*: [Uiverse Circular Progress](https://uiverse.io/elements?search=progress)
    - *Đặc tả*: Vòng tiến độ SVG mỏng 2px trắng mờ 5%, vòng chạy ngọc bích `strokeLinecap="round"`
14. **Fluid Gradient Shift**
    - *Tham chiếu*: [Jitter Video Frosted Glass Counter](https://jitter.video/templates/)
    - *Đặc tả*: Hiệu ứng gradient mờ chuyển động chậm khi timer đang chạy

### Nhóm 3: Danh Sách Công Việc & Ghi Chú Kính Mờ (Tasks & Notes)
15. **Hollow Glass Checkbox**
    - *Tham chiếu*: [Uiverse Minimal Checkbox](https://uiverse.io/elements?search=checkbox)
    - *Đặc tả*: Vòng tròn rỗng `w-4 h-4 rounded-full border border-white/30 hover:border-emerald-400`
16. **Seamless Task Input**
    - *Tham chiếu*: [Uiverse Borderless Input](https://uiverse.io/elements?search=input)
    - *Đặc tả*: `bg-transparent border-0 text-white placeholder-white/30 focus:ring-0 text-sm`
17. **Fluid Row Hover**
    - *Tham chiếu*: [Uiverse Glass List Item](https://uiverse.io/cards)
    - *Đặc tả*: Dòng việc hover đổi màu nhẹ `hover:bg-white/[0.04] rounded-xl px-2.5 py-2`
18. **Micro Dot Priority Indicator**
    - *Tham chiếu*: [Apple HIG Status Colors](https://developer.apple.com/design/human-interface-guidelines/)
    - *Đặc tả*: Chấm 6px: Đỏ gạch (Gấp) / Hổ phách (Vừa) / Xám (Bình thường)
19. **Translucent Note Slate**
    - *Tham chiếu*: [Dribbble Notes Glass](https://dribbble.com/tags/liquid-glass-web-design)
    - *Đặc tả*: Textarea trong suốt, tự dãn dòng, ẩn thanh cuộn thô
20. **Discreet Character Meter**
    - *Tham chiếu*: [Uiverse Counter Badge](https://uiverse.io/elements?search=badge)
    - *Đặc tả*: Con số nhỏ mịn nằm góc dưới `text-[10px] text-white/40 font-mono`

### Nhóm 4: Bảng Âm Thanh & Trình Phát Media (Audio & Media)
21. **Zero-Fluff Sound Row**
    - *Tham chiếu*: [Uiverse Audio Controller](https://uiverse.io/elements?search=audio)
    - *Đặc tả*: Hàng âm thanh gồm Icon + Tên + Slider mỏng, không có câu văn mô tả sến
22. **Ultra-thin Volume Slider**
    - *Tham chiếu*: [Uiverse Custom Sliders](https://uiverse.io/elements?search=slider)
    - *Đặc tả*: Rãnh trượt 3px `bg-white/10 rounded-full`, đầu kéo nút tròn kính `w-3 h-3 bg-white`
23. **Subtle Audio Wave Pulse**
    - *Tham chiếu*: [LottieFiles Sound Wave](https://lottiefiles.com/)
    - *Đặc tả*: Icon phát sóng dao động nhẹ khi âm thanh đang bật
24. **16:9 Aspect-Ratio Locked Media Card**
    - *Tham chiếu*: [Uiverse Video Glass Card](https://uiverse.io/cards)
    - *Đặc tả*: Thẻ video YouTube khóa cứng tỷ lệ 16:9 khi dãn khung
25. **Liquid Channel Pill Bar**
    - *Tham chiếu*: [Uiverse Segmented Control](https://uiverse.io/elements?search=tabs)
    - *Đặc tả*: Thanh chuyển tab dạng viên thuốc trượt kính mờ

### Nhóm 5: Khung Chat AI Companion Nổi (Liquid AI Sidebar)
26. **Autonomous High-Z-Index Sidebar**
    - *Tham chiếu*: [Dribbble AI Assistant Drawer](https://dribbble.com/tags/liquid-glass-web-design)
    - *Đặc tả*: Chiều cao `h-[calc(100vh-24px)]`, nằm nổi ở `z-[80]`, đỉnh panel không bị header che
27. **Liquid Refractive Assistant Bubble**
    - *Tham chiếu*: [Uiverse Chat Bubbles](https://uiverse.io/elements?search=chat)
    - *Đặc tả*: `bg-white/[0.05] border border-white/10 rounded-2xl p-3.5 backdrop-blur-xl text-zinc-100`
28. **Deep Dark User Chat Bubble**
    - *Tham chiếu*: [Uiverse Chat Bubbles](https://uiverse.io/elements?search=chat)
    - *Đặc tả*: `bg-zinc-800/80 border border-white/5 rounded-2xl p-3 text-white ml-auto`
29. **Floating Pill Prompt Field**
    - *Tham chiếu*: [Uiverse Floating Input](https://uiverse.io/elements?search=input)
    - *Đặc tả*: Khung nhập bo tròn 28px `bg-zinc-900/80 border border-white/10 shadow-lg px-4 py-2.5`
30. **Emerald Send Trigger**
    - *Tham chiếu*: [Uiverse Send Buttons](https://uiverse.io/elements?search=button)
    - *Đặc tả*: Nút tròn nhỏ `bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-full p-2`
31. **Translucent Prompt Suggestion Chips**
    - *Tham chiếu*: [Uiverse Chips Component](https://uiverse.io/elements?search=chips)
    - *Đặc tả*: `rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 hover:border-white/30 text-zinc-300`
32. **Discrete Energy Counter**
    - *Tham chiếu*: [Apple macOS Battery Indicator Style](https://developer.apple.com/design/)
    - *Đặc tả*: Chỉ số `⚡ 50` dạng text mảnh viền mỏng ở góc dưới, không chèn banner bán hàng

### Nhóm 6: Thanh Dockbar Đáy & Tương Tác Cốt Lõi
33. **macOS Floating Glass Dock**
    - *Tham chiếu*: [Uiverse macOS Dock](https://uiverse.io/elements?search=dock) & [Dribbble Floating Bar](https://dribbble.com/tags/liquid-glass-web-design)
    - *Đặc tả*: Nổi cách đáy 16px `bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 py-2 shadow-2xl`
34. **Dock Icon Magnification**
    - *Tham chiếu*: [Motion.dev Spring Examples](https://motion.dev/)
    - *Đặc tả*: Icon phóng to nhẹ khi hover (`hover:scale-110 active:scale-95`)
35. **Under-Icon Running Indicator Dot**
    - *Tham chiếu*: [Apple macOS Dock Running State](https://developer.apple.com/design/)
    - *Đặc tả*: Chấm sáng 3px bên dưới mỗi icon biểu thị thẻ tương ứng đang mở
36. **Submenu Home Relocation**
    - *Tham chiếu*: [Apple Minimal App Architecture](https://developer.apple.com/design/)
    - *Đặc tả*: Đưa nút Home về trang chủ vào menu cài đặt phụ, giải phóng 100% đỉnh màn hình
37. **Quick Popover Glass Menu**
    - *Tham chiếu*: [Uiverse Glass Dropdown](https://uiverse.io/elements?search=dropdown)
    - *Đặc tả*: Menu mở dạng popover không làm tối toàn màn hình
38. **Un-blurred Backdrop Click-Outside**
    - *Tham chiếu*: [Linear.app UI Architecture](https://linear.app/)
    - *Đặc tả*: Lớp phủ chỉ bắt sự kiện click-outside `bg-black/10`, không dùng `backdrop-blur-sm`
39. **Dynamic Island Toast Capsule**
    - *Tham chiếu*: [Apple Dynamic Island Guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities)
    - *Đặc tả*: Toast nổi từ đỉnh dạng con nhộng đen tuyền bo tròn 30px với viền sáng mỏng
40. **Ambient Glass Specular Glow**
    - *Tham chiếu*: [Hire Digital Liquid Glass](https://dribbble.com/tags/liquid-glass-web-design)
    - *Đặc tả*: Hiệu ứng phản quang ánh sáng chạy quanh viền khi người dùng tương tác
