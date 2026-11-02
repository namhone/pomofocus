import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  Smartphone,
  LogOut,
  Info,
  User,
  Database,
  CreditCard,
  Trash2,
  AlertTriangle,
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { maskPhoneNumber } from '../services/smsSecurityService';

export const AccountSecurityView: React.FC = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    changePassword,
    logout,
    deleteAccount,
    signOutOtherDevices,
    sendSmsOtp,
    verifyAndLinkPhone,
    unlinkPhone,
    toggleTwoFactor
  } = useAuthStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SMS 2FA & Phone State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [demoCodeNotice, setDemoCodeNotice] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Danger Zone - Xóa tài khoản
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
        <PlatformHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center space-y-5">
            <h1 className="text-xl font-bold text-white">Yêu Cầu Đăng Nhập</h1>
            <p className="text-xs text-zinc-400">
              Vui lòng đăng nhập để xem và quản lý thiết lập bảo mật tài khoản.
            </p>
            <button
              type="button"
              onClick={() => router.navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs cursor-pointer"
            >
              Đăng Nhập Ngay
            </button>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  const isGoogleAccount = user.authProvider === 'google';
  const hasLinkedPhone = Boolean(user.phoneNumber && user.phoneVerified);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setIsChangingPass(true);
    const success = await changePassword(oldPassword, newPassword);
    setIsChangingPass(false);

    if (success) {
      setStatusMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMessage(null), 5000);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ.'
      });
    }
  };

  const handleSignOutOtherDevices = async () => {
    setIsSigningOutOthers(true);
    const res = await signOutOtherDevices();
    setIsSigningOutOthers(false);
    setStatusMessage({ type: 'success', text: res.message });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPhoneError(null);
    setIsSendingOtp(true);
    const res = await sendSmsOtp(phoneInput);
    setIsSendingOtp(false);
    if (!res.success) {
      setPhoneError(res.message);
      if (res.cooldownSeconds) setOtpCooldown(res.cooldownSeconds);
      return;
    }
    setOtpStep('otp');
    setOtpCooldown(res.cooldownSeconds || 60);
    if (res.demoCode) {
      setDemoCodeNotice(res.demoCode);
    }
    setStatusMessage({ type: 'success', text: res.message });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setIsVerifyingOtp(true);
    const res = await verifyAndLinkPhone(phoneInput, otpInput);
    setIsVerifyingOtp(false);
    if (!res.success) {
      setPhoneError(res.message);
      return;
    }
    setShowPhoneModal(false);
    setPhoneInput('');
    setOtpInput('');
    setOtpStep('phone');
    setDemoCodeNotice(null);
    setStatusMessage({ type: 'success', text: res.message });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleToggle2Fa = async () => {
    const nextState = !user.twoFactorEnabled;
    const res = await toggleTwoFactor(nextState);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleConfirmUnlink = async () => {
    setIsUnlinking(true);
    const res = await unlinkPhone();
    setIsUnlinking(false);
    setShowUnlinkModal(false);
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== 'XOA TAI KHOAN') return;

    setIsDeletingAccount(true);
    const success = await deleteAccount();
    setIsDeletingAccount(false);

    if (success) {
      setShowDeleteModal(false);
      alert('Tài khoản và toàn bộ dữ liệu của bạn đã được xóa sạch vĩnh viễn theo chuẩn bảo mật GDPR.');
      router.navigate('/');
    } else {
      alert('Lỗi khi xóa tài khoản. Vui lòng thử lại.');
    }
  };

  return (
    <div
      data-testid="account-security-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-6">
        {/* Sub-nav Tabs: Hồ Sơ | Bảo Mật | Gói Cước | Quyền Riêng Tư */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              data-testid="nav-tab-profile"
              onClick={() => router.navigate('/profile')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <User size={13} className="text-emerald-400" />
              <span>Hồ Sơ Cá Nhân</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-medium shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Shield size={13} className="text-amber-400" />
              <span>Bảo Mật</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-billing"
              onClick={() => router.navigate('/billing')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={13} className="text-cyan-400" />
              <span>Gói Cước</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-privacy"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-sky-400" />
              <span>Quyền Riêng Tư</span>
            </button>
          </div>

          <span className="text-xs text-zinc-500 font-mono hidden sm:inline-block">
            ID: {user.id.slice(0, 12)}...
          </span>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-emerald-400 shrink-0" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Trung Tâm Bảo Mật Tài Khoản
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Kiểm tra phương thức xác thực đã liên kết, kích hoạt xác thực 2 bước (SMS 2FA) và quản lý phiên đăng nhập.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 shadow-sm ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MỤC MỚI: XÁC THỰC 2 LỚP & LIÊN KẾT SMS (SMS 2FA SECURITY)                */}
        {/* ========================================================================= */}
        <div data-testid="sms-security-card" className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <MessageSquare size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Xác Thực 2 Bước &amp; Liên Kết Số Điện Thoại (SMS 2FA)</h2>
                <div className="text-[11px] text-zinc-400">Tăng cường lớp bảo vệ thứ hai cho tài khoản qua mã xác minh OTP.</div>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${
                hasLinkedPhone
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {hasLinkedPhone ? 'ĐÃ LIÊN KẾT SỐ' : 'CHƯA LIÊN KẾT'}
            </span>
          </div>

          {hasLinkedPhone ? (
            /* Trạng thái đã liên kết số điện thoại */
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-sm tracking-wider">{maskPhoneNumber(user.phoneNumber)}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono">
                        XÁC MINH SMS HOÀN TẤT
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Số điện thoại dùng để nhận mã OTP khi đăng nhập từ thiết bị lạ.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-change-phone"
                    onClick={() => {
                      setPhoneInput('');
                      setOtpInput('');
                      setOtpStep('phone');
                      setPhoneError(null);
                      setDemoCodeNotice(null);
                      setShowPhoneModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    Đổi Số Khác
                  </button>
                  <button
                    type="button"
                    data-testid="btn-unlink-phone"
                    onClick={() => setShowUnlinkModal(true)}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition cursor-pointer"
                  >
                    Hủy Liên Kết
                  </button>
                </div>
              </div>

              {/* Toggle switch 2FA SMS */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className={user.twoFactorEnabled ? 'text-emerald-400' : 'text-zinc-500'} />
                  <div>
                    <div className="text-xs font-semibold text-white">Kích Hoạt Bảo Vệ Đăng Nhập 2FA (SMS OTP)</div>
                    <div className="text-[11px] text-zinc-400">
                      {user.twoFactorEnabled
                        ? 'Đang bật: Bắt buộc nhập mã OTP gửi về SMS khi đăng nhập thiết bị mới.'
                        : 'Đang tắt: Không yêu cầu mã OTP khi đăng nhập.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="toggle-two-factor"
                  onClick={handleToggle2Fa}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    user.twoFactorEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      user.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
            /* Trạng thái chưa liên kết số điện thoại */
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="font-semibold text-white">Chưa Liên Kết Số Điện Thoại Bảo Vệ</div>
                  <div className="text-[11px] text-zinc-400">
                    Liên kết số điện thoại để nhận mã OTP SMS khi đăng nhập và ngăn chặn truy cập trái phép.
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-open-link-phone"
                onClick={() => {
                  setPhoneInput('');
                  setOtpInput('');
                  setOtpStep('phone');
                  setPhoneError(null);
                  setDemoCodeNotice(null);
                  setShowPhoneModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer shrink-0 shadow"
              >
                Liên Kết Số &amp; Bật 2FA
              </button>
            </div>
          )}
        </div>

        {/* Identity & Linked Providers */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <h2 className="text-sm font-semibold text-white">Phương Thức Xác Thực Đã Liên Kết</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black text-sm shrink-0">
                  G
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">Google OAuth 2.0</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {isGoogleAccount
                      ? `Đã liên kết với Google ID (${user.googleId || 'Verified'})`
                      : 'Chưa liên kết tài khoản Google'}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${
                  isGoogleAccount
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {isGoogleAccount ? 'ĐÃ KẾT NỐI' : 'CHƯA LIÊN KẾT'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                  <Key size={16} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">Mật Khẩu Cá Nhân</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {isGoogleAccount
                      ? 'Đăng nhập trực tiếp bằng Google (không dùng mật khẩu cục bộ)'
                      : 'Đang bảo vệ tài khoản bằng mật khẩu cục bộ đã băm SHA-256'}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0 whitespace-nowrap">
                {isGoogleAccount ? 'TÙY CHỌN' : 'HOẠT ĐỘNG'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2 leading-relaxed">
            <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
            <span>
              <strong>Bảo mật tài khoản đa nền tảng:</strong> Bạn có thể sử dụng phương thức đăng nhập Google một chạm, mật khẩu hoặc số điện thoại OTP để bảo vệ dữ liệu.
            </span>
          </div>
        </div>

        {/* Change Password Form (Dành cho tài khoản email/mật khẩu) */}
        {!isGoogleAccount && (
          <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock size={16} className="text-zinc-400 shrink-0" />
              <span>Đổi Mật Khẩu An Toàn</span>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Mật Khẩu Hiện Tại
                </label>
                <input
                  type="password"
                  data-testid="input-old-password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-white transition"
                  placeholder="Nhập mật khẩu cũ của bạn..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">
                    Mật Khẩu Mới (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    data-testid="input-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-white transition"
                    placeholder="Mật khẩu mới an toàn..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">
                    Xác Nhận Mật Khẩu Mới
                  </label>
                  <input
                    type="password"
                    data-testid="input-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-white transition"
                    placeholder="Nhập lại mật khẩu mới..."
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  data-testid="btn-submit-change-password"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition cursor-pointer shadow-md"
                >
                  {isChangingPass ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quản lý phiên đăng nhập (Session Security) */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe size={16} className="text-zinc-400 shrink-0" />
              <span className="whitespace-nowrap">Quản Lý Phiên Đăng Nhập (Session Security)</span>
            </h2>
            <button
              type="button"
              onClick={logout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              <LogOut size={13} />
              <span>Đăng Xuất Phiên Này</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <Smartphone size={16} className="text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                  <span>Thiết bị đang sử dụng</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    Active Session
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono break-all line-clamp-1 max-w-sm">
                  {typeof navigator !== 'undefined' ? navigator.userAgent : 'Client Session'}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-mono sm:text-right shrink-0 whitespace-nowrap">
              Phiên bảo mật cục bộ
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-200">Đăng xuất khỏi tất cả các thiết bị khác</div>
              <div className="text-[11px] text-zinc-400">Vô hiệu hóa phiên đăng nhập trên các máy tính lạ, điện thoại hoặc quán cafe khác.</div>
            </div>
            <button
              type="button"
              data-testid="btn-signout-others"
              disabled={isSigningOutOthers}
              onClick={handleSignOutOtherDevices}
              className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isSigningOutOthers ? 'Đang xử lý...' : 'Đăng Xuất Thiết Bị Khác'}
            </button>
          </div>
        </div>

        {/* Vùng Nguy Hiểm (Danger Zone) */}
        <div className="p-5 sm:p-7 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle size={18} />
            <h2 className="text-sm font-bold text-white">Vùng Nguy Hiểm (Danger Zone)</h2>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Sau khi xóa tài khoản, toàn bộ thông tin cá nhân, hồ sơ học tập, ghi chú, danh sách nhiệm vụ và quyền lợi gói cước sẽ bị xóa sạch vĩnh viễn khỏi hệ thống theo chuẩn quyền riêng tư GDPR.
          </p>

          <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-rose-300 font-medium">
              Hành động này không thể hoàn tác sau khi đã thực hiện.
            </div>
            <button
              type="button"
              data-testid="btn-open-delete-account"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 size={13} />
              <span>Xóa Tài Khoản Vĩnh Viễn</span>
            </button>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: LIÊN KẾT SỐ ĐIỆN THOẠI & NHẬP MÃ OTP SMS                        */}
      {/* ========================================================================= */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Smartphone size={18} />
                <span>Liên Kết Số Điện Thoại &amp; Bật SMS 2FA</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneError(null);
                  setDemoCodeNotice(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            {phoneError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{phoneError}</span>
              </div>
            )}

            {/* Thông báo mã Demo/Sandbox */}
            {demoCodeNotice && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <CheckCircle2 size={14} className="text-amber-400" />
                  <span>Tin nhắn SMS mô phỏng đã đến:</span>
                </div>
                <div className="font-mono text-sm tracking-widest text-white bg-black/40 p-1.5 rounded-lg text-center">
                  Mã OTP: <strong>{demoCodeNotice}</strong>
                </div>
              </div>
            )}

            {otpStep === 'phone' ? (
              /* Bước 1: Nhập số điện thoại */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Nhập số điện thoại di động của bạn để nhận mã xác minh OTP qua tin nhắn SMS:
                </p>

                <div>
                  <label className="block text-zinc-300 text-xs font-medium mb-1.5">
                    Số Điện Thoại (Việt Nam)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                      +84
                    </span>
                    <input
                      type="tel"
                      autoFocus
                      data-testid="input-phone-number"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="0987654321..."
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-400 transition"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Hỗ trợ các nhà mạng Viettel, Vinaphone, Mobifone, Vietnamobile, Wintel...
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-send-sms-otp"
                    disabled={isSendingOtp}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isSendingOtp ? 'Đang gửi...' : 'Gửi Mã Xác Minh OTP'}
                  </button>
                </div>
              </form>
            ) : (
              /* Bước 2: Nhập mã OTP 6 số */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Mã OTP gồm 6 chữ số đã được gửi tới số <strong>{maskPhoneNumber(phoneInput)}</strong>. Vui lòng nhập mã để hoàn tất:
                </p>

                <div>
                  <label className="block text-zinc-300 text-xs font-medium mb-1.5">
                    Mã Xác Thực OTP (6 chữ số)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    data-testid="input-sms-otp"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-emerald-400 transition"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('phone');
                      setOtpInput('');
                    }}
                    className="text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    ← Đổi số khác
                  </button>

                  <button
                    type="button"
                    disabled={otpCooldown > 0 || isSendingOtp}
                    onClick={() => handleSendOtp()}
                    className="text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>{otpCooldown > 0 ? `Gửi lại sau ${otpCooldown}s` : 'Gửi lại mã'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-verify-sms-otp"
                    disabled={otpInput.length !== 6 || isVerifyingOtp}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isVerifyingOtp ? 'Đang kiểm tra...' : 'Xác Nhận & Kích Hoạt 2FA'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: XÁC NHẬN HỦY LIÊN KẾT SỐ ĐIỆN THOẠI                            */}
      {/* ========================================================================= */}
      {showUnlinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Hủy Liên Kết Số Điện Thoại</span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Bạn có chắc chắn muốn hủy liên kết số <strong>{maskPhoneNumber(user.phoneNumber)}</strong>? Tính năng xác thực 2 bước (SMS 2FA) sẽ tự động bị tắt.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowUnlinkModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Giữ Lại
              </button>
              <button
                type="button"
                data-testid="btn-confirm-unlink"
                disabled={isUnlinking}
                onClick={handleConfirmUnlink}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                {isUnlinking ? 'Đang hủy...' : 'Xác Nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA TÀI KHOẢN VĨNH VIỄN (GDPR)                         */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-rose-500/40 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>CẢNH BÁO: XÓA TÀI KHOẢN VĨNH VIỄN</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Bạn đang chuẩn bị xóa tài khoản <strong>{user.email}</strong>. Mọi dữ liệu nhiệm vụ, ghi chú IndexedDB và phiên đăng nhập sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
            </p>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-200 text-xs">
              Để xác nhận xóa, vui lòng nhập chính xác cụm từ: <strong className="font-mono text-white select-all">XOA TAI KHOAN</strong>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                data-testid="input-confirm-delete-phrase"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Gõ 'XOA TAI KHOAN' vào đây..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-zinc-950 text-white text-xs font-mono tracking-wider focus:outline-none focus:border-rose-400 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-account"
                disabled={deleteConfirmationText.trim() !== 'XOA TAI KHOAN' || isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {isDeletingAccount ? 'Đang xóa...' : 'Xác Nhận Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SharedFooter />
    </div>
  );
};
