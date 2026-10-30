import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { PomoFocusLogo } from './PomoFocusLogo';
import {
  Mail,
  Phone,
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
  Lock
} from 'lucide-react';

export const SharedFooter: React.FC = () => {
  const router = useRouter();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const emailContact = 'namho03052k9@gmail.com';
  const phoneContact = '0704862629';
  const displayPhone = '0704 862 629';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailContact);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneContact);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const productLinks = [
    {
      label: 'Không Gian Làm Việc',
      path: '/app',
      icon: <Clock size={13} className="text-emerald-400 shrink-0" />
    },
    {
      label: 'Phòng Học Nhóm Live',
      path: '/rooms/room-alpha-1',
      icon: <Users size={13} className="text-sky-400 shrink-0" />
    },
    {
      label: 'Lịch Biểu Time-Block',
      path: '/calendar',
      icon: <Calendar size={13} className="text-amber-400 shrink-0" />
    },
    {
      label: 'Bảng Giá & Gói PRO',
      path: '/billing',
      icon: <Sparkles size={13} className="text-purple-400 shrink-0" />
    },
    {
      label: 'Thống Kê Tập Trung',
      path: '/dashboard',
      icon: <BarChart3 size={13} className="text-rose-400 shrink-0" />
    }
  ];

  const supportLinks = [
    {
      label: 'Gửi Phản Hồi & Ý Kiến',
      path: '/contact',
      icon: <MessageSquare size={13} className="text-emerald-400 shrink-0" />
    },
    {
      label: 'Trung Tâm Trợ Giúp',
      path: '/help',
      icon: <HelpCircle size={13} className="text-sky-400 shrink-0" />
    },
    {
      label: 'Hồ Sơ & Ảnh Đại Diện',
      path: '/profile',
      icon: <User size={13} className="text-amber-400 shrink-0" />
    },
    {
      label: 'Bảo Mật & Phiên Đăng Nhập',
      path: '/account/security',
      icon: <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
    },
    {
      label: 'Quyền Riêng Tư & Dữ Liệu',
      path: '/privacy-data',
      icon: <Lock size={13} className="text-indigo-400 shrink-0" />
    }
  ];

  return (
    <footer
      data-testid="shared-footer"
      className="w-full border-t border-zinc-800/80 bg-[#09090b] text-zinc-400 text-xs py-6 px-4 sm:py-8 sm:px-6 md:py-10 md:px-12 mt-auto select-none"
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Demo Beta 1.0 — Miễn phí 100%</span>
            </div>
          </div>

          {/* Col 2: Kênh Liên Hệ Trực Tiếp */}
          <div className="space-y-2.5 md:col-span-1">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MessageSquare size={13} className="text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Liên Hệ Trực Tiếp</span>
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
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
                title="Sao chép email"
                aria-label="Sao chép email"
              >
                {copiedEmail ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Phone quick item - Compact & Balanced */}
            <div className="p-1.5 sm:p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-2 min-h-[36px]">
              <a
                href={`tel:${phoneContact}`}
                className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 hover:text-white"
                title="Gọi hotline / Zalo"
              >
                <Phone size={12} className="text-zinc-400 shrink-0" />
                <span>{displayPhone}</span>
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
                title="Sao chép số điện thoại"
                aria-label="Sao chép số điện thoại"
              >
                {copiedPhone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Col 3: Tính Năng Sản Phẩm (2-Column Grid on Mobile, Clean List on Desktop) */}
          <div className="space-y-2.5">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-400" />
              <span>Sản Phẩm & Không Gian</span>
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
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Hỗ Trợ & Điều Khoản</span>
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
        <div className="pt-4 sm:pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1 text-center sm:text-left flex-wrap justify-center sm:justify-start">
            <span>© 2026 PomoFocus. Bản quyền phát triển bởi</span>
            <span className="text-zinc-400 font-medium whitespace-nowrap">Hồ Ngọc Bảo Nam.</span>
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-zinc-500 font-mono whitespace-nowrap">
            <span>Local-First &amp; Offline</span>
            <span>•</span>
            <span className="text-emerald-400">Tặng 3 Năm PRO Beta</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
