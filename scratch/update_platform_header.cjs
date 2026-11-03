const fs = require('fs');

const headerPath = 'src/components/PlatformHeader.tsx';
let content = fs.readFileSync(headerPath, 'utf8');

// Replace hamburger button icon to show X when open
content = content.replace(
  '<Menu size={18} />',
  '{isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}'
);

// Replace mobile fullscreen menu with slide-down dropdown menu
const oldMenuRegex = /\{\/\* ========================================================================= \*\/\}[\s\S]*?\{\/\* MOBILE FULL-SCREEN MINIMALIST OVERLAY[\s\S]*?<\/div>\s*<\/div>/;

const newMenu = `{/* ========================================================================= */}
      {/* MOBILE SLIDE-DOWN DROPDOWN MENU                                          */}
      {/* ========================================================================= */}

      {/* 1. Lớp phủ mờ bên dưới thanh Header */}
      <div
        data-testid="mobile-drawer-backdrop"
        className={\`lg:hidden fixed inset-0 top-14 bg-black/60 z-40 transition-opacity duration-300 \${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }\`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Menu Header dạng Slide-down Dropdown thả từ dưới thanh Header xuống */}
      <div
        id="mobile-slidedown-menu"
        data-testid="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu Điều Hướng"
        className={\`lg:hidden fixed top-14 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-2xl border-b border-zinc-800 shadow-2xl px-6 py-5 flex flex-col gap-4 transition-all duration-300 ease-out transform select-none \${
          isMobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
        }\`}
      >
        {/* Danh sách các trang */}
        <nav className="flex flex-col space-y-1">
          <button
            type="button"
            data-testid="mobile-drawer-link-app"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleNavigate('/app');
            }}
            className={\`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition cursor-pointer text-left \${
              currentPath === '/app'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }\`}
          >
            <div className="flex items-center gap-3">
              <Home size={18} className={currentPath === '/app' ? 'text-emerald-400' : 'text-zinc-400'} />
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
            className={\`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition cursor-pointer text-left \${
              currentPath.startsWith('/rooms')
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }\`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} className={currentPath.startsWith('/rooms') ? 'text-emerald-400' : 'text-zinc-400'} />
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
            className={\`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition cursor-pointer text-left \${
              currentPath === '/calendar'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }\`}
          >
            <div className="flex items-center gap-3">
              <Calendar size={18} className={currentPath === '/calendar' ? 'text-emerald-400' : 'text-zinc-400'} />
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
            className={\`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition cursor-pointer text-left \${
              currentPath === '/billing'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }\`}
          >
            <div className="flex items-center gap-3">
              <Gem size={18} className={currentPath === '/billing' ? 'text-emerald-400' : 'text-zinc-400'} />
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
            className={\`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition cursor-pointer text-left \${
              currentPath === '/account/security'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }\`}
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className={currentPath === '/account/security' ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>Trung Tâm Bảo Mật</span>
            </div>
            {currentPath === '/account/security' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </nav>

        {/* Chân menu: Nút Đăng Nhập / Đăng Ký hoặc Thẻ profile + Đăng xuất */}
        <div className="pt-3 border-t border-zinc-800/80">
          {isAuthenticated && user ? (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">{user.email}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 bg-zinc-950 text-amber-300 border-amber-400/40">
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
                className="w-full h-10 flex items-center justify-center gap-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition cursor-pointer active:scale-98"
              >
                <LogOut size={14} />
                <span>Đăng Xuất Tài Khoản</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="mobile-menu-login-btn"
              data-testid="mobile-menu-login-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleNavigate('/login');
              }}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition active:scale-98 shadow-sm cursor-pointer"
            >
              <User size={15} className="shrink-0" />
              <span>Đăng Nhập / Đăng Ký</span>
            </button>
          )}
        </div>
      </div>`;

content = content.replace(oldMenuRegex, newMenu);
fs.writeFileSync(headerPath, content, 'utf8');
console.log('Updated PlatformHeader.tsx successfully!');
