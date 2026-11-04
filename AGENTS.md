# POMOFOCUS WORKSPACE — GLOBAL AGENT GOVERNANCE & EXECUTION CONTRACT

## 1. MANDATORY DESIGN PLAYBOOK PROTOCOL (UI/UX)

> [!IMPORTANT]
> **QUY ĐỊNH BẮT BUỘC TỐI CAO**:  
> Trước khi thực hiện bất kỳ thay đổi nào liên quan đến Giao diện Người dùng (UI/UX), Component, Layout, CSS hoặc Animation, MỌI Agent bắt buộc phải **ĐỌC VÀ ĐỐI CHIẾU** tệp cẩm nang:
> 📁 [docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md](docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md)

### 5 Quy Tắc Bất Biến Từ Cẩm Nang Thiết Kế:
1. **Z-Index Layer Hierarchy & State Singularity**:
   - Tuân thủ bảng phân tầng Z-Index tập trung (`z-10` workspace, `z-20` dock, `z-40` capsule/drawers, `z-50` full header/modals).
   - Tuyệt đối cấm render 2 component menu song song. Sử dụng State Singularity (`isHeaderExpanded`).
2. **Cloud-First Persistence (Supabase 100%)**:
   - Dữ liệu Chat AI, Credits ⚡, Gói cước (Founder/Pro), Avatar, Tasks, Notes bắt buộc lưu trữ trên Supabase Cloud để đồng bộ đa thiết bị. Cấm lưu cục bộ vào `localStorage`.
3. **Founder VIP & Whitelist Verification**:
   - Luôn sử dụng hàm kiểm tra tập trung `hasVipAccess(user)` và kiểm tra `OWNER_EMAILS` (`namho03052k9@gmail.com`, `huyentrantt09@gmail.com`). Tuyệt đối không để banner nâng cấp hiển thị trước mặt Founder.
4. **Dynamic Layout Flow & Mobile Safety**:
   - Header thu gọn: nội dung `pt-3`. Header mở rộng: nội dung `pt-14 sm:pt-16` (56px).
   - Đáy màn hình luôn bảo đảm khoảng đệm an toàn (`pb-28`) để DockBar không che khuất nội dung.
5. **Streamlined Comparison Matrix**:
   - Bảng giá tối giản: gom tính năng cơ bản thành 1 dòng, chỉ giữ lại 6 hàng so sánh cốt lõi. Chỉ dùng `✓` và `—`, không dùng `❌`.

---

## 2. PRE-FLIGHT UI CHECKLIST (5 BƯỚC NGHIỆM THU)

Mọi thay đổi UI phải vượt qua Checklist 5 bước được quy định trong `docs/UI_UX_DESIGN_PLAYBOOK_AND_POSTMORTEM.md` trước khi báo cáo hoàn thành:
- [ ] **Bước 1 - Z-Index & Collision**: Không có phần tử che khuất nhau, không có 2 header cùng hiển thị.
- [ ] **Bước 2 - Mobile Safe Area & Flow**: Thử nghiệm trên 390px, không cắt chữ, `pt-3`/`pt-14` mượt mà.
- [ ] **Bước 3 - State Singularity**: Chỉ hiển thị 1 hình thái duy nhất (Viên nang nổi hoặc Header đầy đủ).
- [ ] **Bước 4 - Multi-Device Sync**: Dữ liệu đồng bộ Realtime qua Supabase, đổi máy không mất.
- [ ] **Bước 5 - Founder & Role Test**: Đăng nhập tài khoản Founder, 100% tính năng mở khóa, 0 banner đòi tiền.

---

## 3. ZERO-TOLERANCE POLICY

Bất kỳ PR hoặc commit nào vi phạm lại một trong 5 lỗi kiến trúc kinh điển trong Cẩm nang sẽ bị **TỪ CHỐI NGHIỆM THU NGAY LẬP TỨC**, bất kể Unit Tests có pass 100%.
