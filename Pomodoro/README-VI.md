# LifeAt Research Pack cho OpenHands + DeepSeek

## Nội dung
- `PROMPT-CHINH.md`: prompt duy nhất để dán vào agent OpenHands.
- `.agents/skills/lifeat-workspace-research/SKILL.md`: skill hướng dẫn quy trình nghiên cứu LifeAt và tạo product specification.

## Cách dùng
1. Giải nén vào thư mục gốc project đang mở trong OpenHands.
2. Kiểm tra để có cấu trúc `.agents/skills/lifeat-workspace-research/SKILL.md` và `PROMPT-CHINH.md`.
3. Dán nội dung `PROMPT-CHINH.md` vào OpenHands/DeepSeek.
4. Agent cần đọc skill trước khi làm. Skill là hướng dẫn, không tự cấp quyền browser; nếu môi trường không có browser automation, agent phải báo rõ và không được giả vờ đã kiểm tra UI.
5. Đầu ra dự kiến nằm trong `product-spec/`. Đây là research/spec only; không code hay deploy.

Nếu OpenHands của bạn dùng cơ chế skill path khác, vẫn có thể dán trực tiếp nội dung `SKILL.md` vào context hoặc đặt file ở đường dẫn mà phiên bản/cấu hình OpenHands nhận diện. Không cần cài skill vào model DeepSeek; skill được agent đọc như tài liệu hướng dẫn.
