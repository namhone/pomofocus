import { Zap, Crown, Lock, FileText, Sparkles, Flame, Heart, Coffee, BookOpen, Hand, Lightbulb, Target, Monitor, Smartphone, AlertTriangle, User, Rocket, Timer, Flower2, Plus, LogOut, PartyPopper, CircleDot, CloudRain, Building2, Snowflake, Clipboard } from 'lucide-react';

/** Keeps legacy reaction wire values while rendering monochrome, accessible symbols. */
export function UiSymbol({ name, className = '' }: { name: string; className?: string }) {
  const symbols: Record<string, [typeof Zap, string]> = {
    '⚡': [Zap, 'Điểm AI'], '👑': [Crown, 'Đặc quyền'], '🔒': [Lock, 'Khóa'], '📝': [FileText, 'Ghi chú'],
    '✨': [Sparkles, 'Nổi bật'], '⭐': [Sparkles, 'Đặc quyền'], '🔥': [Flame, 'Cố lên'], '❤️': [Heart, 'Yêu thích'],
    '💖': [Heart, 'Yêu thích'], '💕': [Heart, 'Yêu thích'], '💗': [Heart, 'Yêu thích'], '💞': [Heart, 'Yêu thích'], '🥰': [Heart, 'Yêu thích'],
    '☕': [Coffee, 'Nghỉ ngơi'], '📚': [BookOpen, 'Học tập'], '👏': [Hand, 'Hoan hô'], '💡': [Lightbulb, 'Gợi ý'],
    '🎯': [Target, 'Mục tiêu'], '💻': [Monitor, 'Máy tính'], '📱': [Smartphone, 'Điện thoại'], '⚠️': [AlertTriangle, 'Lưu ý'],
    '👤': [User, 'Cá nhân'], '🚀': [Rocket, 'Nâng cấp'], '🍅': [Timer, 'Phiên tập trung'], '🌸': [Flower2, 'Thư giãn'],
    '⏱️': [Timer, 'Đồng bộ thời gian'], '➕': [Plus, 'Thêm'], '🚪': [LogOut, 'Rời phòng'], '🎉': [PartyPopper, 'Thành công'],
    '🟢': [CircleDot, 'Đang hoạt động'], '🌧️': [CloudRain, 'Mưa'], '🌆': [Building2, 'Thành phố'], '❄️': [Snowflake, 'Tuyết'], '📋': [Clipboard, 'Sao chép']
  };
  const [Icon, label] = symbols[name] || [Sparkles, 'Biểu tượng'];
  return <Icon strokeWidth={1.5} role="img" aria-label={label} className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.12em] ${className}`} />;
}

/** Formats existing account labels without changing stored profile or entitlement values. */
export function UiLabel({ text = '' }: { text?: string }) {
  const label = text.replace(/PRO TRỌN ĐỜI/g, 'Pro trọn đời').replace(/PRO YEARLY/g, 'Pro năm').replace(/PRO MONTHLY/g, 'Pro tháng').replace(/NÓC NHÀ PRO/g, 'Thành viên đặc biệt').replace(/MASTER ADMIN/g, 'Quản trị viên');
  return <>{label.split(/(\p{Extended_Pictographic}\uFE0F?)/u).map((part, index) => /^\p{Extended_Pictographic}/u.test(part) ? <UiSymbol key={index} name={part} /> : part)}</>;
}
