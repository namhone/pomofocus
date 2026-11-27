import '../styles/satellitePages.css';
import React, { useState } from 'react';
import { useRouter } from '../services/router';
import { MobileSubViewLayout } from './mobile/MobileSubViewLayout';
import {
  Mail,
  HelpCircle,
  Send,
  MessageSquare,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  CheckCircle2
} from 'lucide-react';

export const ContactView: React.FC = () => {
  const router = useRouter();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'support',
    message: ''
  });

  const emailContact = 'support@pomofocus.vn';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailContact);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    const subject = encodeURIComponent(`[PomoFocus] ${formData.topic}`);
    const body = encodeURIComponent(`${formData.name} <${formData.email}>\n\n${formData.message}`);
    window.location.href = `mailto:${emailContact}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <MobileSubViewLayout
      title="Liên hệ & hỗ trợ"
      subtitle="Hòm thư tiếp nhận 24/7"
      onBack={() => router.navigate('/app')}
      className="selection:bg-white selection:text-black"
    >
      <div
        data-testid="contact-view"
        className="satellite-content w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12 md:py-16 space-y-10"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium">
            <MessageSquare size={13} className="text-zinc-300" />
            <span>Liên hệ trực tiếp đội ngũ phát triển</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#ECEFF4]">
            Chúng tôi luôn lắng nghe bạn
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Bạn có câu hỏi, góp ý tính năng hoặc cần hỗ trợ tài khoản và gói PRO? Hãy liên hệ qua các kênh chính thức dưới đây.
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
                <h2 className="text-base font-bold text-white mb-1">Hòm thư hỗ trợ kỹ thuật</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Phản hồi trong vòng 24 giờ cho mọi yêu cầu, góp ý hoặc báo cáo bảo mật.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2 font-mono text-xs text-zinc-200">
                <a
                  href={`mailto:${emailContact}`}
                  className="inline-flex items-center min-h-[44px] min-w-[44px] hover:text-zinc-300 transition break-all"
                  title="Nhấn để gửi email"
                >
                  {emailContact}
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:text-white text-zinc-400 transition cursor-pointer shrink-0"
                  title="Sao chép email"
                  aria-label="Sao chép vào bộ nhớ tạm"
                >
                  {copiedEmail ? <Check size={14} className="text-zinc-300" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-400">
              <Clock size={13} className="shrink-0" />
              <span>Tiếp nhận thư điện tử 24/7</span>
            </div>
          </div>

          {/* Card 2: Online Support & Community */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <HelpCircle size={20} className="text-zinc-300" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white mb-1">Cổng trợ giúp & cộng đồng</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Soạn yêu cầu bằng biểu mẫu bên dưới, sau đó gửi từ ứng dụng email của bạn.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2 text-xs text-zinc-200">
                <span className="text-zinc-300 font-medium">Hỗ trợ trực tuyến 24/7</span>
                <span className="text-zinc-400 text-[11px]">Phản hồi &lt; 24h</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck size={13} className="shrink-0 text-zinc-300" />
              <span>Kênh hỗ trợ chính thức bảo mật</span>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-bold text-white">Gửi thông điệp trực tuyến</h2>
            <p className="text-xs text-zinc-400">
              Biểu mẫu mở ứng dụng email với nội dung đã điền. Bạn cần nhấn gửi trong ứng dụng email để hoàn tất.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 rounded-xl border border-zinc-500/30 bg-zinc-950/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-700/20 text-zinc-300 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-base font-bold text-white">Nội dung email đã sẵn sàng</h2>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                Hãy hoàn tất gửi trong ứng dụng email. Nếu ứng dụng email chưa mở, bạn có thể gửi trực tiếp tới support@pomofocus.vn; trang này chưa xác nhận thư đã được gửi.
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
                  <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Địa chỉ email *
                  </label>
                  <input
                    id="contact-email"
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
                <label htmlFor="contact-topic" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Chủ đề
                </label>
                <select id="contact-topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                >
                  <option value="support">Hỗ trợ kỹ thuật & lỗi ứng dụng</option>
                  <option value="feature">Góp ý & đề xuất tính năng mới</option>
                  <option value="beta_pro">Kích hoạt & gia hạn gói PRO</option>
                  <option value="cooperation">Hợp tác & góp vốn phát triển</option>
                  <option value="other">Chủ đề khác</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nội dung tin nhắn *
                </label>
                <textarea id="contact-message"
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
                  className="px-6 py-2.5 min-h-[44px] rounded-xl bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] font-semibold text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send size={13} />
                  <span>Gửi thông điệp</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </MobileSubViewLayout>
  );
};
