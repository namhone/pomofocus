import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { PomoFocusLogo } from './PomoFocusLogo';
import {
  Users,
  Calendar,
  CreditCard,
  LogIn,
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
  Home
} from 'lucide-react';

export const PlatformHeader: React.FC = () => {
  const router = useRouter();
  const currentPath = router.currentRoute.path;
  const { user, isAuthenticated, logout, isPro, isLifetime, planLabel } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isWorkspace = currentPath === '/app';

  const navItems = [
    { path: '/app', label: 'Không Gian', icon: Layout, testId: 'header-nav-app' },
    { path: '/billing', label: 'Bảng Giá', icon: CreditCard, testId: 'header-nav-billing' },
    { path: '/rooms/room-alpha-1', label: 'Phòng Học', icon: Users, testId: 'header-nav-rooms' },
    { path: '/calendar', label: 'Lịch Biểu', icon: Calendar, testId: 'header-nav-calendar' },
    { path: '/dashboard', label: 'Thống Kê', icon: BarChart3, testId: 'header-nav-dashboard' },
    { path: '/help', label: 'Trợ Giúp', icon: HelpCircle, testId: 'header-nav-help' },
    { path: '/contact', label: 'Liên Hệ', icon: Mail, testId: 'header-nav-contact' }
  ];

  const handleNavigate = (path: string) => {
    setIsMobileMenuOpen(false);
    router.navigate(path);
  };

  return (
    <>
      <header
        data-testid="platform-unified-header"
        className="sticky top-0 z-40 h-12 w-full border-b border-white/10 bg-[#09090b]/90 px-3 sm:px-6 flex items-center justify-between backdrop-blur-xl select-none text-xs"
      >
        {/* Brand & Plan Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigate(isWorkspace ? '/' : '/app')}
            className="flex items-center gap-2 text-white hover:opacity-90 transition cursor-pointer"
            title="PomoFocus Home"
          >
            <PomoFocusLogo size={26} showWordmark={true} wordmarkClassName="inline-block text-xs sm:text-sm font-bold text-white tracking-tight" />
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
            {planLabel}
          </button>
        </div>

        {/* Desktop Navigation Links (>= md) */}
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick jump to workspace button when outside /app */}
          {!isWorkspace && (
            <button
              type="button"
              data-testid="header-enter-workspace-btn"
              onClick={() => handleNavigate('/app')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-black font-semibold text-[11px] sm:text-xs hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
            >
              <Layout size={12} className="shrink-0" />
              <span>Vào Học</span>
            </button>
          )}

          {/* User profile button */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="header-user-profile-btn"
                onClick={() => handleNavigate('/profile')}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer shrink-0 max-w-[130px]"
                title="Xem và chỉnh sửa hồ sơ & ảnh đại diện"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-4 h-4 rounded-full object-cover border border-emerald-400/40 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[9px] shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] text-neutral-200 font-medium truncate hidden sm:inline-block">
                  {user.displayName}
                </span>
              </button>

              <button
                type="button"
                data-testid="header-logout-btn"
                onClick={logout}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="header-login-btn"
              onClick={() => handleNavigate('/login')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 text-xs transition cursor-pointer whitespace-nowrap"
            >
              <LogIn size={13} />
              <span className="hidden sm:inline">Đăng Nhập</span>
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
              <span>Hồ Sơ & Avt</span>
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
        </div>
      )}
    </>
  );
};
