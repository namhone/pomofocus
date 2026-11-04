import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { usePwaInstallStore } from '../stores/usePwaInstallStore';
import { useAiStore } from '../stores/useAiStore';
import { PomoFocusLogo } from './PomoFocusLogo';
import {
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
  const isMobileHeaderOpen = useLayoutStore((s) => s.isMobileHeaderOpen);
  const setMobileHeaderOpen = useLayoutStore((s) => s.setMobileHeaderOpen);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);

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
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHeaderMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHeaderHovered(true);
  };

  const handleHeaderMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHeaderHovered(false);
    }, 1500);
  };

  useEffect(() => {
    if (!isWorkspace || isHeaderPinned) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 24) {
        handleHeaderMouseEnter();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isWorkspace, isHeaderPinned]);

  const togglePinHeader = () => {
    setIsHeaderPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pomodoro_header_pinned', String(next));
      } catch {}
      return next;
    });
  };

  const isHeaderVisible = !isWorkspace || isHeaderPinned || isHeaderHovered || isMobileMenuOpen || isUserDropdownOpen;


  // Lắng nghe Click Outside để đóng Dropdown Avatar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
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
        setIsLogoutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    router.navigate(path);
  };

  const handleAvatarClick = () => {
    if (window.innerWidth < 640) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsUserDropdownOpen((prev) => !prev);
    }
  };

  const handleConfirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
    setShowLogoutToast(true);
    setTimeout(() => {
      setShowLogoutToast(false);
    }, 3000);
  };

  return (
    <>
      {/* Vùng cảm biến chuột rê mép trên khi Header đang ẩn */}
      {isWorkspace && !isHeaderPinned && (
        <div
          data-testid="header-hover-sensor"
          className="fixed top-0 left-0 right-0 h-3 z-50 pointer-events-auto"
          onMouseEnter={handleHeaderMouseEnter}
        />
      )}

      <header
        data-testid="platform-unified-header"
        onMouseEnter={isWorkspace ? handleHeaderMouseEnter : undefined}
        onMouseLeave={isWorkspace ? handleHeaderMouseLeave : undefined}
        className={`${
          isWorkspace
            ? `fixed top-0 left-0 right-0 z-50 flex justify-center px-2 sm:px-4 transition-all duration-300 ${
                isMobileHeaderOpen
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : '-translate-y-full opacity-0 pointer-events-none sm:translate-y-0 sm:opacity-100 sm:pointer-events-none'
              }`
            : 'sticky top-0 z-50 h-14 w-full border-b border-white/[0.08] bg-[#09090b]/95 px-3 sm:px-6 flex items-center justify-between backdrop-blur-xl select-none text-xs'
        }`}
      >
        <div
          className={`${
            isWorkspace
              ? `pointer-events-auto h-10 w-full max-w-4xl mx-auto mt-2 rounded-full bg-zinc-950/40 backdrop-blur-md border border-white/[0.06] shadow-lg px-3 sm:px-4 flex items-center justify-between select-none text-xs transition-all duration-300 relative ${
                  isHeaderVisible || isMobileHeaderOpen
                    ? 'opacity-100 shadow-2xl bg-zinc-950/70 border-white/10'
                    : 'opacity-25 hover:opacity-100'
                } ${isFocusDimmed && !isHeaderHovered ? 'opacity-10' : ''}`
              : 'w-full flex items-center justify-between'
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
              className={`h-7 w-7 flex items-center justify-center rounded-full border transition cursor-pointer shrink-0 ${
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
          {/* AI Study Companion Quick HUD */}
          <button
            type="button"
            data-testid="header-ai-btn"
            onClick={() => useAiStore.getState().toggleOpen()}
            className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-semibold text-[11px] border border-cyan-500/30 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
            title={`Mở Trợ lý AI Companion (${aiCreditsBalance.toLocaleString()}⚡)`}
          >
            <Sparkles size={13} className="text-cyan-400 shrink-0" />
            <span className="font-mono text-amber-300 font-bold">{aiCreditsBalance.toLocaleString()}⚡</span>
          </button>

          {/* PWA Install Button when available */}
          {canInstall && (
            <button
              type="button"
              data-testid="pwa-install-btn"
              onClick={() => triggerInstall()}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
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
              className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap border border-white/20"
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
                className={`h-7 flex items-center gap-1.5 px-2 rounded-full transition cursor-pointer shrink-0 border text-[11px] ${
                  isUserDropdownOpen
                    ? 'bg-zinc-800/80 border-zinc-600 text-white ring-1 ring-zinc-500'
                    : 'bg-zinc-900/80 hover:bg-zinc-800/80 border-white/10 text-zinc-300'
                }`}
                title="Tài khoản & Cài đặt"
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
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-[#121216]/95 backdrop-blur-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
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

                    {canInstall && (
                      <button
                        type="button"
                        data-testid="header-user-install-pwa-btn"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
    setMobileHeaderOpen(false);
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
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-neutral-200 hover:text-white text-xs transition cursor-pointer whitespace-nowrap border border-white/10 shadow-sm"
              title="Đăng nhập tài khoản"
            >
              <User size={13} className="text-emerald-400 shrink-0" />
              <span>Đăng Nhập</span>
            </button>
          )}

          {/* Nút Hamburger Menu ☰ trên mobile */}
          <button
            type="button"
            id="header-mobile-menu-btn"
            data-testid="header-mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer shrink-0 active:scale-95"
            title="Menu điều hướng"
            aria-label="Menu điều hướng"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
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
        className={`lg:hidden absolute top-14 right-3 w-64 z-50 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 transition-all duration-200 ease-out origin-top select-none ${
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
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-emerald-500/30 text-emerald-300 text-xs shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span className="font-medium text-white">Đã đăng xuất thành công.</span>
        </div>
      )}
    </>
  );
};
