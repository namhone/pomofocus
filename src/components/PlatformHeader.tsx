import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { usePwaInstallStore } from '../stores/usePwaInstallStore';
import { useAiStore, isOwnerAiUser } from '../stores/useAiStore';
import { PomoFocusLogo } from './PomoFocusLogo';
import {
  Database,
  Users,
  Calendar,
  CreditCard,
  LogOut,
  User,
  Layout,
  BarChart3,
  HelpCircle,
  X,
  Shield,
  Mail,
  Home,
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  Menu,
  Download,
  Sparkles,
  Gem,
  Lock,
  Pin
} from 'lucide-react';

export const PlatformHeader: React.FC = () => {
  const router = useRouter();
  const currentPath = router.currentRoute.path;
  const { user, isAuthenticated, logout, isPro, isLifetime, planLabel } = useAuthStore();
  const { canInstall, triggerInstall } = usePwaInstallStore();
  const isFocusDimmed = useLayoutStore((s) => s.isFocusDimmed);
  const aiCreditsBalance = useAiStore((s) => s.aiCreditsBalance);
  const isHeaderExpanded = useLayoutStore((s) => s.isHeaderExpanded);
  const setHeaderExpanded = useLayoutStore((s) => s.setHeaderExpanded);
  const setMobileHeaderOpen = useLayoutStore((s) => s.setMobileHeaderOpen);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const isOwner = Boolean(
    (user && (user.email === 'namho03052k9@gmail.com' || user.email === 'huyentrantt09@gmail.com' || user.email === 'tony31082009@gmail.com')) ||
    isOwnerAiUser()
  );

  const handleCreditsBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorkspace) {
      useAiStore.getState().toggleOpen();
    } else {
      setShowCreditsModal(true);
    }
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isWorkspace = currentPath === '/app';

  const [isHeaderPinned, setIsHeaderPinned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('pomodoro_header_pinned') === 'true';
    } catch {
      return false;
    }
  });
  const togglePinHeader = () => {
    setIsHeaderPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pomodoro_header_pinned', String(next));
      } catch {}
      if (next) {
        setHeaderExpanded(true);
      }
      return next;
    });
  };



  // Lắng nghe Click Outside để đóng Dropdown Avatar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  // Phím tắt Esc đóng modal và dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
        setIsLogoutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Khóa cuộn trang khi Dropdown Menu (Mobile hoặc Avatar) mở để chống trôi/giật nội dung
  useEffect(() => {
    if (isMobileMenuOpen || isUserDropdownOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileMenuOpen, isUserDropdownOpen]);

  const navItems = [
    { path: '/app', label: 'Không Gian', icon: Layout, testId: 'header-nav-app' },
    { path: '/billing', label: 'Bảng Giá', icon: CreditCard, testId: 'header-nav-billing' },
    { path: '/rooms', label: 'Phòng Học', icon: Users, testId: 'header-nav-rooms' },
    { path: '/calendar', label: 'Lịch Biểu', icon: Calendar, testId: 'header-nav-calendar' },
    { path: '/dashboard', label: 'Thống Kê', icon: BarChart3, testId: 'header-nav-dashboard' },
    { path: '/help', label: 'Trợ Giúp', icon: HelpCircle, testId: 'header-nav-help' },
    { path: '/contact', label: 'Liên Hệ', icon: Mail, testId: 'header-nav-contact' }
  ];

  const handleNavigate = (path: string) => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
    router.navigate(path);
  };

  const handleAvatarClick = () => {
    setIsUserDropdownOpen((prev) => !prev);
  };

  const handleConfirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
    setShowLogoutToast(true);
    setTimeout(() => {
      setShowLogoutToast(false);
    }, 3000);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. HÌNH THÁI THU GỌN (!isHeaderExpanded): VIÊN NANG KÍNH MỜ NỔI DUY NHẤT */}
      {/* ========================================================================= */}
      {isWorkspace && (
        <aside
          data-testid="floating-header-capsule"
          aria-label="Thanh điều hướng thu gọn"
          className={`fixed top-3 right-4 sm:right-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-300 ease-out select-none ${
            !isHeaderExpanded
              ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
              : 'opacity-0 -translate-y-2 pointer-events-none scale-90'
          }`}
        >
          {/* Avatar tròn 24px */}
          <button
            type="button"
            data-testid="capsule-avatar-btn"
            onClick={() => setHeaderExpanded(true)}
            className="flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95"
            title={user ? `${user.displayName || user.email} · Bấm để mở menu` : 'Khách · Bấm để mở menu'}
            aria-label="Tài khoản và Menu"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || 'Avatar'}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20 shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {(user?.displayName || user?.email || 'N').charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* ⚡ Số Credits */}
          <button
            type="button"
            data-testid="capsule-credits-btn"
            onClick={handleCreditsBadgeClick}
            aria-label="Số dư AI Credits"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[11px] font-mono font-medium transition cursor-pointer shrink-0 active:scale-95"
            title={
              isOwner
                ? 'Đặc quyền Chủ sở hữu: ⚡ ∞ Không giới hạn'
                : `Số dư AI: ${aiCreditsBalance.toLocaleString('vi-VN')}⚡ · Bấm xem chi tiết AI Credits`
            }
          >
            <Zap size={11} className="fill-amber-400 text-amber-400 shrink-0" />
            <span>{isOwner ? '⚡ ∞' : `${aiCreditsBalance.toLocaleString('vi-VN')}⚡`}</span>
          </button>

          {/* ⚙️ Cài đặt */}
          <button
            type="button"
            data-testid="capsule-settings-btn"
            onClick={(e) => {
              e.stopPropagation();
              useLayoutStore.getState().openWidget('settings');
              if (useLayoutStore.getState().isMobile) {
                useLayoutStore.getState().setActiveMobileTab('settings');
                setTimeout(() => {
                  document.querySelector('[data-testid="widget-container-settings"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }
            }}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer shrink-0 active:scale-95"
            title="Mở Cài đặt hệ thống (⚙️)"
            aria-label="Cài đặt"
          >
            <Settings size={14} className="shrink-0" />
          </button>

          {/* ▾ Mở menu */}
          <button
            type="button"
            data-testid="capsule-expand-btn"
            onClick={() => setHeaderExpanded(true)}
            className="flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white text-[11px] font-medium transition cursor-pointer shrink-0 active:scale-95"
            title="Mở thanh Header đầy đủ"
            aria-label="Mở menu"
          >
            <span className="hidden xs:inline">Menu</span>
            <ChevronDown size={13} className="text-zinc-400 shrink-0" />
          </button>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. HÌNH THÁI MỞ RỘNG (isHeaderExpanded HOẶC KHI NGOÀI /app)               */}
      {/* ========================================================================= */}
      <header
        data-testid="platform-unified-header"
        className={`${
          isWorkspace
            ? `fixed top-0 left-0 right-0 w-full h-14 z-50 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between select-none text-xs transition-all duration-300 ease-out ${
                isHeaderExpanded
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : '-translate-y-full opacity-0 pointer-events-none'
              } ${isFocusDimmed && isHeaderExpanded ? 'opacity-30 hover:opacity-100' : ''}`
            : 'sticky top-0 left-0 right-0 z-50 h-14 w-full border-b border-white/[0.08] bg-[#09090b]/95 px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl select-none text-xs'
        }`}
      >
        {/* Brand & Plan Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => handleNavigate('/')}
            className="flex items-center gap-1.5 sm:gap-2 text-white hover:opacity-90 transition cursor-pointer"
            title="Về Trang Chủ PomoFocus"
          >
            <PomoFocusLogo size={isWorkspace ? 18 : 24} showWordmark={true} wordmarkClassName="inline-block text-xs font-bold text-white tracking-tight" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('/billing')}
            data-testid="header-plan-badge"
            className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide border cursor-pointer transition shrink-0 whitespace-nowrap ${
              isLifetime
                ? 'border-zinc-700 bg-zinc-900 text-zinc-200 shadow-sm'
                : isPro
                ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
            }`}
            title="Xem chi tiết gói dịch vụ"
          >
            <span className="hidden sm:inline">{user?.badge || planLabel}</span>
            <span className="sm:hidden">{isLifetime ? 'PRO ★' : isPro ? 'PRO' : 'FREE'}</span>
          </button>
        </div>

        {/* Desktop Navigation Links (>= lg) */}
        <nav className="hidden lg:flex items-center gap-1.5 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/app'
                ? currentPath === '/app'
                : item.path.startsWith('/rooms')
                ? currentPath.startsWith('/rooms')
                : currentPath === item.path;

            return (
              <button
                key={item.path}
                type="button"
                data-testid={item.testId}
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition cursor-pointer shrink-0 whitespace-nowrap text-[11px] ${
                  isActive
                    ? 'bg-zinc-800/80 text-white font-medium shadow-sm border border-zinc-700/50'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Actions & Mobile Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Nút Ghim Header (Pin) chỉ hiển thị khi ở /app */}
          {isWorkspace && (
            <button
              type="button"
              data-testid="header-pin-btn"
              onClick={togglePinHeader}
              className={`h-8 w-8 flex items-center justify-center rounded-full border transition cursor-pointer shrink-0 ${
                isHeaderPinned
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-white/10'
              }`}
              title={isHeaderPinned ? 'Bỏ ghim Header (Bật tự động ẩn)' : 'Ghim cố định Header'}
              aria-label="Ghim Header"
            >
              <Pin size={14} className={isHeaderPinned ? 'rotate-45' : ''} />
            </button>
          )}
          {/* Nút Thu gọn Header về Viên nang khi ở /app */}
          {isWorkspace && (
            <button
              type="button"
              data-testid="header-collapse-btn"
              onClick={() => setHeaderExpanded(false)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/15 text-[11px] font-medium transition cursor-pointer active:scale-95 shrink-0 shadow-sm"
              title="Thu gọn Header thành viên nang"
              aria-label="Thu gọn Header"
            >
              <ChevronUp size={13} className="text-zinc-400 shrink-0" />
              <span className="hidden sm:inline">Thu gọn</span>
            </button>
          )}

          {/* AI Study Companion Quick HUD */}
          <button
            type="button"
            data-testid="header-ai-btn"
            onClick={handleCreditsBadgeClick}
            className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-semibold text-[11px] border border-cyan-500/30 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
            title={
              isOwner
                ? 'Đặc quyền Chủ sở hữu: ⚡ ∞ / Vô Hạn'
                : `Mở Trợ lý AI Companion (${aiCreditsBalance.toLocaleString()}⚡)`
            }
          >
            <Sparkles size={13} className="text-cyan-400 shrink-0" />
            <span className="font-mono text-amber-300 font-bold">{isOwner ? '⚡ ∞' : `${aiCreditsBalance.toLocaleString()}⚡`}</span>
          </button>

          {/* PWA Install Button when available */}
          {canInstall && (
            <button
              type="button"
              data-testid="pwa-install-btn"
              onClick={() => triggerInstall()}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
              title="Cài đặt PomoFocus vào thiết bị (PWA)"
            >
              <Download size={13} className="shrink-0" />
              <span className="hidden sm:inline">Cài App</span>
            </button>
          )}

          {/* Quick jump to workspace button when outside /app */}
          {!isWorkspace && (
            <button
              type="button"
              data-testid="header-enter-workspace-btn"
              onClick={() => handleNavigate('/app')}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap border border-white/20"
            >
              <Layout size={13} className="shrink-0" />
              <span className="hidden xs:inline">Vào Học</span>
            </button>
          )}

          {/* User state: Avatar Dropdown when logged in, or Login button when guest */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Circular Avatar Trigger */}
              <button
                type="button"
                data-testid="header-user-avatar-btn"
                onClick={handleAvatarClick}
                className={`h-8 flex items-center gap-1.5 px-2.5 rounded-full transition cursor-pointer shrink-0 border text-[11px] ${
                  isUserDropdownOpen
                    ? 'bg-zinc-800/80 border-zinc-600 text-white ring-1 ring-zinc-500'
                    : 'bg-zinc-900/80 hover:bg-zinc-800/80 border-white/10 text-zinc-300'
                }`}
                title="Tài khoản & Cài đặt"
                aria-label="Tài khoản và Menu"
                aria-expanded={isUserDropdownOpen}
                aria-haspopup="menu"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full object-cover ring-1 ring-zinc-700 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700 flex items-center justify-center font-medium text-[10px] sm:text-[11px] shrink-0">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium truncate hidden md:inline-block max-w-[85px]">
                  {user.displayName}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-neutral-400 transition-transform duration-200 hidden xs:inline-block ${
                    isUserDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserDropdownOpen && (
                <div
                  data-testid="header-user-dropdown"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-[#121216]/95 backdrop-blur-2xl p-2 shadow-2xl z-60 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Mini Header Profile Info */}
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-2.5 mb-1.5">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700 flex items-center justify-center font-medium text-xs shrink-0">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        {user.email}
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                        isLifetime
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                          : isPro
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/10 text-neutral-300 border-white/10'
                      }`}
                    >
                      {user?.badge || planLabel}
                    </span>
                  </div>

                  {/* Dropdown Options */}
                  <div className="space-y-0.5">
                    {/* Lối tắt điều hướng nhanh */}
                    <button
                      type="button"
                      data-testid="header-user-app-btn"
                      onClick={() => handleNavigate('/app')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Home size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-medium">Không Gian Học</span>
                      </div>
                      {currentPath === '/app' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-rooms-btn"
                      onClick={() => handleNavigate('/rooms')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users size={14} className="text-indigo-400 shrink-0" />
                        <span className="font-medium">Phòng Học Nhóm Live</span>
                      </div>
                      {currentPath === '/rooms' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-billing-btn"
                      onClick={() => handleNavigate('/billing')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard size={14} className="text-amber-400 shrink-0" />
                        <span className="font-medium">Bảng Giá &amp; Gói Cước</span>
                      </div>
                      {currentPath === '/billing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>

                    <div className="border-t border-white/10 my-1.5" />

                    <button
                      type="button"
                      data-testid="header-user-profile-btn"
                      onClick={() => handleNavigate('/profile')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <User size={14} className="text-zinc-400 shrink-0" />
                      <span className="font-medium">Hồ sơ cá nhân &amp; Avatar</span>
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-settings-btn"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
                        if (isWorkspace) {
                          useLayoutStore.getState().openWidget('settings');
                        } else {
                          handleNavigate('/settings');
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <Settings size={14} className="text-zinc-400 shrink-0" />
                      <span className="font-medium">Cài đặt hệ thống</span>
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-security-btn"
                      onClick={() => handleNavigate('/account/security')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <Shield size={14} className="text-zinc-400 shrink-0" />
                      <span className="font-medium">Bảo mật &amp; Phiên đăng nhập</span>
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-privacy-btn"
                      onClick={() => handleNavigate('/privacy-data')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <Database size={14} className="text-zinc-400 shrink-0" />
                      <span className="font-medium">Quyền riêng tư &amp; Dữ liệu</span>
                    </button>

                    {canInstall && (
                      <button
                        type="button"
                        data-testid="header-user-install-pwa-btn"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
                          triggerInstall();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left font-medium"
                      >
                        <Download size={14} className="text-zinc-400 shrink-0" />
                        <span>Cài đặt ứng dụng (PWA)</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-white/10 my-1.5" />

                  {/* Logout item triggers Confirm Modal */}
                  <button
                    type="button"
                    data-testid="header-logout-btn"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setHeaderExpanded(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer text-left font-medium"
                  >
                    <LogOut size={14} className="shrink-0" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              id="header-login-btn"
              data-testid="header-login-btn"
              onClick={() => handleNavigate('/login')}
              className="h-8 flex items-center gap-1.5 px-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-neutral-200 hover:text-white text-xs transition cursor-pointer whitespace-nowrap border border-white/10 shadow-sm"
              title="Đăng nhập tài khoản"
            >
              <User size={13} className="text-emerald-400 shrink-0" />
              <span>Đăng Nhập</span>
            </button>
          )}

          {/* Nút Hamburger Menu ☰ trên mobile */}
          {!isAuthenticated && (
            <button
              type="button"
              id="header-mobile-menu-btn"
              data-testid="header-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer shrink-0 active:scale-95"
              title="Menu điều hướng"
              aria-label="Menu điều hướng"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-DOWN DROPDOWN MENU (LINEAR / LIFEAT SOFT DROPDOWN)           */}
      {/* ========================================================================= */}

      {/* 1. Lớp phủ mờ bắt sự kiện click outside */}
      <div
        data-testid="mobile-drawer-backdrop"
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Menu Header dạng Thả Xuống (Slide-down Dropdown) định vị tại top-14 right-3 w-64 */}
      <div
        id="mobile-slidedown-menu"
        data-testid="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu Điều Hướng"
        className={`lg:hidden fixed top-14 right-3 sm:right-6 w-64 z-60 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 transition-all duration-200 ease-out origin-top select-none ${
          isMobileMenuOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Danh sách các trang */}
        <nav className="flex flex-col space-y-0.5">
          <button
            type="button"
            data-testid="mobile-drawer-link-app"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigate('/app');
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
              currentPath === '/app'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Home size={16} className={currentPath === '/app' ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>Không Gian Học</span>
            </div>
            {currentPath === '/app' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            data-testid="mobile-drawer-link-rooms"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigate('/rooms');
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
              currentPath.startsWith('/rooms')
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users size={16} className={currentPath.startsWith('/rooms') ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>Phòng Học Nhóm Live</span>
            </div>
            {currentPath.startsWith('/rooms') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            data-testid="mobile-drawer-link-calendar"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigate('/calendar');
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
              currentPath === '/calendar'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className={currentPath === '/calendar' ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>Lịch Biểu Pomodoro</span>
            </div>
            {currentPath === '/calendar' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            data-testid="mobile-drawer-link-billing"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigate('/billing');
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
              currentPath === '/billing'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Gem size={16} className={currentPath === '/billing' ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>Bảng Giá & Nâng Cấp</span>
            </div>
            {currentPath === '/billing' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            data-testid="mobile-drawer-link-security"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigate('/account/security');
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
              currentPath === '/account/security'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock size={16} className={currentPath === '/account/security' ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>Trung Tâm Bảo Mật</span>
            </div>
            {currentPath === '/account/security' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </nav>

        {/* Chân menu: Nút Đăng Nhập / Đăng Ký hoặc Thẻ profile + Đăng xuất */}
        {isAuthenticated && user ? (
          <div className="pt-2 mt-1 border-t border-zinc-800/80 space-y-1.5">
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">{user.email}</div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border shrink-0 bg-zinc-950 text-amber-300 border-amber-400/40">
                {user?.badge || planLabel}
              </span>
            </div>

            <button
              type="button"
              data-testid="drawer-logout-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition cursor-pointer active:scale-98"
            >
              <LogOut size={13} />
              <span>Đăng Xuất</span>
            </button>
          </div>
        ) : (
          <div className="pt-2 mt-1 border-t border-zinc-800/80">
            <button
              type="button"
              id="mobile-menu-login-btn"
              data-testid="mobile-menu-login-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleNavigate('/login');
              }}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition active:scale-98 shadow-sm cursor-pointer"
            >
              <User size={14} className="shrink-0" />
              <span>Đăng Nhập / Đăng Ký</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirm Logout Dialog (Modal) */}
      {isLogoutModalOpen && (
        <div
          data-testid="confirm-logout-modal-backdrop"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLogoutModalOpen(false);
          }}
        >
          <div
            data-testid="confirm-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="relative max-w-sm w-full rounded-3xl border border-white/[0.1] bg-zinc-950/92 backdrop-blur-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_24px_64px_rgba(0,0,0,0.6)] text-left select-none animate-in zoom-in-95 duration-150"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <LogOut size={20} className="-translate-y-[0.5px]" />
            </div>

            <h3 id="logout-dialog-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
              Đăng xuất
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không? Mọi dữ liệu đã lưu trữ cục bộ và đồng bộ sẽ được bảo toàn an toàn.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="btn-cancel-logout"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="confirm-logout-btn"
                onClick={handleConfirmLogout}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <LogOut size={13} className="-translate-y-[0.5px]" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Success Toast */}
      {showLogoutToast && (
        <div
          data-testid="logout-success-toast"
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-80 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-emerald-500/30 text-emerald-300 text-xs shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span className="font-medium text-white">Đã đăng xuất thành công.</span>
        </div>
      )}

      {/* =========================================================================
          POPUP GIẢI THÍCH TÍNH NĂNG AI CREDITS (CHO KHÁCH VÀ NGOÀI WORKSPACE)
         ========================================================================= */}
      {showCreditsModal && (
        <div
          data-testid="credits-intro-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreditsModal(false);
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-2xl text-neutral-100 selection:bg-white selection:text-black">
            <button
              type="button"
              data-testid="btn-close-credits-modal"
              onClick={() => setShowCreditsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap size={22} className="fill-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>AI Credits</span>
                  <span className="text-amber-400">⚡</span>
                </h3>
                <p className="text-xs text-neutral-400">Năng lượng đồng hành cùng Gia sư AI Socratic</p>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-5">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-2.5">
                <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-xs">
                  50⚡ tặng sẵn để bạn trải nghiệm giải đề và tóm tắt bài học cùng Gia sư AI. Đăng ký để nhận thêm mỗi tuần.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreditsModal(false);
                  router.navigate('/signup');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
              >
                Đăng Ký Nhận 3 Năm PRO &amp; AI Miễn Phí →
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreditsModal(false);
                    router.navigate('/billing');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-xs transition cursor-pointer"
                >
                  Xem Bảng Giá &amp; Nạp Điểm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreditsModal(false);
                    router.navigate('/app');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-xs transition cursor-pointer"
                >
                  Vào Không Gian Học
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
