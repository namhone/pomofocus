import React, { useState } from 'react';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Mail,
  Phone,
  Send,
  MessageSquare,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  CheckCircle2
} from 'lucide-react';

export const ContactView: React.FC = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'support',
    message: ''
  });

  const emailContact = 'namho03052k9@gmail.com';
  const phoneContact = '0704862629';
  const displayPhone = '0704 862 629';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailContact);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneContact);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div
      data-testid="contact-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12 md:py-16 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium">
            <MessageSquare size={13} className="text-emerald-400" />
            <span>Liên Hệ Trực Tiếp Đội Ngũ Phát Triển</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Chúng Tôi Luôn Lắng Nghe Bạn
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Bạn có câu hỏi, ý kiến đóng góp tính năng hoặc cần hỗ trợ tài khoản PRO trong giai đoạn Demo Beta? Hãy liên hệ qua các kênh chính thức dưới đây.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Email */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Hòm Thư Hỗ Trợ Kỹ Thuật</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Phản hồi trong vòng 24 giờ cho mọi yêu cầu, góp ý hoặc báo cáo bảo mật.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2 font-mono text-xs text-zinc-200">
                <a
                  href={`mailto:${emailContact}`}
                  className="hover:text-emerald-400 transition truncate"
                  title="Nhấn để gửi email"
                >
                  {emailContact}
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1.5 hover:text-white text-zinc-400 transition cursor-pointer shrink-0"
                  title="Sao chép email"
                >
                  {copiedEmail ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-500">
              <Clock size={13} className="shrink-0" />
              <span>Tiếp nhận thư điện tử 24/7</span>
            </div>
          </div>

          {/* Card 2: Hotline */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Hotline & Zalo Trực Tiếp</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Liên hệ trực tiếp với người quản trị dự án (Hồ Ngọc Bảo Nam) cho các trường hợp khẩn cấp.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2 font-mono text-xs text-zinc-200">
                <a
                  href={`tel:${phoneContact}`}
                  className="hover:text-emerald-400 transition whitespace-nowrap"
                  title="Nhấn để gọi"
                >
                  {displayPhone}
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1.5 hover:text-white text-zinc-400 transition cursor-pointer shrink-0"
                  title="Sao chép số điện thoại"
                >
                  {copiedPhone ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-500">
              <ShieldCheck size={13} className="shrink-0 text-emerald-400" />
              <span>Zalo & Hotline chính thức bảo mật</span>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-bold text-white">Gửi Thông Điệp Trực Tuyến</h2>
            <p className="text-xs text-zinc-400">
              Điền thông tin của bạn vào biểu mẫu bên dưới, chúng tôi sẽ xử lý và liên hệ lại sớm nhất.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Cảm Ơn Bạn Đã Gửi Phản Hồi!</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                Chúng tôi đã nhận được thông điệp của bạn. Đội ngũ phát triển PomoFocus sẽ xem xét và phản hồi trong thời gian sớm nhất.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-3 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition cursor-pointer"
              >
                Gửi phản hồi khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Địa chỉ Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Chủ Đề
                </label>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                >
                  <option value="support">Hỗ trợ kỹ thuật & Lỗi ứng dụng</option>
                  <option value="feature">Góp ý & Đề xuất tính năng mới</option>
                  <option value="beta_pro">Kích hoạt & Gia hạn gói PRO Beta</option>
                  <option value="cooperation">Hợp tác & Góp vốn phát triển</option>
                  <option value="other">Chủ đề khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nội Dung Tin Nhắn *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Hãy chia sẻ chi tiết nội dung bạn muốn gửi..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send size={13} />
                  <span>Gửi Thông Điệp</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
