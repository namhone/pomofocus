import { Video, FileText, Calendar, BarChart3 } from 'lucide-react';
import { useRouter } from '../../../services/router';

export function MobileToolsView({ onOpenNotes }: { onOpenNotes: () => void }) {
  const router = useRouter();
  const tools = [
    { label: 'Meet', description: 'Cùng nhau tập trung', icon: Video, open: () => router.navigate('/rooms') },
    { label: 'Ghi chú', description: 'Giữ lại ý tưởng', icon: FileText, open: onOpenNotes },
    { label: 'Lịch', description: 'Sắp xếp thời gian', icon: Calendar, open: () => router.navigate('/calendar') },
    { label: 'Thống kê', description: 'Nhìn lại tiến độ', icon: BarChart3, open: () => router.navigate('/dashboard') }
  ];
  return (
    <section aria-labelledby="mobile-tools-title" className="h-full overflow-y-auto px-4 pt-4 pb-28">
      <h1 id="mobile-tools-title" className="pomo-glass rounded-2xl px-4 py-3 text-lg font-semibold mb-4">Tiện ích</h1>
      <div className="grid grid-cols-2 gap-3">
        {tools.map(({ label, description, icon: Icon, open }) => (
          <button key={label} type="button" onClick={open} className="pomo-glass rounded-2xl p-4 text-left min-h-32 active:scale-[0.98] touch-manipulation transition-transform">
            <Icon size={24} strokeWidth={1.5} className="mb-4 text-white" />
            <span className="block font-semibold text-white">{label}</span>
            <span className="block mt-1 text-xs text-zinc-200">{description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
