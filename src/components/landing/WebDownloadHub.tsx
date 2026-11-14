import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Download,
  Smartphone,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sparkles,
  Copy,
  Check,
  BatteryCharging,
  Layers,
  ExternalLink,
  Play,
  RotateCcw,
  Lock,
  Target,
  Shield
} from 'lucide-react';
import { PlatformHeader } from '../PlatformHeader';
import { SharedFooter } from '../SharedFooter';
import { PomoFocusLogo } from '../PomoFocusLogo';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { generateValidQrCodeSvg, copyToClipboard } from '../../utils/qrCode';
import { useRouter } from '../../services/router';

export const PUBLIC_APK_URL = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.1.apk';
export const CURRENT_APK_VERSION = 'v8.1';
export const APK_SIZE_MB = 8.0;
export const APK_SIZE_LABEL = '~8.0 MB';

interface TiltState {
  rotateX: number;
  rotateY: number;
  sheenX: number;
  sheenY: number;
  isActive: boolean;
}

const INITIAL_TILT: TiltState = {
  rotateX: 0,
  rotateY: 0,
  sheenX: 50,
  sheenY: 30,
  isActive: false,
};

export const WebDownloadHub: React.FC = () => {
  const router = useRouter();
  const { isAndroid, isDesktop, isIOS } = useDeviceDetection();
  const [copied, setCopied] = useState(false);
  const [tilt, setTilt] = useState<TiltState>(INITIAL_TILT);

  // Scannable ISO/IEC 18004 QR Code with high-contrast black-on-white modules + quiet zone
  const qrSvg = useMemo(() => {
    return generateValidQrCodeSvg(PUBLIC_APK_URL, {
      size: 200,
      margin: 16,
      color: '#09090b',
      bgColor: '#ffffff',
    });
  }, []);

  // Optional gyroscope 3D tilt on supported mobile devices
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const clampedY = Math.max(-12, Math.min(12, e.gamma * 0.35));
      const clampedX = Math.max(-12, Math.min(12, (e.beta - 45) * -0.25));
      setTilt((prev) =>
        prev.isActive
          ? prev
          : {
              rotateX: clampedX,
              rotateY: clampedY,
              sheenX: 50 + clampedY * 2.5,
              sheenY: 40 - clampedX * 2.5,
              isActive: false,
            }
      );
    };
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const updateTiltFromCoordinates = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    if (!rect.width || !rect.height) return;
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    const clampedRelX = Math.max(0, Math.min(1, relX));
    const clampedRelY = Math.max(0, Math.min(1, relY));
    const rotateY = (clampedRelX - 0.5) * 24; // -12deg .. +12deg
    const rotateX = (0.5 - clampedRelY) * 24; // -12deg .. +12deg
    setTilt({
      rotateX,
      rotateY,
      sheenX: clampedRelX * 100,
      sheenY: clampedRelY * 100,
      isActive: true,
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateTiltFromCoordinates(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    updateTiltFromCoordinates(touch.clientX, touch.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handlePointerReset = () => {
    setTilt(INITIAL_TILT);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(PUBLIC_APK_URL);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const featureCards = [
    {
      title: 'Anchor Timestamp Engine',
      subtitle: 'Đếm giờ chính xác khi tắt màn hình',
      desc: 'Tính toán dựa trên mốc thời gian thực tuyệt đối, không bị trôi giờ ngay cả khi hệ thống tạm dừng tác vụ chạy nền.',
      icon: Zap,
      gradient: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30',
      badge: 'Chạy nền ổn định',
    },
    {
      title: 'Screen Wake Lock API',
      subtitle: 'Giữ sáng màn hình OLED',
      desc: 'Duy trì màn hình tập trung luôn mở dịu nhẹ khi làm việc sâu mà không gây hao tốn năng lượng pin.',
      icon: BatteryCharging,
      gradient: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      badge: 'Thân thiện OLED',
    },
    {
      title: 'Haptics & Spring Physics',
      subtitle: 'Phản hồi rung 120Hz tinh tế',
      desc: 'Rung nhẹ 10ms mô phỏng cảm giác núm xoay vật lý khi chỉnh phút; chuyển động lò xo mượt mà ở từng thao tác.',
      icon: Smartphone,
      gradient: 'from-sky-500/20 to-blue-500/10',
      border: 'border-sky-500/30',
      badge: '120Hz tự nhiên',
    },
    {
      title: 'Zero-Scroll-Chaining',
      subtitle: 'Cố định khung hình 100dvh',
      desc: 'Khung hiển thị cố định hoàn toàn không bị trôi nóc hay giật khung hình khi vuốt trên màn hình cảm ứng.',
      icon: Layers,
      gradient: 'from-purple-500/20 to-indigo-500/10',
      border: 'border-purple-500/30',
      badge: 'Cố định 100dvh',
    },
    {
      title: 'Offline First & Security',
      subtitle: 'Hoạt động offline & riêng tư',
      desc: 'Ứng dụng chạy trực tiếp toàn bộ tính năng cốt lõi không cần kết nối mạng; dữ liệu được lưu an toàn trên máy.',
      icon: ShieldCheck,
      gradient: 'from-rose-500/20 to-pink-500/10',
      border: 'border-rose-500/30',
      badge: 'Bảo mật cao',
    },
    {
      title: 'Rolling Digit Morphing',
      subtitle: 'Chuyển số mượt mà 120ms',
      desc: 'Mặt đồng hồ và thanh chỉnh stepper trượt mượt mà theo trục tung với các chuyển động vi mô tinh tế.',
      icon: Sparkles,
      gradient: 'from-teal-500/20 to-emerald-500/10',
      border: 'border-teal-500/30',
      badge: 'Chuyển động vi mô',
    },
  ];

  return (
    <div
      data-testid="download-hub-container"
      className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-300 flex flex-col relative overflow-x-hidden"
    >
      {/* Background Zen Glow Accents */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-emerald-500/12 via-teal-500/5 to-transparent blur-[140px] pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-0 right-0 w-[500px] h-[400px] bg-emerald-950/20 blur-[160px] pointer-events-none -z-10"
      />

      {/* Unified Platform Header (Single Header Guarantee) */}
      <PlatformHeader />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6">
        {/* Compact Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-fade-in">
            <PomoFocusLogo size={16} withContainer={false} />
            <span>pomofocus · Ứng dụng Android APK độc lập v8.1 Liquid Zen</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            Tập trung sâu.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent block sm:inline">
              Trôi chảy từng khoảnh khắc.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Ứng dụng Pomodoro độc lập dành riêng cho Android. Đếm giờ chính xác ngay cả khi tắt màn hình, chuyển động mượt mà 120Hz và hoàn toàn không bị làm phiền.
          </p>
        </div>

        {/* Central Responsive Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start mb-6">
          {/* Left Column: Direct Action & Download Highlights */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
            <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-2xl border border-white/10 border-t-white/20 p-5 sm:p-7 shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <PomoFocusLogo size={28} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight text-white">pomofocus</span>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
                      Bản phát hành chính thức {CURRENT_APK_VERSION}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-300 bg-zinc-800/80 px-3 py-1 rounded-full border border-white/10">
                  Dung lượng: {APK_SIZE_LABEL}
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                  Tải ứng dụng PomoFocus Android
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Cài đặt trực tiếp file APK sạch, nguyên bản. Đồng bộ dữ liệu tức thì qua đám mây
                  với tài khoản PomoFocus Web của bạn.
                </p>
              </div>

              {/* Integrated 2-Col Action Row: APK Button (Left) + Scannable QR Code (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
                {/* Left: 1-Touch Download Button & Details */}
                <div className="md:col-span-7 space-y-3">
                  <a
                    data-testid="central-apk-download-btn"
                    href={PUBLIC_APK_URL}
                    download="PomoFocus-v8.1.apk"
                    className="w-full h-14 sm:h-16 min-h-[56px] px-6 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 shadow-[0_12px_32px_rgba(16,185,129,0.45)] animate-pulse hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
                    <span>Tải PomoFocus APK (v8.1)</span>
                  </a>

                  <div className="text-center md:text-left text-[11px] text-zinc-400 font-medium">
                    Dung lượng: {APK_SIZE_LABEL} · Android 9.0+ · Miễn phí hoàn toàn
                  </div>

                  {/* Play Protect micro-hint */}
                  <p
                    data-testid="play-protect-micro-hint"
                    className="text-left text-[11px] text-zinc-400/90 leading-relaxed"
                  >
                    Nếu máy hiện cảnh báo nguồn ngoài, chọn &apos;Vẫn cài đặt&apos; để trải nghiệm bản thử nghiệm nội bộ.
                  </p>

                  {/* Device Detection Hint */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-0.5">
                    {isAndroid ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Phát hiện bạn đang dùng Android · Chạm nút trên để tải và cài đặt ngay
                      </span>
                    ) : isDesktop ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-400">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        Bạn đang ở Desktop · Quét mã QR bên cạnh để cài ngay trên điện thoại
                      </span>
                    ) : isIOS ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-400/90">
                        Thiết bị iOS hỗ trợ cài đặt PWA trực tiếp từ trình duyệt Safari
                      </span>
                    ) : (
                      <span>Hỗ trợ mọi thiết bị Android tiêu chuẩn (ARM64 / x86_64)</span>
                    )}
                  </div>
                </div>

                {/* Right: Integrated Dynamic ISO QR Code */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 text-center shadow-lg">
                  <div
                    data-testid="dynamic-qr-code"
                    className="p-1.5 rounded-xl bg-white border border-white/20 shadow-md shrink-0"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-2 uppercase tracking-wider">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Quét mã cài ngay</span>
                  </div>
                  <button
                    type="button"
                    data-testid="copy-download-url-btn"
                    onClick={handleCopy}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition active:scale-95 border border-white/10 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Đã sao chép liên kết APK!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-zinc-400" />
                        <span>Sao chép liên kết tải APK</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verified Badges */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5 text-center">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mb-0.5" />
                  <span className="text-[11px] font-semibold text-zinc-200">100% sạch</span>
                  <span className="text-[10px] text-zinc-400">Không quảng cáo</span>
                </div>
                <div className="flex flex-col items-center">
                  <Zap className="w-4 h-4 text-teal-400 mb-0.5" />
                  <span className="text-[11px] font-semibold text-zinc-200">Mượt mà 120Hz</span>
                  <span className="text-[10px] text-zinc-400">Chuyển động tự nhiên</span>
                </div>
                <div className="flex flex-col items-center">
                  <BatteryCharging className="w-4 h-4 text-sky-400 mb-0.5" />
                  <span className="text-[11px] font-semibold text-zinc-200">Tiết kiệm pin</span>
                  <span className="text-[10px] text-zinc-400">Tối ưu màn hình OLED</span>
                </div>
              </div>
            </div>

            {/* Quick Web Access Bridge */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-zinc-400">Muốn dùng ngay trên trình duyệt?</div>
                  <div className="text-xs font-semibold text-white">Trải nghiệm không gian làm việc Web</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.navigate('/app')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition active:scale-95 cursor-pointer shrink-0"
              >
                <span>Mở bản web →</span>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive 3D Titanium Glass Phone Mockup (V8.1 Liquid Zen) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div
              data-testid="phone-3d-tilt-stage"
              onMouseMove={handleMouseMove}
              onMouseLeave={handlePointerReset}
              onTouchMove={handleTouchMove}
              onTouchEnd={handlePointerReset}
              style={{ perspective: '1200px' }}
              className="w-full flex flex-col items-center justify-center py-2 cursor-grab active:cursor-grabbing"
            >
              {/* Titanium Glass 3D Phone Frame */}
              <div
                data-testid="phone-mockup-preview"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg) scale3d(${
                    tilt.isActive ? '1.02, 1.02, 1' : '1, 1, 1'
                  })`,
                  transition: tilt.isActive
                    ? 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)'
                    : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="relative w-[275px] sm:w-[295px] aspect-[9/19] rounded-[44px] bg-zinc-900/95 p-3 border-[3px] border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),_0_0_40px_rgba(52,211,153,0.18)] overflow-hidden will-change-transform"
              >
                {/* Dynamic Specular Sheen Light Reflection Layer */}
                <div
                  aria-hidden="true"
                  style={{
                    background: `radial-gradient(circle at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255,255,255,0.22) 0%, rgba(52,211,153,0.08) 38%, transparent 72%)`,
                  }}
                  className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-200"
                />

                {/* Top Specular Rim Highlight */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent z-30"
                />

                {/* Phone Speaker Notch / Punch-Hole Island */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-black border border-white/10 z-20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 mr-2" />
                  <div className="w-8 h-1 rounded-full bg-zinc-800" />
                </div>

                {/* Phone Inner Display Mockup (PomoFocus V8.1 Liquid Zen Canvas) */}
                <div className="w-full h-full rounded-[36px] bg-[#09090b] flex flex-col justify-between p-4 pt-9 text-white relative overflow-hidden border border-white/10">
                  {/* Ambient Breathing Emerald Glow inside Screen */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-emerald-500/15 blur-3xl animate-pulse"
                  />

                  {/* Top App Bar inside Mockup */}
                  <div className="flex items-center justify-between w-full px-0.5 z-10">
                    <div className="flex items-center gap-1.5">
                      <PomoFocusLogo size={16} />
                      <span className="text-xs font-bold tracking-tight text-white">PomoFocus</span>
                      <span className="sr-only">Anchor 120Hz</span>
                      
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[9px] font-mono text-amber-300">
                      <span>⚡</span>
                      <span className="font-bold text-white">50</span>
                    </div>
                  </div>

                  {/* Mode Segmented Pills */}
                  <div className="flex justify-center gap-1 z-10 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-bold text-[9px] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      Tập trung
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 text-[9px] border border-white/5">
                      Nghỉ ngắn
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 text-[9px] border border-white/5">
                      Nghỉ dài
                    </span>
                  </div>

                  {/* Quick Task Bar & Strict Mode & Pocket Lock */}
                  <div className="flex items-center gap-1 w-full z-10 mt-2">
                    <div className="flex-1 h-6 rounded-full bg-zinc-900/90 border border-white/10 px-2 flex items-center justify-between text-[8px] text-zinc-300">
                      <span className="flex items-center gap-1 truncate">
                        <Target className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Chọn mục tiêu phiên này...</span>
                      </span>
                    </div>
                    <div className="h-6 px-1.5 rounded-full bg-zinc-900/90 border border-white/10 flex items-center gap-0.5 text-[8px] text-zinc-400">
                      <Shield className="w-2.5 h-2.5" />
                      <span>Kỷ luật</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Monumental Numerals (V8.1) */}
                  <div className="flex flex-col items-center justify-center my-auto z-10 py-1">
                    <div className="text-4xl font-extrabold font-mono tabular-nums tracking-tighter text-white drop-shadow-[0_4px_24px_rgba(52,211,153,0.35)]">
                      25:00
                    </div>
                    <div className="text-[9px] text-emerald-400/90 uppercase tracking-widest font-semibold mt-0.5">
                      Sẵn sàng
                    </div>
                    {/* Session Progress Bar */}
                    <div className="w-28 h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="w-1/4 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                    </div>
                    {/* Cycle Dots */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    </div>
                    {/* Thumb Controls (Reset & Play) */}
                    <div className="flex items-center gap-3.5 mt-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300">
                        <RotateCcw className="w-3 h-3" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zinc-950 font-bold shadow-md">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-400">
                        <span className="text-[10px]">⏭</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Daily Flow Strip */}
                  <div className="w-full px-2 py-1 rounded-xl bg-zinc-900/60 border border-white/5 z-10 text-[8px] space-y-0.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Dòng chảy hôm nay</span>
                      <span className="text-emerald-400 font-mono">0g 0ph · 0 🍅</span>
                    </div>
                    <div className="flex items-center justify-between gap-0.5 h-1.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className={`flex-1 rounded-sm h-full ${i === 8 ? 'bg-emerald-400' : 'bg-zinc-800'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Bottom 5 Material 3 Tabs */}
                  <div className="flex justify-around items-center pt-1.5 border-t border-white/10 text-[8px] text-zinc-400 z-10 pb-0.5">
                    <span className="text-emerald-400 font-bold flex flex-col items-center">
                      <span>●</span>
                      <span>Tập trung</span>
                    </span>
                    <span className="flex flex-col items-center"><span>✓</span><span>Công việc</span></span>
                    <span className="flex flex-col items-center"><span>🌌</span><span>Không gian</span></span>
                    <span className="flex flex-col items-center"><span>⚡</span><span>Trợ lý AI</span></span>
                    <span className="flex flex-col items-center"><span>⚙️</span><span>Cài đặt</span></span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rê chuột hoặc chạm nghiêng khung máy để trải nghiệm 3D Titanium Glass</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Tech Feature Showcase Cards */}
        <div className="mt-16 sm:mt-24">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3">
              Công nghệ cốt lõi v8.1
            </h3>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Tối ưu từng khoảnh khắc trên điện thoại của bạn
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className={`relative rounded-3xl bg-zinc-900/40 backdrop-blur-xl border ${card.border} p-6 sm:p-7 shadow-lg hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition duration-300 group overflow-hidden`}
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none`}
                  />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-300">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                          {card.badge}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1">{card.title}</h4>
                      <div className="text-xs font-semibold text-emerald-400/90 mb-2">
                        {card.subtitle}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Shared Footer (Global Workspace Footer) */}
      <SharedFooter />
    </div>
  );
};

export default WebDownloadHub;
