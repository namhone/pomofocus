import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { PomoFocusLogo } from './PomoFocusLogo';
import {
  Mail,
  Check,
  Copy,
  MessageSquare,
  Clock,
  Users,
  Calendar,
  Sparkles,
  BarChart3,
  HelpCircle,
  User,
  ShieldCheck,
  Lock,
  FileText,
  Shield,
  Download
} from 'lucide-react';

export const SharedFooter: React.FC = () => {
  const { isNativeCapacitor } = useDeviceDetection();
  if (isNativeCapacitor) return null;

  const router = useRouter();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const emailContact = 'support@pomofocus.vn';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailContact);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const productLinks = [
    {
      label: 'Không gian làm việc',
      path: '/app',
      icon: <Clock size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Phòng học nhóm live',
      path: '/rooms',
      icon: <Users size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Lịch biểu time-block',
      path: '/calendar',
      icon: <Calendar size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Bảng giá & gói PRO',
      path: '/billing',
      icon: <Sparkles size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Thống kê tập trung',
      path: '/dashboard',
      icon: <BarChart3 size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Tải app Android (APK)',
      path: '/download',
      icon: <Download size={13} className="text-zinc-300 shrink-0" />
    }
  ];

  const supportLinks = [
    {
      label: 'Gửi phản hồi & ý kiến',
      path: '/contact',
      icon: <MessageSquare size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Trung tâm trợ giúp',
      path: '/help',
      icon: <HelpCircle size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Hồ sơ & ảnh đại diện',
      path: '/profile',
      icon: <User size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Bảo mật & phiên đăng nhập',
      path: '/account/security',
      icon: <ShieldCheck size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Quyền riêng tư & dữ liệu',
      path: '/privacy-data',
      icon: <Lock size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Điều khoản sử dụng',
      path: '/terms',
      icon: <FileText size={13} className="text-zinc-300 shrink-0" />
    },
    {
      label: 'Chính sách bảo mật',
      path: '/privacy',
      icon: <Shield size={13} className="text-zinc-300 shrink-0" />
    }
  ];

  return (
    <footer
      data-testid="shared-footer"
      className="w-full border-t border-[#2A303C] bg-[#0F1115] text-[#A1A9B8] text-xs py-6 px-4 sm:py-8 sm:px-6 md:py-10 md:px-12 mt-auto select-none pb-safe"
    >
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Main Grid: 1 col on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Col 1: Brand & Slogan */}
          <div className="space-y-2.5 md:col-span-1">
            <button
              type="button"
              onClick={() => router.navigate('/')}
              className="flex items-center gap-2 text-white hover:opacity-90 transition cursor-pointer"
            >
              <PomoFocusLogo size={26} showWordmark={true} wordmarkClassName="text-sm font-bold text-white" />
            </button>
            <p className="text-[11px] text-zinc-400 leading-relaxed text-pretty">
              Không gian học tập &amp; làm việc sâu theo chu kỳ Pomodoro khoa học kết hợp âm thanh thiên nhiên, quản lý nhiệm vụ và phòng học nhóm trực&nbsp;tuyến.
            </p>
          </div>

          {/* Col 2: Kênh Liên Hệ Trực Tiếp */}
          <div className="space-y-2.5 md:col-span-1">
            <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
              <MessageSquare size={13} className="text-zinc-300 shrink-0" />
              <span className="whitespace-nowrap">Liên hệ trực tiếp</span>
            </div>
            <p className="text-[11px] text-zinc-400 text-pretty">
              Phát triển bởi <strong className="text-zinc-200 font-medium whitespace-nowrap">Hồ Ngọc Bảo Nam</strong>. Sẵn sàng lắng nghe phản hồi &amp; hỗ trợ kỹ&nbsp;thuật:
            </p>

            {/* Email quick item - Compact & Balanced */}
            <div className="p-1.5 sm:p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-2 min-h-[36px]">
              <a
                href={`mailto:${emailContact}`}
                className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 hover:text-white truncate"
                title="Gửi email cho nhà phát triển"
              >
                <Mail size={12} className="text-zinc-400 shrink-0" />
                <span className="truncate">{emailContact}</span>
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
                title="Sao chép email"
                aria-label="Sao chép vào bộ nhớ tạm"
              >
                {copiedEmail ? <Check size={12} className="text-zinc-300" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Support portal quick item - Compact & Balanced */}
            <div className="p-1.5 sm:p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-2 min-h-[36px]">
              <button
                type="button"
                onClick={() => router.navigate('/contact')}
                className="flex items-center gap-1.5 text-[11px] text-zinc-300 hover:text-white"
                title="Cổng hỗ trợ & gửi góp ý"
              >
                <HelpCircle size={12} className="text-zinc-400 shrink-0" />
                <span>Cổng hỗ trợ 24/7</span>
              </button>
              <button
                type="button"
                onClick={() => router.navigate('/contact')}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
                title="Đến trang hỗ trợ"
                aria-label="Đến trang hỗ trợ"
              >
                <MessageSquare size={12} className="text-zinc-300" />
              </button>
            </div>
          </div>

          {/* Col 3: Tính Năng Sản Phẩm (2-Column Grid on Mobile, Clean List on Desktop) */}
          <div className="space-y-2.5">
            <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
              <Sparkles size={13} className="text-zinc-300" />
              <span>Sản phẩm & không gian</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:block md:space-y-2 text-[11px]">
              {productLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => router.navigate(item.path)}
                  className="flex items-center gap-1.5 p-2 md:p-0 rounded-xl bg-zinc-900/40 md:bg-transparent border border-zinc-800/60 md:border-none text-zinc-300 hover:text-white hover:bg-zinc-800/50 md:hover:bg-transparent transition cursor-pointer text-left truncate w-full"
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Col 4: Hỗ Trợ & Pháp Lý (2-Column Grid on Mobile, Clean List on Desktop) */}
          <div className="space-y-2.5">
            <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-zinc-300" />
              <span>Hỗ trợ & điều khoản</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:block md:space-y-2 text-[11px]">
              {supportLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => router.navigate(item.path)}
                  className="flex items-center gap-1.5 p-2 md:p-0 rounded-xl bg-zinc-900/40 md:bg-transparent border border-zinc-800/60 md:border-none text-zinc-300 hover:text-white hover:bg-zinc-800/50 md:hover:bg-transparent transition cursor-pointer text-left truncate w-full"
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Badges Bar */}
        <div className="pt-4 sm:pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1 text-center sm:text-left flex-wrap justify-center sm:justify-start">
            <span>© 2026 PomoFocus. Bản quyền phát triển bởi</span>
            <span className="text-zinc-400 font-medium whitespace-nowrap">Hồ Ngọc Bảo Nam.</span>
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-zinc-400 whitespace-nowrap">
            <span className="text-zinc-400">Bản quyền thuộc PomoFocus</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
