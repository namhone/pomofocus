import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  FileText,
  Shield,
  CheckCircle2,
  Info
} from 'lucide-react';

interface LegalViewsProps {
  initialTab?: 'terms' | 'privacy' | 'about';
}

export const LegalViews: React.FC<LegalViewsProps> = ({ initialTab = 'terms' }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'about'>(initialTab);

  return (
    <div
      data-testid="legal-views"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-8">
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
              Điều Khoản Dịch Vụ
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
              Chính Sách Bảo Mật
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
            className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap hidden sm:flex"
          >
            <span>Vào Không Gian</span>
            <span>→</span>
          </button>
        </div>

        {/* Tab 1: Terms of Service */}
        {activeTab === 'terms' && (
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 text-xs leading-relaxed text-zinc-300">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <FileText size={20} className="text-white shrink-0" />
                <span>Điều Khoản Dịch Vụ (Terms of Service)</span>
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono">Cập nhật lần cuối: Tháng 10, 2026</p>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">1. Chấp Nhận Điều Khoản</h2>
              <p>
                Bằng việc truy cập hoặc sử dụng PomoFocus (dù là phiên bản Khách vãng lai hay Đăng ký tài khoản), bạn đồng ý chịu sự ràng buộc bởi các Điều khoản này. Nếu bạn không đồng ý, vui lòng ngừng sử dụng dịch vụ.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">2. Quyền Sở Hữu & Sử Dụng Hợp Pháp</h2>
              <p>
                PomoFocus được thiết kế nhằm mục đích hỗ trợ cá nhân học tập và làm việc tập trung. Người dùng chịu hoàn toàn trách nhiệm đối với các nội dung tự tải lên (như video MP4, âm thanh cá nhân, danh sách nhiệm vụ và ghi chú). Tuyệt đối nghiêm cấm việc tải lên các nội dung vi phạm pháp luật, bản quyền hoặc chứa mã độc.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">3. Chính Sách Demo Beta & Không Thu Tiền Thật</h2>
              <p>
                Trong giai đoạn Demo Beta, toàn bộ tính năng cao cấp (Gói PRO 3 Năm) được cung cấp miễn phí cho người dùng thử nghiệm. Mọi liên kết thanh toán chuyển khoản VietQR hay sandbox chỉ mang tính chất mô phỏng quy trình kiểm thử; PomoFocus cam kết không phát sinh bất kỳ khoản phí bắt buộc nào.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">4. Giới Hạn Trách Nhiệm</h2>
              <p>
                Chúng tôi nỗ lực tối đa để duy trì hệ thống hoạt động liên tục và ổn định 99.9%. Tuy nhiên, vì là phần mềm theo kiến trúc Local-First, người dùng nên chủ động sử dụng tính năng "Xuất Dữ Liệu" định kỳ để phòng ngừa sự cố phần cứng cá nhân.
              </p>
            </section>
          </div>
        )}

        {/* Tab 2: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 text-xs leading-relaxed text-zinc-300">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Shield size={20} className="text-emerald-400 shrink-0" />
                <span>Chính Sách Bảo Mật (Privacy Policy)</span>
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono">Bảo vệ quyền riêng tư theo tiêu chuẩn Local-First</p>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">1. Nguyên Tắc Local-First</h2>
              <p>
                Toàn bộ dữ liệu tác vụ (Tasks), ghi chú (Notes), nhật ký tập trung (Focus Sessions) và kế hoạch lịch biểu (Planner) của bạn được lưu trữ cục bộ trực tiếp trên trình duyệt thiết bị thông qua IndexedDB. Chúng tôi không bao giờ bán hoặc chia sẻ dữ liệu này cho bên thứ ba.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">2. Dữ Liệu Xác Thực Tài Khoản</h2>
              <p>
                Khi bạn đăng ký tài khoản qua Email hoặc Google OAuth 2.0, hệ thống chỉ lưu trữ các thông tin định danh tối thiểu (Email, Tên hiển thị, Ảnh đại diện đại diện và Mã định danh băm an toàn) nhằm phục vụ chức năng nhận diện phiên đăng nhập và gói bản quyền.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">3. Quyền Kiểm Soát Của Người Dùng</h2>
              <p>
                Bạn có toàn quyền truy xuất, tải xuống bản sao lưu JSON (Data Portability) hoặc xóa sạch vĩnh viễn toàn bộ dữ liệu trên thiết bị của mình bất kỳ lúc nào tại trang "Dữ Liệu Cá Nhân".
              </p>
            </section>
          </div>
        )}

        {/* Tab 3: About */}
        {activeTab === 'about' && (
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 text-xs leading-relaxed text-zinc-300">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Info size={20} className="text-white shrink-0" />
                <span>Về Dự Án PomoFocus</span>
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono">Phiên bản 1.0.0 — Không Gian Học Tập Tối Giản</p>
            </div>

            <section className="space-y-3">
              <p>
                <strong>PomoFocus</strong> ra đời với mục tiêu mang lại một trải nghiệm học tập và làm việc sâu (Deep Work) thuần khiết nhất. Chúng tôi tin rằng sự tập trung thực sự không đến từ những giao diện màu mè gây sao nhãng, mà đến từ sự kết hợp hài hòa giữa nhịp đếm Pomodoro khoa học, âm thanh thiên nhiên sống động và không gian làm việc cửa sổ nổi linh hoạt.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Khoa Học & Bền Vững</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Kỹ thuật Pomodoro giúp tối ưu nhịp sinh học và ngăn ngừa kiệt sức.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Linh Hoạt Đa Cửa Sổ</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Tự do di chuyển, thu phóng các cửa sổ như hệ điều hành ảo.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Riêng Tư Tuyệt Đối</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Dữ liệu của bạn thuộc về bạn trên thiết bị cá nhân.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <SharedFooter />
    </div>
  );
};
