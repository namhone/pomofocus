import React, { useState } from 'react';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  HelpCircle,
  Keyboard,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';

const SHORTCUTS = [
  { key: 'Space', desc: 'Bắt đầu / Tạm dừng Pomodoro' },
  { key: 'R', desc: 'Đặt lại đồng hồ về ban đầu' },
  { key: 'S', desc: 'Bỏ qua và chuyển sang hiệp tiếp theo' },
  { key: 'Z', desc: 'Bật / Tắt chế độ Zen Mode toàn màn hình' },
  { key: 'Ctrl + K / Cmd + K', desc: 'Mở Bảng lệnh điều khiển nhanh' },
  { key: 'Esc', desc: 'Đóng cửa sổ hoặc thoát Zen Mode' }
];

const FAQS = [
  {
    q: 'Dữ liệu công việc và thời gian Pomodoro của tôi được lưu ở đâu?',
    a: 'PomoFocus sử dụng kiến trúc Local-First: Mọi nhiệm vụ, ghi chú và lịch sử tập trung được lưu trữ trực tiếp trong cơ sở dữ liệu IndexedDB trên trình duyệt của bạn. Bạn không bao giờ bị mất dữ liệu khi làm mới trang hoặc mất kết nối mạng.'
  },
  {
    q: 'Gói PRO Beta được miễn phí trong bao lâu?',
    a: 'Trong giai đoạn thử nghiệm cộng đồng, mọi tài khoản đăng ký mới đều được tự động cấp quyền PRO Beta miễn phí 3 năm với đầy đủ 100% tính năng cao cấp (101+ cảnh nền HD, phòng học nhóm WebRTC, âm thanh thiên nhiên, đồng bộ đám mây).'
  },
  {
    q: 'Tôi có thể tải lên video hoặc hình nền cá nhân không?',
    a: 'Có. Khi kích hoạt gói PRO (hoặc PRO Beta), bạn có thể mở widget "Không Gian", chọn thẻ "Cá Nhân" và tải lên video MP4/WebM hoặc ảnh nền yêu thích của riêng bạn.'
  },
  {
    q: 'Làm sao để học nhóm cùng bạn bè?',
    a: 'Bạn nhấn vào mục "Phòng Học" trên thanh tiêu đề, sau đó sao chép đường link phòng (ví dụ: /rooms/a1b2-c3d4-e5f6) gửi cho bạn bè để cùng vào phòng và đồng bộ nhịp tập trung.'
  },
  {
    q: 'Làm thế nào để xuất dữ liệu sao lưu?',
    a: 'Vào trang "Hồ Sơ" -> chọn "Dữ Liệu" (hoặc truy cập /privacy-data) và nhấn "Xuất File JSON". Tệp tin JSON chuẩn sẽ được tải trực tiếp về máy tính của bạn.'
  }
];

export const HelpView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div
      data-testid="help-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-8">
        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <BookOpen size={24} className="text-white shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Trung Tâm Trợ Giúp PomoFocus
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Nắm vững phương pháp Pomodoro, phím tắt thao tác nhanh và cách khai thác tối đa không gian học tập.
          </p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Keyboard size={16} className="text-emerald-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Bảng Phím Tắt Tiện Lợi (Global Shortcuts)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3"
              >
                <span className="text-zinc-300 leading-snug flex-1 min-w-0">{item.desc}</span>
                <kbd className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white font-mono text-[11px] shrink-0 whitespace-nowrap shadow-sm">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Pomodoro Guide */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Clock size={16} className="text-rose-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Quy Trình Pomodoro Chuẩn Khoa Học</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <div className="font-semibold text-white">Chọn Mục Tiêu</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tạo một nhiệm vụ cụ thể từ danh sách Tasks và liên kết với đồng hồ.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              <div className="font-semibold text-white">Tập Trung 25 Phút</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Bật âm thanh thiên nhiên hoặc chế độ Zen Mode để loại bỏ hoàn toàn phiền nhiễu.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                3
              </span>
              <div className="font-semibold text-white">Nghỉ Ngắn 5 Phút</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Rời mắt khỏi màn hình, uống nước hoặc vận động nhẹ để não phục hồi năng lượng.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                4
              </span>
              <div className="font-semibold text-white">Nghỉ Dài 15-30 Phút</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Sau mỗi 4 hiệp Pomodoro liên tiếp, dành 15-30 phút nghỉ ngơi sâu thư giãn.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <HelpCircle size={16} className="text-sky-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Câu Hỏi Thường Gặp (FAQ)</h2>
          </div>

          <div className="space-y-2.5">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden text-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-3.5 text-left font-medium text-white flex items-center justify-between gap-3 hover:bg-white/5 transition cursor-pointer"
                >
                  <span className="leading-snug">{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp size={15} className="text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-zinc-400 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-3.5 pb-3.5 text-zinc-400 text-[11px] leading-relaxed border-t border-zinc-800/80 pt-2.5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
