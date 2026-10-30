import React from 'react';

export const WidgetSkeleton: React.FC = () => (
  <div className="w-full h-full min-h-[200px] flex flex-col justify-between p-3.5 animate-pulse select-none">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-white/[0.08] rounded-md" />
        <div className="h-5 w-16 bg-white/[0.05] rounded-full" />
      </div>
      <div className="h-12 w-full bg-white/[0.04] rounded-xl border border-white/[0.04]" />
      <div className="space-y-2 pt-1">
        <div className="h-7 w-full bg-white/[0.03] rounded-lg" />
        <div className="h-7 w-5/6 bg-white/[0.03] rounded-lg" />
        <div className="h-7 w-4/6 bg-white/[0.03] rounded-lg" />
      </div>
    </div>
    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
      <div className="h-3 w-20 bg-white/[0.04] rounded" />
      <div className="h-6 w-16 bg-white/[0.06] rounded-md" />
    </div>
  </div>
);
