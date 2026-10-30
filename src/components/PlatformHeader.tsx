import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { useLayoutStore } from '../stores/useLayoutStore';
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
  Menu,
  X,
  Shield,
  Database,
  Mail,
  Home,
  Settings,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';

export const PlatformHeader: React.FC = () => {
  const router = useRouter();
  const currentPath = router.currentRoute.path;
  const { user, isAuthenticated, logout, isPro, isLifetime, planLabel } = useAuthStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isWorkspace = currentPath === '/app';

  // Lắng nghe Click Outside để đóng Dropdown Avatar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
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
    router.navigate(path);
  };

  const handleConfirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    setIsUserDropdownOpen(false);
    setShowLogoutToast(true);
    setTimeout(() => {
      setShowLogoutToast(false);
    }, 3000);
  };

  return (
    <>
      <header
        data-testid="platform-unified-header"
        className="sticky top-0 z-40 h-12 w-full border-b border-white/10 bg-[#09090b]/90 px-2.5 sm:px-6 flex items-center justify-between backdrop-blur-xl select-none text-xs"
      >
        {/* Brand & Plan Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => handleNavigate('/')}
            className="flex items-center gap-1.5 sm:gap-2 text-white hover:opacity-90 transition cursor-pointer"
            title="Về Trang Chủ PomoFocus"
          >
            <PomoFocusLogo size={24} showWordmark={true} wordmarkClassName="inline-block text-xs sm:text-sm font-bold text-white tracking-tight" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('/billing')}
            data-testid="header-plan-badge"
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition shrink-0 whitespace-nowrap ${
              isLifetime
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                : isPro
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-white/10 text-neutral-300 border-white/10'
            }`}
            title="Xem chi tiết gói dịch vụ"
          >
            <span className="hidden sm:inline">{planLabel}</span>
            <span className="sm:hidden">{isLifetime ? 'PRO ★' : isPro ? 'PRO' : 'FREE'}</span>
          </button>
        </div>

        {/* Desktop Navigation Links (>= lg) */}
        <nav className="hidden lg:flex items-center gap-1 py-1">
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Actions & Mobile Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick jump to workspace button when outside /app */}
          {!isWorkspace && (
            <button
              type="button"
              data-testid="header-enter-workspace-btn"
              onClick={() => handleNavigate('/app')}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white text-black font-semibold text-[11px] sm:text-xs hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
            >
              <Layout size={12} className="shrink-0" />
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
                onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl transition cursor-pointer shrink-0 border ${
                  isUserDropdownOpen
                    ? 'bg-white/15 border-white/25 text-white ring-2 ring-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-200'
                }`}
                title="Tài khoản & Cài đặt"
                aria-expanded={isUserDropdownOpen}
                aria-haspopup="menu"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-1 ring-emerald-400/40 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-[10px] sm:text-[11px] shadow-sm shrink-0">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] font-medium truncate hidden md:inline-block max-w-[85px]">
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
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-400/40 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
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
                      {planLabel}
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
                      <User size={14} className="text-emerald-400 shrink-0" />
                      <span className="font-medium">Hồ sơ cá nhân &amp; Avatar</span>
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-settings-btn"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        if (isWorkspace) {
                          useLayoutStore.getState().openWidget('settings');
                        } else {
                          handleNavigate('/settings');
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <Settings size={14} className="text-cyan-400 shrink-0" />
                      <span className="font-medium">Cài đặt hệ thống</span>
                    </button>

                    <button
                      type="button"
                      data-testid="header-user-security-btn"
                      onClick={() => handleNavigate('/account/security')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-left"
                    >
                      <Shield size={14} className="text-amber-400 shrink-0" />
                      <span className="font-medium">Bảo mật &amp; Phiên đăng nhập</span>
                    </button>
                  </div>

                  <div className="border-t border-white/10 my-1.5" />

                  {/* Logout item triggers Confirm Modal */}
                  <button
                    type="button"
                    data-testid="header-logout-btn"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
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
              data-testid="header-login-btn"
              onClick={() => handleNavigate('/login')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap border border-white/10"
              title="Đăng nhập tài khoản"
            >
              <User size={13} className="text-emerald-400 shrink-0" />
              <span>Đăng Nhập</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button (< lg) */}
          <button
            type="button"
            data-testid="header-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
            aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer / Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-12 z-50 bg-[#09090b]/98 backdrop-blur-2xl border-b border-white/15 shadow-2xl p-4 transition-all max-h-[calc(100vh-3rem)] overflow-y-auto">
          {/* User profile card in drawer on mobile */}
          {isAuthenticated && user && (
            <div className="mb-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate">{user.email}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                isLifetime
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : isPro
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/10 text-neutral-300 border-white/10'
              }`}>
                {planLabel}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
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
                  onClick={() => handleNavigate(item.path)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-emerald-400' : 'text-neutral-400'} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-neutral-400">
            <button
              type="button"
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 hover:text-white transition cursor-pointer"
            >
              <Home size={14} className="text-zinc-400" />
              <span>Giới Thiệu</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/profile')}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 hover:text-white transition cursor-pointer"
            >
              <User size={14} className="text-emerald-400" />
              <span>Hồ Sơ &amp; Avt</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/account/security')}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 hover:text-white transition cursor-pointer"
            >
              <Shield size={14} className="text-amber-400" />
              <span>Bảo Mật</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/privacy-data')}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 hover:text-white transition cursor-pointer"
            >
              <Database size={14} className="text-sky-400" />
              <span>Dữ Liệu</span>
            </button>
          </div>

          {/* Logout button in mobile drawer opens confirmation modal */}
          {isAuthenticated ? (
            <button
              type="button"
              data-testid="drawer-logout-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition cursor-pointer active:scale-98"
            >
              <LogOut size={14} />
              <span>Đăng Xuất Khỏi Tài Khoản</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigate('/login')}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black text-xs font-bold transition cursor-pointer active:scale-98"
            >
              <User size={14} className="shrink-0" />
              <span>Đăng Nhập / Đăng Ký Tài Khoản</span>
            </button>
          )}
        </div>
      )}

      {/* Confirm Logout Dialog (Modal) */}
      {isLogoutModalOpen && (
        <div
          data-testid="confirm-logout-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLogoutModalOpen(false);
          }}
        >
          <div
            data-testid="confirm-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="relative max-w-sm w-full rounded-2xl border border-zinc-800 bg-[#121216] p-6 shadow-2xl text-left select-none animate-in zoom-in-95 duration-150"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <LogOut size={20} />
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
                className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="confirm-logout-btn"
                onClick={handleConfirmLogout}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <LogOut size={13} />
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
