import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Clock,
  Volume2,
  Users,
  Calendar,
  Shield,
  ArrowRight,
  Check,
  ChevronDown
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'PomoFocus hoạt động như thế nào?',
      a: 'PomoFocus kết hợp kỹ thuật Pomodoro khoa học (chu kỳ 25/5/15 hoặc tùy chỉnh), âm thanh nền Web Audio không nén, bảng quản lý công việc và phòng học nhóm trực tuyến trên một giao diện thống nhất, giảm thiểu tối đa xao nhãng khi học tập và làm việc.'
    },
    {
      q: 'Dữ liệu cá nhân của tôi được lưu trữ ở đâu?',
      a: 'Ứng dụng theo triết lý Local-First: toàn bộ danh sách công việc, ghi chú và lịch sử phiên học được lưu trực tiếp trên thiết bị của bạn bằng Dexie IndexedDB. Bạn có thể sử dụng hoàn toàn ẩn danh mà không cần đăng nhập. Khi đăng ký tài khoản, dữ liệu sẽ được sao lưu an toàn lên đám mây.'
    },
    {
      q: 'Chương trình Demo Beta (Tặng 3 Năm PRO) áp dụng như thế nào?',
      a: 'Trong giai đoạn Demo Beta hiện tại, hệ thống TUYỆT ĐỐI KHÔNG THU TIỀN THẬT. Mọi tài khoản mới khi đăng ký (qua Email hoặc Google) đều được hệ thống tự động kích hoạt 3 Năm gói PRO hoàn toàn miễn phí.'
    },
    {
      q: 'Âm thanh có bị ngắt khi tôi ẩn widget hoặc chuyển tab không?',
      a: 'Không. Vòng đời âm thanh được tách rời hoàn toàn khỏi giao diện hiển thị (GlobalAudioHost). Dù bạn thu nhỏ, đóng widget âm thanh hay chuyển sang tab khác, nhạc và âm thanh thiên nhiên vẫn phát liên tục cho đến khi bạn chủ động tạm dừng.'
    },
    {
      q: 'Gói PRO khác gì so với gói Miễn phí?',
      a: 'Gói Miễn phí cung cấp đầy đủ công cụ Pomodoro, âm thanh chuẩn, ghi chú và lưu trữ cục bộ vĩnh viễn. Gói PRO mở khóa thêm toàn bộ 101 không gian HD tuyển chọn thực tế, quyền tạo và điều phối Phòng học nhóm trực tuyến (WebRTC), lập kế hoạch Time-Blocking chuyên sâu và đồng bộ đám mây tự động.'
    }
  ];

  return (
    <div
      data-testid="landing-page-root"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-white selection:text-black select-none flex flex-col"
    >
      <PlatformHeader />

      {/* 2. Hero Section — Bold, Typography-first */}
      <section className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-[11px] sm:text-xs font-mono mb-6 sm:mb-8 text-center max-w-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">Bản Thử Nghiệm Demo Beta 1.0</span>
          <span className="hidden xs:inline text-zinc-600">—</span>
          <span className="whitespace-nowrap text-emerald-400">Miễn Phí 3 Năm PRO</span>
        </div>

        <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.28] sm:leading-[1.18] mb-5 sm:mb-6">
          <span className="block sm:inline">
            <span className="whitespace-nowrap">Không Gian Học Tập</span>{' '}
            <span className="whitespace-nowrap">Đắm Chìm.</span>
          </span>{' '}
          <span className="block sm:inline">
            <span className="whitespace-nowrap">Tối Giản, Khoa Học</span>{' '}
            <span className="whitespace-nowrap">&amp; Tập Trung.</span>
          </span>
        </h1>

        <p className="text-xs sm:text-base text-zinc-400 max-w-2xl leading-relaxed mb-8 sm:mb-10 font-normal text-pretty">
          Kết hợp kỹ thuật Pomodoro chính xác chuẩn millisecond, âm thanh môi trường thiên nhiên, quản lý nhiệm vụ và phòng học nhóm trực tuyến. Giúp bạn đạt trạng thái dòng chảy năng suất cao nhất.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98]"
          >
            <span className="whitespace-nowrap">Bắt Đầu Học Ngay (Miễn Phí)</span>
            <ArrowRight size={14} className="shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => router.navigate('/rooms')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Users size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Vào Phòng Học Nhóm Live</span>
          </button>
        </div>

        {/* 3. Product Mockup Preview */}
        <div className="mt-10 sm:mt-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-2 sm:p-3 shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
          <div className="rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/40 relative aspect-video flex flex-col items-center justify-center">
            {/* Visual Workspace Wireframe Simulation */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/80 via-black to-zinc-950 flex flex-col p-3 sm:p-6 justify-between select-none">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 font-mono gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shrink-0" />
                  <span className="ml-1 sm:ml-2 text-zinc-400 whitespace-nowrap">PomoFocus Workspace v1.0</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] sm:text-xs">
                  <span>101 Cảnh Quan HD</span>
                  <span>•</span>
                  <span>Web Audio Engine</span>
                </div>
              </div>

              {/* Floating Demo Widgets Center */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-auto">
                {/* Clock Card */}
                <div className="rounded-2xl border border-white/20 bg-black/60 backdrop-blur-2xl p-5 shadow-2xl text-center w-64">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1">
                    HIỆP TẬP TRUNG #1
                  </div>
                  <div className="text-4xl font-mono font-bold text-white tracking-tight mb-2">
                    25:00
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Giải tích & IELTS Task 2</span>
                  </div>
                </div>

                {/* Sounds & Ambient Card */}
                <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-xl w-56 text-left hidden md:block">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-2">
                    <span>Âm thanh nền</span>
                    <span className="text-[10px] text-emerald-400">Đang phát</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-zinc-300">
                    <div className="flex justify-between">
                      <span>Mưa Rào Rừng Thông</span>
                      <span className="text-zinc-500 font-mono">60%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bàn Phím Cơ Thao Tác</span>
                      <span className="text-zinc-500 font-mono">40%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs text-zinc-400">
                <button
                  type="button"
                  onClick={() => router.navigate('/app')}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
                >
                  Khám phá toàn bộ không gian làm việc
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-800/80">
        <div className="mb-10 sm:mb-12 text-center">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
            KIẾN TRÚC HIỆN ĐẠI
          </span>
          <h2 className="text-xl sm:text-3xl font-semibold text-white tracking-tight text-balance">
            Thiết Kế Cho Năng Suất Cá Nhân{' '}
            <span className="inline-block whitespace-nowrap">&amp; Đồng Đội</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Card 1: Atomic Timer */}
          <div className="p-6 sm:p-8 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-white mb-6">
                <Clock size={18} strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2 text-balance">
                Đồng Hồ Pomodoro Nguyên Tử
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-normal text-pretty">
                Vòng đời bộ đếm chạy chính xác từng millisecond qua Web Worker và Service Worker. Chống trôi thời gian khi tab bị ẩn hoặc trình duyệt ngủ. Hỗ trợ tùy biến thời lượng làm việc, nghỉ ngắn, nghỉ dài.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800/60 font-mono text-[11px] text-zinc-500 flex justify-between">
              <span className="whitespace-nowrap">ĐỘ TRỄ &lt; 2MS</span>
              <span className="whitespace-nowrap">ĐỒNG BỘ MULTI-TAB</span>
            </div>
          </div>

          {/* Card 2: Audio & PiP */}
          <div className="p-6 sm:p-8 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-white mb-6">
                <Volume2 size={18} strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2 text-balance">
                Web Audio &amp; Phát Nền Độc Lập
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-normal text-pretty">
                Bộ tổng hợp âm thanh thiên nhiên (mưa, sóng biển, quán cà phê, bàn phím cơ) tiếp tục phát nền mượt mà ngay cả khi đóng widget. Hỗ trợ thu nhỏ thành thanh video Mini PiP thông minh.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800/60 font-mono text-[11px] text-zinc-500 flex justify-between">
              <span className="whitespace-nowrap">ZERO INTERRUPT</span>
              <span className="whitespace-nowrap">MINI PIP VIDEO</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 3: Study Rooms */}
          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-white mb-4">
              <Users size={16} strokeWidth={1.75} />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1.5 text-balance">
              Phòng Học Nhóm WebRTC Live
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal text-pretty">
              Kết nối học cùng bạn bè với camera/mic trực tiếp, chia sẻ màn hình, bảng vẽ tương tác Canvas và đồng hồ Pomodoro nhóm đồng bộ.
            </p>
          </div>

          {/* Card 4: Calendar */}
          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-white mb-4">
              <Calendar size={16} strokeWidth={1.75} />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1.5 text-balance">
              Lịch Học Time-Blocking
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal text-pretty">
              Lập thời gian biểu theo ngày, tuần, tháng từ 07:00 đến 22:00. Liên kết trực tiếp từng phiên học với nhiệm vụ Pomodoro tương ứng.
            </p>
          </div>

          {/* Card 5: Local-First & 101 Spaces */}
          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-white mb-4">
              <Shield size={16} strokeWidth={1.75} />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1.5 text-balance">
              101 Cảnh Quan Tuyển Chọn
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal text-pretty">
              Thư viện 101 hình ảnh HD được tuyển chọn thủ công, cam kết 100% không trùng lặp cảnh, kết hợp lưu trữ an toàn Dexie IndexedDB.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Hướng Dẫn 3 Bước Bắt Đầu Cho Người Mới */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-zinc-800/80">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
            ĐƠN GIẢN & TẬP TRUNG
          </span>
          <h2 className="text-xl sm:text-3xl font-semibold text-white tracking-tight">
            <span className="inline-block whitespace-nowrap">3 Bước Bắt Đầu</span>{' '}
            <span className="inline-block whitespace-nowrap">Học Tập Năng Suất</span>{' '}
            <span className="inline-block whitespace-nowrap">Cùng PomoFocus</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white/10 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="text-sm font-semibold text-white mb-2 text-balance">
              Chọn Không Gian &amp; Đặt Mục Tiêu
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal text-pretty">
              Mở không gian làm việc, chọn hình nền yêu thích từ 101&nbsp;cảnh quan và thêm việc cần làm vào bảng&nbsp;nhiệm&nbsp;vụ.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white/10 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="text-sm font-semibold text-white mb-2 text-balance">
              Bật Âm Thanh Môi Trường
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal text-pretty">
              Pha trộn tiếng mưa, sóng biển, quán cà phê hoặc dán đường dẫn YouTube lofi để tạo không gian tĩnh&nbsp;lặng.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white/10 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="text-sm font-semibold text-white mb-2 text-balance">
              Khởi Động Chu Kỳ Pomodoro
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal text-pretty">
              Bắt đầu 25&nbsp;phút tập trung sâu. Nghỉ ngắn 5&nbsp;phút sau mỗi hiệp để hồi phục năng lượng cho trí&nbsp;não.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 text-center">
          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-wide transition-all duration-200 cursor-pointer inline-flex items-center gap-2 shadow-xl active:scale-[0.98]"
          >
            <span className="whitespace-nowrap">Mở Không Gian Học Tập Ngay</span>
            <ArrowRight size={14} className="shrink-0" />
          </button>
        </div>
      </section>

      {/* 6. Bảng Giá & Đặc Quyền Demo Beta */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-zinc-800/80">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
            MINH BẠCH & ĐƠN GIẢN
          </span>
          <h2 className="text-xl sm:text-3xl font-semibold text-white tracking-tight">
            <span className="inline-block whitespace-nowrap">Gói Dịch Vụ Phù Hợp</span>{' '}
            <span className="inline-block whitespace-nowrap">Với Nhu Cầu Học Tập</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div className="p-6 sm:p-8 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Gói Miễn Phí
              </div>
              <div className="text-3xl font-bold text-white mb-4">
                <span className="whitespace-nowrap">0 VNĐ</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 font-normal text-pretty">
                Đầy đủ tính năng Pomodoro cốt lõi, không&nbsp;quảng&nbsp;cáo, không giới hạn thời&nbsp;gian&nbsp;sử&nbsp;dụng.
              </p>

              <ul className="space-y-2.5 text-xs text-zinc-300 mb-8 text-pretty">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Đồng hồ Pomodoro khoa học chuẩn millisecond
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Bảng âm thanh thiên nhiên Web Audio
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Quản lý công việc &amp; ghi chú cục bộ IndexedDB
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Cửa sổ tự do, Mini Pill &amp; Chế độ Focus Mode
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => router.navigate('/app')}
              className="w-full py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition cursor-pointer"
            >
              Vào Học Ngay
            </button>
          </div>

          {/* Pro Tier */}
          <div className="p-6 sm:p-8 rounded-xl border border-white bg-zinc-950 flex flex-col justify-between shadow-lg relative">
            <span className="absolute top-4 right-4 text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-300">
              PRO
            </span>
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Gói Chuyên Nghiệp
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                <span className="whitespace-nowrap">39.000 VNĐ</span>
                <span className="text-xs font-normal text-zinc-500"> / tháng</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mb-4 text-pretty">
                Thanh toán 468.000&nbsp;VNĐ&nbsp;/&nbsp;năm (tiết kiệm 240.000&nbsp;VNĐ ~33,9%) hoặc 59.000&nbsp;VNĐ&nbsp;/&nbsp;tháng
              </div>
              <p className="text-xs text-zinc-400 mb-6 font-normal text-pretty">
                Dành cho người học chuyên sâu, ôn thi đại học, chứng chỉ hoặc học nhóm trực&nbsp;tuyến.
              </p>

              <ul className="space-y-2.5 text-xs text-white mb-8 text-pretty">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Toàn bộ tính năng của gói Miễn phí
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Mở khóa toàn bộ 101 không gian HD tuyển chọn
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Tạo &amp; chủ trì Phòng học nhóm (WebRTC Video Sync)
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Lập kế hoạch Time-Blocking chuyên sâu
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" /> Đồng bộ dữ liệu đám mây đa thiết bị
                </li>
              </ul>
            </div>

            <button
              type="button"
              data-testid="landing-cta-upgrade-pricing"
              onClick={() => router.navigate('/billing')}
              className="w-full py-2.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer"
            >
              Xem Chi Tiết Gói PRO
            </button>
          </div>
        </div>

        {/* Demo Beta 3-Year Banner */}
        <div className="mt-8 p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-center flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-left w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <span className="text-balance">
                Đặc Quyền Dành Cho{' '}
                <span className="inline-block whitespace-nowrap">Người Dùng Mới</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-mono whitespace-nowrap shrink-0">
                DEMO BETA
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed text-pretty">
              Mọi tài khoản tạo mới trong giai đoạn Demo Beta đều được <strong>tự động kích hoạt 3&nbsp;Năm gói PRO Miễn&nbsp;Phí</strong> (trị giá 1.404.000&nbsp;VNĐ). Hệ thống không thu tiền&nbsp;thật.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.navigate('/signup')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs tracking-wide transition shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20 whitespace-nowrap active:scale-[0.98]"
          >
            Đăng Ký Nhận 3 Năm PRO
          </button>
        </div>
      </section>

      {/* 7. FAQ Accordion */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-3xl mx-auto border-t border-zinc-800/80">
        <div className="mb-8 sm:mb-10 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight text-balance">
            Câu hỏi thường gặp
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/80 border-y border-zinc-800/80">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition cursor-pointer gap-3"
                >
                  <span className="text-balance">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-zinc-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-xs text-zinc-400 leading-relaxed font-normal pr-2 sm:pr-6 text-pretty">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. CTA Cuối Trang */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center border-t border-zinc-800/80">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 text-balance">
          Sẵn Sàng Nâng Cao Năng Suất Của Bạn?
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto mb-8 text-pretty">
          Tham gia cùng hàng ngàn học viên rèn luyện thói quen học tập sâu mỗi ngày cùng PomoFocus.
        </p>
        <button
          type="button"
          onClick={() => router.navigate('/app')}
          className="px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-wide transition-all duration-200 cursor-pointer inline-flex items-center gap-2 shadow-2xl active:scale-[0.98]"
        >
          <span className="whitespace-nowrap">Mở Không Gian Học Tập</span>
          <ArrowRight size={14} className="shrink-0" />
        </button>
      </section>

      {/* 9. Shared Unified Footer */}
      <SharedFooter />
    </div>
  );
};
