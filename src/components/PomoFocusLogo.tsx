import React from 'react';

interface PomoFocusLogoProps {
  size?: number;
  showWordmark?: boolean;
  showSubtitle?: boolean;
  wordmarkClassName?: string;
  className?: string;
  withContainer?: boolean;
}

export const PomoFocusLogo: React.FC<PomoFocusLogoProps> = ({
  size = 28,
  showWordmark = false,
  showSubtitle = false,
  wordmarkClassName = 'text-sm font-bold tracking-tight',
  className = '',
  withContainer = true
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon SVG biểu tượng đồng hồ chữ P */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        {withContainer && (
          <>
            <defs>
              <linearGradient id="pomoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#161618" />
                <stop offset="100%" stopColor="#0A0A0C" />
              </linearGradient>
            </defs>
            <rect x="8" y="8" width="984" height="984" rx="232" ry="232" fill="url(#pomoBgGrad)" />
          </>
        )}

        {/* Nhóm biểu tượng đồng hồ chữ P */}
        <g fill="#FFFFFF">
          {/* Nút bấm trên đỉnh đồng hồ (Crown) */}
          <rect x="440" y="143" width="120" height="56" rx="16" ry="16" />
          {/* Cổ nối nút bấm */}
          <rect x="473" y="190" width="54" height="50" />

          {/* Chân chữ P (Nét sổ dọc bên trái) */}
          <rect x="283.5" y="650" width="54" height="202" />

          {/* Vòng tròn thân đồng hồ (Bụng chữ P) */}
          <circle cx="500" cy="498" r="243" fill="none" stroke="#FFFFFF" strokeWidth="54" />

          {/* 4 vạch chỉ giờ (12h, 6h, 9h, 3h) */}
          <rect x="491" y="302" width="18" height="48" rx="9" ry="9" />
          <rect x="491" y="648" width="18" height="48" rx="9" ry="9" />
          <rect x="304" y="489" width="48" height="18" rx="9" ry="9" />
          <rect x="648" y="489" width="48" height="18" rx="9" ry="9" />
        </g>

        {/* Kim đồng hồ và trục giữa */}
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <line x1="482" y1="485" x2="404" y2="428" strokeWidth="18" />
          <line x1="516" y1="483" x2="625" y2="381" strokeWidth="15" />
          <circle cx="500" cy="498" r="19.5" fill="#111113" strokeWidth="18" />
        </g>
      </svg>

      {/* Tên thương hiệu PomoFocus & Phụ đề Study Workspace */}
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className={`text-white font-bold tracking-tight ${wordmarkClassName}`}>
            PomoFocus
          </span>
          {showSubtitle && (
            <span className="text-[9px] font-semibold tracking-[0.25em] text-zinc-400 uppercase mt-0.5">
              STUDY WORKSPACE
            </span>
          )}
        </div>
      )}
    </div>
  );
};
