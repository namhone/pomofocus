# Mẫu Chuẩn: Apple Liquid Glass Dockbar (macOS Style Magnification)

Mẫu thiết kế thanh Dockbar lơ lửng phong cách macOS Liquid Glass được người dùng phê duyệt tuyệt đối cho PomoFocus `/app`.

---

## 1. Tính Năng & Vật Lý Chuyển Động
- **Thấu kính Liquid Glass**: Lớp nền kính mờ sâu `-webkit-backdrop-filter: blur(20px) saturate(150%)`, đổ bóng 2 lớp kết hợp viền ánh sáng phản chiếu specular vi mô (`.dock::before`).
- **Hiệu ứng Magnification (Phóng đại kế cận chuẩn macOS)**:
  - Icon đang hover: phóng đại cực đại `--max: 1.8` (scale 1.8).
  - Icon liền kề 1 nấc: phóng đại `1 + (max - 1) * 0.56` (scale 1.45).
  - Icon liền kề 2 nấc: khẽ nảy `1 + (max - 1) * 0.05` (scale 1.04).
  - Phản ứng khi nhấn (Active): nhấc bổng lên trên `translateY(-8px)`.
- **Tooltip Thủy Tinh (Glass Tooltip)**: Nổi lên phía trên 14px với hiệu ứng `scale(0.92) -> scale(1)` kết hợp `backdrop-filter: blur(18px)`.
- **Chấm Đèn Trạng Thái Đang Chạy (.dock__dot)**: Chấm sáng 3px tỏa hào quang trắng mờ dưới đáy icon khi thẻ tương ứng đang mở.
- **Responsive & Accessibility**: Tự động co tỷ lệ icon từ 64px xuống 56px (laptop), 48px (tablet), 40px (mobile); vô hiệu hóa chuyển động nếu bật `prefers-reduced-motion`.

---

## 2. Mã Nguồn Chi Tiết (React Component)

```tsx
import React from 'react';
import styled from 'styled-components';

export const AppleLiquidDock: React.FC<{
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}> = ({ activeTab = 'timer', onSelectTab }) => {
  return (
    <StyledDockWrapper>
      <div className="dock-stage">
        <div className="dock" role="toolbar" aria-label="PomoFocus dock navigation">
          <div className="dock__row">
            
            {/* Tab 1: Pomodoro Timer */}
            <label className="dock__item" onClick={() => onSelectTab?.('timer')}>
              <input type="radio" name="dock-nav" checked={activeTab === 'timer'} readOnly />
              <svg viewBox="0 0 64 64" role="img" aria-label="Timer">
                <defs>
                  <linearGradient id="dock-timer" x1={0} y1={0} x2={0} y2={1}>
                    <stop offset={0} stopColor="#34d399" />
                    <stop offset={1} stopColor="#059669" />
                  </linearGradient>
                </defs>
                <rect width={64} height={64} rx={14} fill="url(#dock-timer)" />
                <circle cx={32} cy={34} r={16} fill="none" stroke="#ffffff" strokeWidth={4} />
                <path d="M32 24v10l6 4" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
                <rect x={28} y={12} width={8} height={4} rx={1} fill="#ffffff" />
              </svg>
              <span className="dock__tooltip">Đồng Hồ (Timer)</span>
              <span className="dock__dot" />
            </label>

            {/* Tab 2: Task List */}
            <label className="dock__item" onClick={() => onSelectTab?.('tasks')}>
              <input type="radio" name="dock-nav" checked={activeTab === 'tasks'} readOnly />
              <svg viewBox="0 0 64 64" role="img" aria-label="Tasks">
                <defs>
                  <linearGradient id="dock-tasks" x1={0} y1={0} x2={0} y2={1}>
                    <stop offset={0} stopColor="#ffd86b" />
                    <stop offset={1} stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <rect width={64} height={64} rx={14} fill="url(#dock-tasks)" />
                <path d="M18 24h28M18 32h28M18 40h18" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
                <circle cx={13} cy={24} r={2} fill="#ffffff" />
                <circle cx={13} cy={32} r={2} fill="#ffffff" />
                <circle cx={13} cy={40} r={2} fill="#ffffff" />
              </svg>
              <span className="dock__tooltip">Công Việc (Tasks)</span>
              <span className="dock__dot" />
            </label>

            {/* Tab 3: Quick Notes */}
            <label className="dock__item" onClick={() => onSelectTab?.('notes')}>
              <input type="radio" name="dock-nav" checked={activeTab === 'notes'} readOnly />
              <svg viewBox="0 0 64 64" role="img" aria-label="Notes">
                <defs>
                  <linearGradient id="dock-notes" x1={0} y1={0} x2={0} y2={1}>
                    <stop offset={0} stopColor="#a78bfa" />
                    <stop offset={1} stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <rect width={64} height={64} rx={14} fill="url(#dock-notes)" />
                <path d="M20 18h24a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z" fill="#ffffff" opacity={0.2} />
                <path d="M22 26h20M22 34h14" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
              </svg>
              <span className="dock__tooltip">Ghi Chú (Notes)</span>
              <span className="dock__dot" />
            </label>

            {/* Tab 4: Ambient Sounds */}
            <label className="dock__item" onClick={() => onSelectTab?.('sounds')}>
              <input type="radio" name="dock-nav" checked={activeTab === 'sounds'} readOnly />
              <svg viewBox="0 0 64 64" role="img" aria-label="Sounds">
                <defs>
                  <linearGradient id="dock-sound" x1={0} y1={0} x2={0} y2={1}>
                    <stop offset={0} stopColor="#5ec8ff" />
                    <stop offset={1} stopColor="#2878f0" />
                  </linearGradient>
                </defs>
                <rect width={64} height={64} rx={14} fill="url(#dock-sound)" />
                <path d="M22 36v-8a6 6 0 0 1 12 0v8M28 20v-4" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
                <circle cx={20} cy={38} r={5} fill="#ffffff" />
                <circle cx={36} cy={38} r={5} fill="#ffffff" />
              </svg>
              <span className="dock__tooltip">Âm Thanh (Audio)</span>
              <span className="dock__dot" />
            </label>

            {/* Tab 5: AI Companion */}
            <label className="dock__item" onClick={() => onSelectTab?.('ai')}>
              <input type="radio" name="dock-nav" checked={activeTab === 'ai'} readOnly />
              <svg viewBox="0 0 64 64" role="img" aria-label="AI Companion">
                <defs>
                  <linearGradient id="dock-ai" x1={0} y1={0} x2={0} y2={1}>
                    <stop offset={0} stopColor="#f472b6" />
                    <stop offset={1} stopColor="#db2777" />
                  </linearGradient>
                </defs>
                <rect width={64} height={64} rx={14} fill="url(#dock-ai)" />
                <path d="M32 18l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#ffffff" />
              </svg>
              <span className="dock__tooltip">AI Trợ Lý (Study AI)</span>
              <span className="dock__dot" />
            </label>

          </div>
        </div>
      </div>
    </StyledDockWrapper>
  );
};

const StyledDockWrapper = styled.div`
  .dock-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    overflow: hidden;
    margin: 0;
  }

  .dock,
  .dock * {
    box-sizing: border-box;
  }

  .dock {
    --s: 60px;
    --max: 1.75;
    --gap: max(4px, calc(var(--s) * 0.08));
    --pad: max(8px, calc(var(--s) * 0.12));

    display: inline-flex;
    padding: var(--pad) calc(var(--pad) - var(--gap) / 2);

    background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.13),
        rgba(255, 255, 255, 0.05)
      ),
      rgba(30, 30, 35, 0.75);

    -webkit-backdrop-filter: blur(20px) saturate(150%);
    backdrop-filter: blur(20px) saturate(150%);

    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: max(16px, calc(var(--s) * 0.4));

    box-shadow:
      0 max(4px, calc(var(--s) * 0.1)) max(20px, calc(var(--s) * 0.4)) rgba(0, 0, 0, 0.4),
      0 max(2px, calc(var(--s) * 0.05)) max(8px, calc(var(--s) * 0.2)) rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.18),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);

    isolation: isolate;
  }

  .dock::before {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    height: 45%;
    border-radius: max(14px, calc(var(--s) * 0.38)) max(14px, calc(var(--s) * 0.38)) 45% 45%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0));
    pointer-events: none;
    z-index: -1;
  }

  .dock__row {
    display: flex;
    align-items: flex-end;
    height: var(--s);
    width: 100%;
  }

  .dock__item {
    --k: 1;
    --shadow-y: max(1px, calc(var(--s) * 0.03));
    --shadow-b: max(2px, calc(var(--s) * 0.06));

    position: relative;
    flex: none;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: calc(var(--s) * var(--k) + var(--gap));
    height: calc(var(--s) * var(--k));
    padding: 0 calc(var(--gap) / 2);
    cursor: pointer;
    z-index: 10;
    transform-origin: bottom center;
    transition:
      width 0.2s ease-out,
      height 0.2s ease-out,
      transform 0.2s ease-out;
  }

  .dock__item input {
    display: none;
  }

  .dock__item svg {
    display: block;
    width: 100%;
    height: 100%;
    padding: 8%;
    filter: drop-shadow(0 var(--shadow-y) var(--shadow-b) rgba(0, 0, 0, calc(0.2 + (var(--k) - 1) * 0.15)));
    transition: filter 0.2s ease-out;
  }

  .dock__item:hover {
    --k: var(--max);
    z-index: 18;
  }

  .dock__item:hover + .dock__item,
  .dock__item:has(+ .dock__item:hover) {
    --k: calc(1 + (var(--max) - 1) * 0.56);
    z-index: 15;
  }

  .dock__item:hover + .dock__item + .dock__item,
  .dock__item:has(+ .dock__item + .dock__item:hover) {
    --k: calc(1 + (var(--max) - 1) * 0.05);
  }

  .dock__item:active {
    transform: translateY(max(-8px, calc(var(--s) * -0.15)));
    transition-duration: 0.15s;
  }

  .dock__dot {
    display: none;
    position: absolute;
    bottom: max(-2px, calc(var(--s) * -0.05));
    left: 50%;
    transform: translateX(-50%);
    width: max(3px, calc(var(--s) * 0.06));
    height: max(3px, calc(var(--s) * 0.06));
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.75), 0 1px 3px rgba(0, 0, 0, 0.35);
  }

  .dock__item input:checked ~ .dock__dot {
    display: block;
  }

  .dock__tooltip {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 14px);
    min-width: max-content;
    transform: translateX(-50%) translateY(6px) scale(0.92);
    transform-origin: bottom center;
    padding: 7px 11px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)), rgba(20, 20, 25, 0.9);
    color: rgba(255, 255, 255, 0.97);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
    transition:
      opacity 160ms ease,
      visibility 160ms ease,
      transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    z-index: 100;
  }

  .dock__item:hover .dock__tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0) scale(1);
  }

  @media (max-width: 767px) {
    .dock {
      --s: 48px;
      --max: 1.4;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dock,
    .dock__item,
    .dock__item svg,
    .dock__tooltip {
      transition: none !important;
    }
  }
`;
```
