const fs = require('fs');

// 1. Update MobileBottomNav.tsx
const mobileNavPath = 'src/components/MobileBottomNav.tsx';
let navContent = fs.readFileSync(mobileNavPath, 'utf8');

// Replace imports
navContent = navContent.replace(
`  Clock,
  CheckSquare,
  Volume2,`,
`  Timer,
  ClipboardList,
  Headphones,`
);

// Replace nav element
const oldNavRegex = /\{\/\* Main Mobile Bottom Navigation Bar \*\/\}[\s\S]*?<\/nav>/;
const newNav = `{/* Main Mobile Bottom Navigation Bar */}
      <nav
        role="toolbar"
        aria-label="Thanh điều hướng di động"
        data-testid="mobile-bottom-navigation"
        className={\`fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 z-40 px-2 flex items-center justify-around select-none transition-all duration-200 \${
          isKeyboardOpen
            ? 'translate-y-full opacity-0 pointer-events-none'
            : isFocusDimmed ? 'translate-y-0 opacity-15 hover:opacity-100 transition-opacity duration-700' : 'translate-y-0 opacity-100'
        }\`}
      >
        {/* 1. Nút Tập trung */}
        <button
          type="button"
          data-testid="dock-btn-timer"
          aria-label="Tập trung"
          aria-current={activeMobileTab === 'timer' ? 'page' : undefined}
          aria-pressed={widgets.timer?.isOpen ?? false}
          onClick={() => handleNavClick('timer')}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={\`flex-1 flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all \${
            activeMobileTab === 'timer'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }\`}
        >
          <Timer size={20} strokeWidth={activeMobileTab === 'timer' ? 2.2 : 1.75} className={activeMobileTab === 'timer' ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] whitespace-nowrap">Tập trung</span>
        </button>

        {/* 2. Nút Kế hoạch */}
        <button
          type="button"
          data-testid="dock-btn-tasks"
          aria-label="Kế hoạch"
          aria-current={activeMobileTab === 'tasks' || activeMobileTab === 'notes' ? 'page' : undefined}
          aria-pressed={widgets.tasks?.isOpen ?? false}
          onClick={() => handleNavClick('tasks')}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={\`flex-1 flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all \${
            activeMobileTab === 'tasks' || activeMobileTab === 'notes'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }\`}
        >
          <ClipboardList size={20} strokeWidth={activeMobileTab === 'tasks' || activeMobileTab === 'notes' ? 2.2 : 1.75} className={activeMobileTab === 'tasks' || activeMobileTab === 'notes' ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] whitespace-nowrap">Kế hoạch</span>
        </button>

        {/* 3. Nút Không gian */}
        <button
          type="button"
          data-testid="dock-btn-sounds"
          aria-label="Không gian"
          aria-current={activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media' ? 'page' : undefined}
          aria-pressed={widgets.sounds?.isOpen ?? false}
          onClick={() => handleNavClick('sounds')}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={\`flex-1 flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all \${
            activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }\`}
        >
          <Headphones size={20} strokeWidth={activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media' ? 2.2 : 1.75} className={activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media' ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] whitespace-nowrap">Không gian</span>
        </button>

        {/* 4. Nút Trợ lý AI */}
        <button
          type="button"
          data-testid="mobile-btn-ai"
          aria-label="Trợ lý AI"
          aria-current={isAiOpen ? 'page' : undefined}
          aria-pressed={isAiOpen}
          onClick={() => useAiStore.getState().toggleOpen()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={\`flex-1 flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all \${
            isAiOpen
              ? 'text-cyan-300 font-semibold'
              : 'text-zinc-400 hover:text-cyan-300'
          }\`}
        >
          <Sparkles size={20} strokeWidth={isAiOpen ? 2.2 : 1.75} className={isAiOpen ? 'text-cyan-300' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] whitespace-nowrap">Trợ lý AI</span>
        </button>
      </nav>`;

navContent = navContent.replace(oldNavRegex, newNav);
fs.writeFileSync(mobileNavPath, navContent, 'utf8');
console.log('Updated MobileBottomNav.tsx successfully!');
