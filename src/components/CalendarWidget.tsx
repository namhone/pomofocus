import React from 'react';
import { Calendar as CalendarIcon, Info, Clock, AlertCircle } from 'lucide-react';

interface CalendarWidgetProps {
  onClose?: () => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = () => {
  return (
    <div
      data-testid="calendar-widget"
      className="flex h-full w-full flex-col justify-between p-6 text-slate-100"
    >
      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Lịch Biểu & Sự Kiện</h3>
              <p className="text-xs text-slate-400">Đồng bộ lịch công việc hàng ngày</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Sắp ra mắt
          </span>
        </div>

        {/* Informative placeholder content */}
        <div className="mt-8 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center text-indigo-400/80 mb-4 shadow-inner">
            <Clock size={32} />
          </div>

          <h4 className="text-sm font-semibold text-slate-200 mb-1">
            Chưa có sự kiện nào được liên kết
          </h4>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
            Module Google Calendar (OAuth 2.0 PKCE phía Client) được lên kế hoạch triển khai ở giai đoạn kế tiếp theo PRD. Hệ thống hiện không tạo sự kiện giả lập để đảm bảo tính toàn vẹn dữ liệu.
          </p>

          <div className="w-full rounded-xl bg-slate-900/60 border border-slate-800 p-3.5 text-left flex items-start gap-3">
            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-medium text-slate-200">Đặc tả kỹ thuật dự kiến:</p>
              <p className="text-slate-400">
                • Đọc lịch sự kiện trong ngày qua Google Calendar API.
              </p>
              <p className="text-slate-400">
                • Kéo thả sự kiện vào Pomodoro để tạo phiên tập trung trực tiếp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer status */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <AlertCircle size={13} className="text-slate-400" /> Trạng thái: Placeholder
        </span>
        <span>Version 0.1</span>
      </div>
    </div>
  );
};
