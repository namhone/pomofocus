# PROMPT CHÍNH — OpenHands + DeepSeek

Đọc và áp dụng skill `lifeat-workspace-research` tại `.agents/skills/lifeat-workspace-research/SKILL.md` trước khi làm bất kỳ việc gì.

## Mục tiêu
Nghiên cứu LifeAt.io làm reference chính để lập đặc tả cho một web immersive Pomodoro workspace riêng. Hiện tại CHỈ nghiên cứu và tạo tài liệu; KHÔNG triển khai tính năng, sửa source code ứng dụng hoặc deploy.

## Reference URLs
- https://lifeat.io/
- https://lifeat.io/app?space=M7KQ-IKXC
- https://www.lifeat.com/feature/virtual-spaces
- https://test.lifeat.app/feature/pomodoro
- https://lifeat.io/feature/focus-with-others

## Quy trình bắt buộc
1. Kiểm tra repo/workspace hiện tại, xác định framework, cấu trúc và thay đổi đang có. Không ghi đè hoặc xóa file hiện hữu.
2. Đọc toàn bộ skill. Kiểm tra công cụ browser thật sự khả dụng trong OpenHands. Nếu chưa có, thử phương án có sẵn (browser tool, Playwright/browser automation, HTTP fetch chỉ khi phù hợp). Không tuyên bố đã duyệt UI hoặc chụp screenshot nếu chưa thực hiện được.
3. Khám phá LifeAt theo từng trang và module: workspace/virtual spaces, background, soundboard, Pomodoro (Personal, Group, Task Countdown), timer settings, alarm sounds, tasks/projects/tags/filters, notes, media embeds, calendar, Google Calendar integration nếu quan sát được, Focus/Plan/Explore, authentication, shared rooms, chat/microphone nếu có thể truy cập.
4. Thử các thao tác thực tế an toàn: navigation, open/close/hide widgets, timer settings, audio controls, task CRUD/filter, media add/link, responsive viewport. Không mua hàng, gửi tin nhắn ra ngoài, thay đổi tài khoản, vượt paywall/CAPTCHA hoặc truy cập dữ liệu không được phép.
5. Lưu evidence có URL, viewport, trạng thái, hành động và kết quả. Phân loại từng phát hiện là `OBSERVED`, `INFERRED`, `USER_REQUIREMENT` hoặc `UNKNOWN`. Tách rõ hành vi LifeAt đã xác minh với tính năng chỉ do chủ dự án yêu cầu.
6. Tạo thư mục `product-spec/` với các đầu ra dưới đây, giữ nội dung chi tiết và có thể dùng trực tiếp cho một coding agent khác.
7. Kiểm tra chéo mọi đầu ra, bổ sung acceptance criteria và test cases. Cuối cùng báo cáo route/module đã kiểm tra, chưa kiểm tra, bằng chứng và hạn chế.

## Yêu cầu sản phẩm của người dùng
- Pomodoro đầy đủ: Personal, Group, Task Countdown; chỉnh Focus/Short Break/Long Break, số vòng; auto-transition; hide pomodoro count; timer alarm gồm Twinkle, Playtime, Sci-fi, Slow Rise, Rooster, Bird; chỉnh volume.
- Background Studio: template tĩnh/động, thư viện có thể mở rộng, custom background, preset.
- Ambient Sound Library/mixer: trộn nhiều lớp, volume từng lớp và master volume; thunder, alpha/beta/gamma/theta/delta brainwave-style audio, white/pink/brown noise, birds, forest/trees, space, rain, rain on car roof, water, sailing, park, street, restaurant, rooftop, wind, purring cat, office, design lab, mechanical keyboard, cafe, campfire, lava, ocean/beach. Không đưa ra tuyên bố y tế không có bằng chứng.
- Media: thêm link, playlist, album, song/video từ YouTube, YouTube Music, Spotify, Apple Music và các dịch vụ khả thi. Ghi rõ giới hạn embed, API, OAuth, Premium/account, autoplay và playback-in-background của từng nền tảng; không hứa tính năng chưa xác minh.
- Tasks: name, project, tags, description, date, time, deadline, estimated duration, time spent, repeat; create/edit/complete/archive/delete; filter, sort, search.
- Notes độc lập và gắn task/project.
- Calendar ngày/tuần/tháng, time blocking, Google Calendar OAuth/sync, timezone và conflict handling.
- Focus/Plan/Explore modes dùng chung workspace state.
- Shared rooms: create/join/invite, synced focus state, text chat, voice chat/microphone, mute, permissions, host controls; nêu rõ yêu cầu realtime/WebRTC/STUN/TURN.
- Auth: email/password, email verification, reset password, Google OAuth, server-side authorization, user data isolation.
- Desktop-like web workspace: background làm nền; windows/tabs có thể di chuyển, resize, minimize, maximize, hide/show, z-order; dock để mở lại; lưu layout. Mobile/tablet phải có responsive fallback.

## Deliverables bắt buộc
Tạo `product-spec/`:
- `00-EXECUTIVE-SUMMARY.md`
- `01-PRD.md`
- `02-REFERENCE-MAP.md`
- `03-ROUTES-AND-SCREENS.md`
- `04-DESIGN-SYSTEM.md`
- `05-INTERACTION-SPEC.md`
- `06-FEATURE-MATRIX.csv`
- `07-DATA-MODEL.md`
- `08-TECHNICAL-ARCHITECTURE.md`
- `09-INTEGRATION-CONSTRAINTS.md`
- `10-ACCEPTANCE-TESTS.md`
- `11-UNKNOWN-AND-DECISIONS.md`
- `evidence/` chứa screenshot/ghi chú bằng chứng nếu tool hỗ trợ
- `README.md` giải thích thứ tự đọc và cách coding agent dùng các file

## Nguyên tắc kỹ thuật
- Không sao chép mã nguồn, nội dung có bản quyền hoặc asset riêng tư của LifeAt. Dùng LifeAt để học pattern, rồi đặc tả thiết kế độc lập.
- Không đoán backend/database/logic nội bộ. Ghi `UNKNOWN` nếu không thể xác minh.
- Đừng chỉ tạo bản tóm tắt. Mỗi module cần UI states, interactions, data requirements, edge cases, responsive behavior và acceptance criteria.
- Nếu browser/tool bị chặn, tiếp tục các phần có thể làm và liệt kê chính xác hạn chế; không giả vờ đã hoàn tất.
- Không cài package, thay đổi cấu hình, sửa source, commit, push hoặc deploy nếu chưa được yêu cầu.

## Definition of Done
Hoàn tất khi mọi deliverable đã được tạo, yêu cầu người dùng được map vào feature matrix, các quan sát LifeAt có nhãn bằng chứng, unknowns được ghi rõ, acceptance tests có thể kiểm thử, và báo cáo cuối nêu rõ mức độ bao phủ cùng giới hạn. Sau đó dừng và chờ người dùng duyệt trước khi code.
