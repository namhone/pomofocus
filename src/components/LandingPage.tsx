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
      a: 'Ứng dụng theo triết lý Lưu trữ an toàn: toàn bộ danh sách công việc, ghi chú và lịch sử phiên học được lưu an toàn trực tiếp trên thiết bị của bạn. Bạn có thể sử dụng hoàn toàn ẩn danh mà không cần đăng nhập. Khi đăng ký tài khoản, dữ liệu sẽ được sao lưu an toàn lên đám mây.'
    },
    {
      q: 'Chương trình Demo Beta (Tặng 3 Năm PRO) áp dụng như thế nào?',
      a: 'Trong giai đoạn Demo Beta hiện tại, hệ thống tuyệt đối không thu tiền thật. Mọi tài khoản mới khi đăng ký (qua Email hoặc Google) đều được hệ thống tự động kích hoạt 3 năm gói PRO hoàn toàn miễn phí.'
    },
    {
      q: 'Âm thanh có bị ngắt khi tôi ẩn widget hoặc chuyển tab không?',
      a: 'Không. Vòng đời âm thanh được tách rời hoàn toàn khỏi giao diện hiển thị (GlobalAudioHost). Dù bạn thu nhỏ, đóng widget âm thanh hay chuyển sang tab khác, nhạc và âm thanh thiên nhiên vẫn phát liên tục cho đến khi bạn chủ động tạm dừng.'
    },
    {
      q: 'Gói PRO khác gì so với gói Miễn phí?',
      a: 'Gói Miễn phí cung cấp đầy đủ công cụ Pomodoro, âm thanh chuẩn, ghi chú và lưu trữ cục bộ vĩnh viễn. Gói PRO mở khóa thêm bộ sưu tập hình nền tinh tuyển thực tế, quyền tạo và điều phối Phòng học nhóm trực tuyến (WebRTC), lập kế hoạch Time-Blocking chuyên sâu và đồng bộ đám mây tự động.'
    }
  ];

  return (
    <div
      data-testid="landing-page-root"
      className="min-h-screen w-full bg-[#0F1115] text-[#ECEFF4] font-sans antialiased selection:bg-[#60A5FA] selection:text-[#0B1120] select-none flex flex-col"
    >
      <PlatformHeader />

      <main id="main-content" className="flex-1 w-full">
        {/* 2. Hero Section — Bold, Typography-first */}
      <section className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        

        <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#ECEFF4] max-w-3xl leading-[1.28] sm:leading-[1.18] mb-5 sm:mb-6">
          <span className="block sm:inline">
            <span className="whitespace-nowrap">Không gian học tập</span>

          </span>{' '}
          <span className="block sm:inline">
            <span className="whitespace-nowrap">Tối giản, khoa học</span>{' '}
            <span className="whitespace-nowrap">&amp; tập trung.</span>
          </span>
        </h1>

        <p className="text-xs sm:text-base text-[#A1A9B8] max-w-2xl leading-relaxed mb-8 sm:mb-10 font-normal text-pretty">
          Không gian Pomodoro kết hợp âm thanh thiên nhiên, quản lý nhiệm vụ và phòng học nhóm. Đưa bạn vào trạng thái tập trung sâu.
        </p>

        <div className="flex flex-col items-center gap-3.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(96,165,250,0.22)] active:scale-[0.98]"
          >
            <span className="whitespace-nowrap">Bắt đầu học ngay</span>
            <ArrowRight size={15} className="shrink-0" />
          </button>
          
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#A1A9B8] pt-1">
            <button
              type="button"
              data-testid="landing-cta-upgrade-hero"
              onClick={() => router.navigate('/billing')}
              className="min-h-[44px] px-2.5 inline-flex items-center text-[#A1A9B8] hover:text-[#ECEFF4] transition underline-offset-4 hover:underline cursor-pointer"
            >
              Xem gói cước
            </button>
            <span className="text-[#7A8291] select-none">•</span>
            <button
              type="button"
              onClick={() => router.navigate('/download')}
              className="min-h-[44px] px-2.5 inline-flex items-center text-[#A1A9B8] hover:text-[#ECEFF4] transition underline-offset-4 hover:underline cursor-pointer"
            >
              Tải app Android
            </button>
            <span className="text-[#7A8291] select-none">•</span>
            <button
              type="button"
              onClick={() => router.navigate('/rooms')}
              className="min-h-[44px] px-2.5 inline-flex items-center gap-1.5 text-[#A1A9B8] hover:text-[#ECEFF4] transition underline-offset-4 hover:underline cursor-pointer"
            >
              <Users size={13} className="shrink-0 text-[#A1A9B8]" />
              <span>Phòng học nhóm</span>
            </button>
          </div>
        </div>

        {/* 3. Product Mockup Preview */}
        <div className="mt-10 sm:mt-14 w-full rounded-2xl border border-[#2A303C] bg-[#171A21] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
          <div className="rounded-xl overflow-hidden border border-[#2A303C] bg-[#1F242D] relative aspect-video flex flex-col items-center justify-center">
            {/* Visual Workspace Wireframe Simulation */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1F242D] via-[#171A21] to-[#0F1115] flex flex-col p-3 sm:p-6 justify-between select-none">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#A1A9B8] font-mono gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5F697A] shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2A303C] shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2A303C] shrink-0" />
                  <span className="ml-1 sm:ml-2 text-[#A1A9B8] whitespace-nowrap">PomoFocus Workspace</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] sm:text-xs">
                  <span>Không gian tinh tuyển</span>
                  <span>•</span>
                  <span>Âm thanh thiên nhiên</span>
                </div>
              </div>

              {/* Floating Demo Widgets Center */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-auto">
                {/* Clock Card with SVG Progress Arc */}
                <div className="rounded-2xl border border-[#2A303C] bg-[#171A21]/95 backdrop-blur-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.45)] text-center w-64 flex flex-col items-center">
                  <div className="text-[10px] font-semibold text-[#A1A9B8] mb-2">
                    Hiệp tập trung #1
                  </div>
                  <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#2A303C" strokeWidth="6" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#60A5FA"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="326.7"
                        strokeDashoffset="82"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-[#ECEFF4] tracking-tight tabular-nums">
                      25:00
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-[#A1A9B8]">
                    <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0" />
                    <span>Giải tích &amp; IELTS Task 2</span>
                  </div>
                </div>

                {/* Sounds & Ambient Card */}
                <div className="rounded-2xl border border-[#2A303C] bg-[#171A21]/90 backdrop-blur-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] w-56 text-left hidden md:block">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#ECEFF4] mb-2">
                    <span>Âm thanh nền</span>
                    <span className="text-[10px] text-[#34D399] font-medium">Đang phát</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-[#A1A9B8]">
                    <div className="flex justify-between">
                      <span>Mưa rào rừng thông</span>
                      <span className="text-[#ECEFF4] tabular-nums">60%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bàn phím cơ thao tác</span>
                      <span className="text-[#ECEFF4] tabular-nums">40%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs text-[#A1A9B8]">
                <button
                  type="button"
                  onClick={() => router.navigate('/app')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#29303D] hover:bg-[#29303D]/80 border border-[#5F697A]/60 text-[#ECEFF4] font-medium transition cursor-pointer"
                >
                  Khám phá toàn bộ không gian làm việc
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#2A303C]">
        <div className="mb-10 sm:mb-12 text-center">
          <span className="text-xs font-mono text-[#A1A9B8] block mb-2">
            Kiến trúc hiện đại
          </span>
          <h2 className="text-xl sm:text-3xl font-semibold text-[#ECEFF4] tracking-tight text-balance">
            Thiết kế cho năng suất cá nhân{' '}
            <span className="inline-block whitespace-nowrap">&amp; đồng đội</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Card 1: Atomic Timer */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg border border-[#60A5FA]/30 bg-[#1D2B44] flex items-center justify-center text-[#93C5FD] mb-6">
                <Clock size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-[#ECEFF4] mb-2 text-balance">
                Đồng hồ Pomodoro
              </h3>
              <p className="text-xs text-[#A1A9B8] leading-relaxed mb-6 font-normal text-pretty">
                Bộ đếm thời gian khoa học, hoạt động mượt mà và bền bỉ kể cả khi ẩn tab. Hỗ trợ tùy biến thời lượng làm việc, nghỉ ngắn, nghỉ dài theo nhu cầu.
              </p>
            </div>
            <div className="pt-4 border-t border-[#2A303C] font-mono text-[11px] text-[#A1A9B8] flex justify-between">
              <span className="whitespace-nowrap">Tập trung sâu</span>
              <span className="whitespace-nowrap">Đồng bộ multi-tab</span>
            </div>
          </div>

          {/* Card 2: Audio & PiP */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg border border-[#60A5FA]/30 bg-[#1D2B44] flex items-center justify-center text-[#93C5FD] mb-6">
                <Volume2 size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-[#ECEFF4] mb-2 text-balance">
                Âm thanh thiên nhiên
              </h3>
              <p className="text-xs text-[#A1A9B8] leading-relaxed mb-4 font-normal text-pretty">
                Bộ tổng hợp âm thanh thiên nhiên (mưa, sóng biển, quán cà phê, bàn phím cơ) tiếp tục phát nền mượt mà ngay cả khi chuyển tab hoặc thu nhỏ cửa sổ.
              </p>
              {/* Dải 3 thumbnail 16:9 (64px height, rounded-lg) */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="h-16 aspect-video w-full rounded-lg border border-[#2A303C] bg-gradient-to-br from-[#1D2B44] via-[#171A21] to-[#0F1115] p-2 flex flex-col justify-end">
                  <span className="text-[10px] font-medium text-[#ECEFF4] truncate">Mưa rừng thông</span>
                </div>
                <div className="h-16 aspect-video w-full rounded-lg border border-[#2A303C] bg-gradient-to-br from-[#1F242D] via-[#1D2B44] to-[#0F1115] p-2 flex flex-col justify-end">
                  <span className="text-[10px] font-medium text-[#ECEFF4] truncate">Sóng biển đêm</span>
                </div>
                <div className="h-16 aspect-video w-full rounded-lg border border-[#2A303C] bg-gradient-to-br from-[#29303D] via-[#1F242D] to-[#171A21] p-2 flex flex-col justify-end">
                  <span className="text-[10px] font-medium text-[#ECEFF4] truncate">Quán cà phê</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-[#2A303C] font-mono text-[11px] text-[#A1A9B8] flex justify-between">
              <span className="whitespace-nowrap">Phát nền liên tục</span>
              <span className="whitespace-nowrap">Mini PiP Video</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 3: Study Rooms */}
          <div className="p-5 sm:p-6 rounded-xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="w-10 h-10 rounded-lg border border-[#60A5FA]/30 bg-[#1D2B44] flex items-center justify-center text-[#93C5FD] mb-4">
              <Users size={20} strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-semibold text-[#ECEFF4] mb-1.5 text-balance">
              Phòng học nhóm
            </h4>
            <p className="text-xs text-[#A1A9B8] leading-relaxed font-normal text-pretty">
              Kết nối học cùng bạn bè với camera/mic trực tiếp, chia sẻ màn hình, bảng vẽ tương tác canvas và đồng hồ Pomodoro nhóm đồng bộ.
            </p>
          </div>

          {/* Card 4: Calendar */}
          <div className="p-5 sm:p-6 rounded-xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="w-10 h-10 rounded-lg border border-[#60A5FA]/30 bg-[#1D2B44] flex items-center justify-center text-[#93C5FD] mb-4">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-semibold text-[#ECEFF4] mb-1.5 text-balance">
              Lịch học Time-Blocking
            </h4>
            <p className="text-xs text-[#A1A9B8] leading-relaxed font-normal text-pretty">
              Lập thời gian biểu theo ngày, tuần, tháng từ 07:00 đến 22:00. Liên kết trực tiếp từng phiên học với nhiệm vụ Pomodoro tương ứng.
            </p>
          </div>

          {/* Card 5: Local-First & Curated Spaces */}
          <div className="p-5 sm:p-6 rounded-xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="w-10 h-10 rounded-lg border border-[#60A5FA]/30 bg-[#1D2B44] flex items-center justify-center text-[#93C5FD] mb-4">
              <Shield size={20} strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-semibold text-[#ECEFF4] mb-1.5 text-balance">
              Không gian tinh tuyển
            </h4>
            <p className="text-xs text-[#A1A9B8] leading-relaxed font-normal text-pretty">
              Bộ sưu tập hình nền tinh tuyển thủ công, cam kết không trùng lặp cảnh, lưu trữ an toàn ngay trên thiết bị.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Hướng Dẫn 3 Bước Bắt Đầu Cho Người Mới */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-[#2A303C]">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs font-mono text-[#A1A9B8] block mb-2">
            Đơn giản &amp; tập trung
          </span>
          <h2 className="text-xl sm:text-3xl font-semibold text-[#ECEFF4] tracking-tight text-balance">
            3 bước bắt đầu học tập năng suất cùng PomoFocus
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#1D2B44] border border-[#60A5FA] text-[#93C5FD] tabular-nums font-bold text-sm flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="text-sm font-semibold text-[#ECEFF4] mb-2 text-balance">
              Chọn không gian &amp; đặt mục tiêu
            </h3>
            <p className="text-xs text-[#A1A9B8] leading-relaxed font-normal text-pretty">
              Mở không gian làm việc, chọn hình nền yêu thích từ bộ sưu tập tinh tuyển và thêm việc cần làm vào bảng&nbsp;nhiệm&nbsp;vụ.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#1D2B44] border border-[#60A5FA] text-[#93C5FD] tabular-nums font-bold text-sm flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="text-sm font-semibold text-[#ECEFF4] mb-2 text-balance">
              Bật âm thanh môi trường
            </h3>
            <p className="text-xs text-[#A1A9B8] leading-relaxed font-normal text-pretty">
              Pha trộn tiếng mưa, sóng biển, quán cà phê hoặc dán đường dẫn YouTube lofi để tạo không gian tĩnh&nbsp;lặng.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-xl border border-[#2A303C] bg-[#171A21] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#1D2B44] border border-[#60A5FA] text-[#93C5FD] tabular-nums font-bold text-sm flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="text-sm font-semibold text-[#ECEFF4] mb-2 text-balance">
              Khởi động chu kỳ Pomodoro
            </h3>
            <p className="text-xs text-[#A1A9B8] leading-relaxed font-normal text-pretty">
              Bắt đầu 25&nbsp;phút tập trung sâu. Nghỉ ngắn 5&nbsp;phút sau mỗi hiệp để hồi phục năng lượng cho trí&nbsp;não.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 text-center">
          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] font-bold text-xs tracking-wide transition-all duration-200 cursor-pointer inline-flex items-center gap-2 shadow-[0_8px_28px_rgba(96,165,250,0.22)] active:scale-[0.98]"
          >
            <span className="whitespace-nowrap">Mở không gian học tập ngay</span>
            <ArrowRight size={14} className="shrink-0" />
          </button>
        </div>
      </section>

      {/* 6. Bảng Giá & Đặc Quyền Demo Beta */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-[#2A303C]">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs font-mono text-[#A1A9B8] block mb-2">
            Minh bạch &amp; đơn giản
          </span>
          <h2 className="text-xl sm:text-3xl font-semibold text-[#ECEFF4] tracking-tight text-balance">
            Gói dịch vụ phù hợp với nhu cầu học tập
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div className="p-6 sm:p-8 rounded-xl border border-[#2A303C] bg-[#171A21] flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-[#A1A9B8] mb-2">
                Gói miễn phí
              </div>
              <div className="text-3xl font-bold text-[#ECEFF4] mb-4 tabular-nums flex items-baseline gap-1">
                <span className="whitespace-nowrap">0 vnđ</span>
              </div>
              <p className="text-xs text-[#A1A9B8] mb-6 font-normal text-pretty">
                Đầy đủ tính năng Pomodoro cốt lõi, không&nbsp;quảng&nbsp;cáo, không giới hạn thời&nbsp;gian&nbsp;sử&nbsp;dụng.
              </p>

              <ul className="space-y-2.5 text-xs text-[#ECEFF4] mb-8 text-pretty">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Đồng hồ Pomodoro khoa học, dễ sử dụng
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Bảng âm thanh thiên nhiên chất lượng cao
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Quản lý công việc &amp; ghi chú bảo mật
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Cửa sổ tự do, mini pill &amp; chế độ focus mode
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => router.navigate('/app')}
              className="w-full min-h-[48px] py-3 rounded-xl border-[1.5px] border-[#5F697A] bg-transparent hover:bg-[#29303D] text-[#ECEFF4] text-xs font-semibold transition cursor-pointer"
            >
              Vào học ngay
            </button>
          </div>

          {/* Pro Tier */}
          <div className="p-6 sm:p-8 rounded-xl border-[1.5px] border-[#60A5FA] bg-[#171A21] flex flex-col justify-between shadow-lg relative">
            <span className="absolute top-4 right-4 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#1D2B44] border border-[#60A5FA] text-[#93C5FD]">
              PRO
            </span>
            <div>
              <div className="text-xs font-semibold text-[#A1A9B8] mb-2">
                Gói chuyên nghiệp
              </div>
              <div className="text-3xl font-bold text-[#ECEFF4] mb-1 tabular-nums flex items-baseline gap-1.5">
                <span className="whitespace-nowrap">39.000 vnđ</span>
                <span className="text-xs font-normal text-[#A1A9B8]">/ tháng</span>
              </div>
              <div className="text-[11px] font-mono text-[#A1A9B8] mb-4 text-pretty tabular-nums">
                Thanh toán 468.000&nbsp;vnđ&nbsp;/&nbsp;năm (tiết kiệm 240.000&nbsp;vnđ ~33,9%) hoặc 59.000&nbsp;vnđ&nbsp;/&nbsp;tháng
              </div>
              <p className="text-xs text-[#A1A9B8] mb-6 font-normal text-pretty">
                Dành cho người học chuyên sâu, ôn thi đại học, chứng chỉ hoặc học nhóm trực&nbsp;tuyến.
              </p>

              <ul className="space-y-2.5 text-xs text-[#ECEFF4] mb-8 text-pretty">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Toàn bộ tính năng của gói miễn phí
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Mở khóa toàn bộ bộ sưu tập hình nền tinh tuyển
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Tạo &amp; chủ trì phòng học nhóm trực tuyến
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Lập kế hoạch Time-Blocking chuyên sâu
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#34D399] shrink-0" /> Đồng bộ dữ liệu đám mây đa thiết bị
                </li>
              </ul>
            </div>

            <button
              type="button"
              data-testid="landing-cta-upgrade-pricing"
              onClick={() => router.navigate('/billing')}
              className="w-full min-h-[48px] py-3 rounded-xl bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] text-xs font-bold transition cursor-pointer shadow-[0_8px_24px_rgba(96,165,250,0.22)]"
            >
              Nâng cấp PRO
            </button>
          </div>
        </div>

        {/* Demo Beta 3-Year Banner */}
        <div className="mt-8 p-5 sm:p-6 rounded-2xl border border-[#2A303C] bg-[#171A21] text-center flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-left w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#ECEFF4] text-xs font-bold mb-1.5">
              <span className="text-balance">
                Đặc quyền dành cho{' '}
                <span className="inline-block whitespace-nowrap">Người dùng mới</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1D2B44] border border-[#60A5FA]/40 text-[#93C5FD] text-[10px] font-medium whitespace-nowrap shrink-0">
                Demo Beta
              </span>
            </div>
            <p className="text-xs text-[#A1A9B8] leading-relaxed text-pretty">
              Mọi tài khoản tạo mới trong giai đoạn Demo Beta đều được <strong className="text-[#ECEFF4]">tự động kích hoạt 3&nbsp;năm gói PRO miễn&nbsp;phí</strong> (trị giá 1.404.000&nbsp;vnđ). Hệ thống không thu tiền&nbsp;thật.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.navigate('/signup')}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border-[1.5px] border-[#5F697A] bg-transparent hover:bg-[#29303D] text-[#ECEFF4] font-semibold text-xs tracking-wide transition shrink-0 cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            Đăng ký nhận 3 năm PRO
          </button>
        </div>
      </section>

      {/* 7. FAQ Accordion */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-3xl mx-auto border-t border-[#2A303C]">
        <div className="mb-8 sm:mb-10 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#ECEFF4] tracking-tight text-balance">
            Câu hỏi thường gặp
          </h2>
        </div>

        <div className="divide-y divide-[#2A303C] border-y border-[#2A303C]">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="py-4">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full min-h-[44px] flex items-center justify-between text-left text-xs sm:text-sm font-medium text-[#ECEFF4] hover:text-[#93C5FD] transition cursor-pointer gap-3"
                >
                  <span className="text-balance">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-[#A1A9B8] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#93C5FD]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-xs text-[#A1A9B8] leading-relaxed font-normal pr-2 sm:pr-6 text-pretty">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. CTA Cuối Trang */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center border-t border-[#2A303C]">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#ECEFF4] tracking-tight mb-4 text-balance">
          Sẵn sàng nâng cao năng suất của bạn?
        </h2>
        <p className="text-xs sm:text-sm text-[#A1A9B8] max-w-xl mx-auto mb-8 text-pretty">
          Tham gia cùng hàng ngàn học viên rèn luyện thói quen học tập sâu mỗi ngày cùng PomoFocus.
        </p>
        <button
          type="button"
          onClick={() => router.navigate('/app')}
          className="min-h-[48px] px-8 py-3.5 rounded-xl bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] font-bold text-xs tracking-wide transition-all duration-200 cursor-pointer inline-flex items-center gap-2 shadow-[0_8px_28px_rgba(96,165,250,0.22)] active:scale-[0.98]"
        >
          <span className="whitespace-nowrap">Mở không gian học tập</span>
          <ArrowRight size={14} className="shrink-0" />
        </button>
      </section>
      </main>

      {/* 9. Shared Unified Footer */}
      <SharedFooter />
    </div>
  );
};
