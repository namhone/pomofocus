import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { MobileSubViewLayout } from './mobile/MobileSubViewLayout';
import {
  FileText,
  Shield,
  CheckCircle2,
  Info,
  Smartphone,
  Lock,
  UserCheck
} from 'lucide-react';

interface LegalViewsProps {
  initialTab?: 'terms' | 'privacy' | 'about';
}

export const LegalViews: React.FC<LegalViewsProps> = ({ initialTab = 'terms' }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'about'>(initialTab);

  const pageTitle =
    activeTab === 'terms'
      ? 'Điều Khoản Dịch Vụ'
      : activeTab === 'privacy'
      ? 'Chính Sách Bảo Mật (PDPL)'
      : 'Về PomoFocus';

  return (
    <MobileSubViewLayout
      title={pageTitle}
      subtitle="Pháp lý & Quyền riêng tư"
      onBack={() => router.navigate('/app')}
      className="selection:bg-white selection:text-black"
    >
      <div data-testid="legal-views" className="w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-8">
        {/* Sub-nav Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'terms'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Điều khoản dịch vụ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Chính sách bảo mật (pdpl)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'about'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Về PomoFocus
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Vào không gian</span>
            <span>→</span>
          </button>
        </div>

        {/* Tab 1: Terms of Service */}
        {activeTab === 'terms' && (
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 text-xs leading-relaxed text-zinc-300">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <FileText size={20} className="text-white shrink-0" />
                <span>Điều khoản dịch vụ (terms of service)</span>
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono">
                Cập nhật: tháng 11, 2026 • tuân thủ luật thương mại điện tử 122/2025/QH15 & nghị định 248/2026/nđ-cp
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">1. Chấp nhận điều khoản</h2>
              <p>
                Bằng việc truy cập hoặc sử dụng PomoFocus (bao gồm nền tảng web, ứng dụng di động Android APK `com.PomoFocus.workspace` và phòng học nhóm trực tuyến), bạn đồng ý chịu sự ràng buộc bởi các điều khoản này cùng chính sách bảo mật của chúng tôi. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng dịch vụ.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">2. Quyền sở hữu & sử dụng hợp pháp</h2>
              <p>
                PomoFocus được thiết kế nhằm mục đích hỗ trợ học tập, làm việc tập trung và rèn luyện thói quen quản lý thời gian. Người dùng chịu hoàn toàn trách nhiệm đối với dữ liệu cá nhân tự nhập hoặc tải lên (bao gồm âm thanh nền, video tùy chọn, danh sách nhiệm vụ và nội dung câu hỏi AI). Tuyệt đối nghiêm cấm các hành vi phát tán mã độc, quấy rối trong phòng học chung hoặc sử dụng dịch vụ vào mục đích phi pháp.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">3. Dịch vụ số, gói bản quyền & điểm năng lượng AI (AI credits)</h2>
              <p>
                Theo quy định của luật thương mại điện tử số 122/2025/QH15 và luật bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong className="text-zinc-200">Niêm yết giá:</strong> Toàn bộ giá gói cước (tháng, năm, trọn đời Founder) và gói nạp AI credits được niêm yết rõ ràng bằng việt nam đồng (vnd), đã bao gồm toàn bộ phí dịch vụ và thuế áp dụng.</li>
                <li><strong className="text-zinc-200">Phương thức thanh toán:</strong> Người dùng thanh toán qua cổng điện tử hợp pháp (chuyển khoản QR ngân hàng VietQR/SePay hoặc ví momo). Hệ thống kích hoạt gói hoặc cộng điểm tự động sau khi đối soát thành công.</li>
                <li><strong className="text-zinc-200">Chính sách hoàn tiền (refund policy):</strong> Khách hàng được quyền yêu cầu hoàn tiền 100% trong vòng <strong>07 ngày</strong> kể từ thời điểm giao dịch nếu xảy ra lỗi kỹ thuật từ phía hệ thống khiến tài khoản không nhận được dịch vụ hoặc điểm credits như cam kết. Yêu cầu gửi về email <code className="text-zinc-300">support@PomoFocus.vn</code> kèm mã đơn hàng.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">4. Trí tuệ nhân tạo & giới hạn trách nhiệm</h2>
              <p>
                Tính năng trợ lý AI học tập được tích hợp nhằm mục đích giải đáp thắc mắc và gợi ý học tập. Theo luật trí tuệ nhân tạo số 134/2025/QH15 và nghị định 142/2026/nđ-cp, nội dung phản hồi do thuật toán sinh ra tự động, chỉ mang tính chất tham khảo học tập. Người học cần đối chiếu với tài liệu giáo trình chính thống; PomoFocus không chịu trách nhiệm đối với các quyết định học thuật hoặc pháp lý của người dùng dựa trên thông tin này.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">5. Đơn vị vận hành & hỗ trợ khách hàng</h2>
              <p>
                Đại diện quản trị: <strong>Hồ ngọc bảo nam</strong><br />
                Email tiếp nhận: <code className="text-zinc-300">support@PomoFocus.vn</code> • Cổng hỗ trợ trực tuyến: <code className="text-zinc-300">PomoFocus-workspace.vercel.app/contact</code><br />
                Địa chỉ: đà nẵng, việt nam.
              </p>
            </section>
          </div>
        )}

        {/* Tab 2: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 text-xs leading-relaxed text-zinc-300">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Shield size={20} className="text-zinc-300 shrink-0" />
                <span>Chính sách bảo mật dữ liệu cá nhân (privacy policy)</span>
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono">
                Căn cứ theo luật bảo vệ dữ liệu cá nhân 91/2025/QH15 & nghị định 356/2025/nđ-cp (thay thế nghị định 13/2023)
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <UserCheck size={14} className="text-zinc-300" />
                <span>1. Đơn vị kiểm soát & xử lý dữ liệu cá nhân</span>
              </h2>
              <p>
                <strong>Bên kiểm soát và xử lý dữ liệu:</strong> PomoFocus Workspace.<br />
                <strong>Cán bộ phụ trách bảo vệ dữ liệu (dpo):</strong> Hồ ngọc bảo nam.<br />
                <strong>Kênh tiếp nhận khiếu nại & yêu cầu:</strong> Email <code className="text-zinc-300">support@PomoFocus.vn</code> | Biểu mẫu liên hệ trực tuyến.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Lock size={14} className="text-zinc-300" />
                <span>2. Lưu trữ và đồng bộ dữ liệu</span>
              </h2>
              <div className="space-y-2 text-zinc-400">
                <p>
                  <strong className="text-zinc-200">• Dữ liệu học tập cá nhân (tasks, notes, lịch trình, pomodoro logs):</strong> Được lưu trên thiết bị để tiếp tục sử dụng khi mất mạng. Khi đăng nhập, dữ liệu được đồng bộ với tài khoản để bạn truy cập trên các thiết bị khác.
                </p>
                <p>
                  <strong className="text-zinc-200">• Dữ liệu định danh tài khoản:</strong> Khi người dùng đăng ký qua email hoặc Google, chúng tôi chỉ lưu trữ thông tin tối thiểu: họ tên hiển thị, địa chỉ email, ảnh đại diện và vai trò tài khoản (được lưu cùng tài khoản) nhằm duy trì phiên đăng nhập và quyền lợi bản quyền.
                </p>
                <p>
                  <strong className="text-zinc-200">• Dữ liệu phòng học trực tuyến (/rooms):</strong> Video và âm thanh được truyền trực tiếp giữa người tham gia; bảng vẽ được chia sẻ với các thành viên trong phòng, PomoFocus không thực hiện ghi âm, ghi hình hay lưu lại nội dung đàm thoại của bạn.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Smartphone size={14} className="text-zinc-300" />
                <span>3. Giải trình quyền truy cập trên ứng dụng di động Android</span>
              </h2>
              <p>
                Ứng dụng di động PomoFocus (gói APK: <code className="text-zinc-300">com.PomoFocus.workspace</code>) tuân thủ nguyên tắc thu thập tối thiểu và chỉ yêu cầu các quyền thực sự cần thiết:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong className="text-zinc-200">CAMERA & RECORD_AUDIO:</strong> Chỉ kích hoạt khi bạn chủ động mở webcam hoặc microphone trong phòng học nhóm. Ứng dụng tuyệt đối không kích hoạt ngầm khi không có sự tương tác của bạn.</li>
                <li><strong className="text-zinc-200">POST_NOTIFICATIONS:</strong> Phát thông báo đẩy để nhắc nhở khi hết hiệp tập trung hoặc hết giờ nghỉ giải lao.</li>
                <li><strong className="text-zinc-200">SCHEDULE_EXACT_ALARM:</strong> Đặt lịch thông báo và chuông báo chính xác tuyệt đối khi kết thúc phiên pomodoro, đảm bảo chuông reo đúng từng giây ngay cả khi máy ở chế độ doze hoặc tiết kiệm pin.</li>
                <li><strong className="text-zinc-200">WAKE_LOCK:</strong> Giữ cho màn hình luôn sáng trong suốt chu kỳ pomodoro để bạn dễ dàng theo dõi thời gian.</li>
                <li><strong className="text-zinc-200">VIBRATE:</strong> Rung phản hồi xúc giác nhẹ khi bấm nút và khi kết thúc hiệp đếm ngược.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Shield size={14} className="text-zinc-300" />
                <span>4. Quyền của chủ thể dữ liệu (điều 4 &amp; điều 10 luật 91/2025/QH15)</span>
              </h2>
              <p>
                Chủ thể dữ liệu có đầy đủ các quyền: quyền được biết, quyền đồng ý, quyền truy cập/xem, quyền chỉnh sửa, quyền xóa dữ liệu, quyền rút lại sự đồng ý, quyền hạn chế xử lý dữ liệu và quyền khiếu nại bồi thường thiệt hại.
              </p>
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2 text-zinc-400">
                <p>
                  <strong className="text-zinc-200">Quy trình & thời hạn giải quyết (điều 5 nghị định 356/2025/nđ-cp):</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Tự phục vụ tức thì:</strong> Bạn có thể xuất bản sao JSON hoặc xóa sạch toàn bộ dữ liệu chỉ với 1 click tại trang <button type="button" onClick={() => router.navigate('/privacy-data')} className="text-white underline hover:text-zinc-300">Dữ liệu cá nhân</button>, hoặc chủ động rút lại sự đồng ý thu thập cookie bất kỳ lúc nào tại trang <button type="button" onClick={() => router.navigate('/settings')} className="text-white underline hover:text-zinc-300">Cài đặt</button>.</li>
                  <li><strong>Yêu cầu qua email:</strong> Khi nhận được yêu cầu của chủ thể dữ liệu gửi tới <code className="text-zinc-300">support@PomoFocus.vn</code>, chúng tôi cam kết phản hồi hướng dẫn trong vòng <strong>02 ngày làm việc</strong> và hoàn tất xử lý xóa bỏ thông tin trong tối đa <strong>20 ngày</strong> theo đúng quy định pháp luật.</li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {/* Tab 3: About */}
        {activeTab === 'about' && (
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 text-xs leading-relaxed text-zinc-300">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Info size={20} className="text-white shrink-0" />
                <span>Về dự án PomoFocus</span>
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono">Phiên bản 1.0.0 — không gian học tập tối giản</p>
            </div>

            <section className="space-y-3">
              <p>
                <strong>PomoFocus</strong> ra đời với mục tiêu mang lại một trải nghiệm học tập và làm việc sâu (deep work) thuần khiết nhất. Chúng tôi tin rằng sự tập trung thực sự không đến từ những giao diện màu mè gây sao nhãng, mà đến từ sự kết hợp hài hòa giữa nhịp đếm pomodoro khoa học, âm thanh thiên nhiên sống động và không gian làm việc cửa sổ nổi linh hoạt.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-zinc-300" />
                    <span>Khoa học & bền vững</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Kỹ thuật pomodoro giúp tối ưu nhịp sinh học và ngăn ngừa kiệt sức.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-zinc-300" />
                    <span>Linh hoạt đa cửa sổ</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Tự do di chuyển, thu phóng các cửa sổ như hệ điều hành ảo.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-zinc-300" />
                    <span>Riêng tư tuyệt đối</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Dữ liệu của bạn thuộc về bạn trên thiết bị cá nhân.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </MobileSubViewLayout>
  );
};
