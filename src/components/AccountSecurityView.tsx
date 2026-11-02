import React, { useState } from 'react';
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
  QrCode,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { totpService } from '../services/totpService';

export const AccountSecurityView: React.FC = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    changePassword,
    logout,
    deleteAccount,
    signOutOtherDevices,
    enableTotp2Fa,
    disableTotp2Fa
  } = useAuthStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // TOTP 2FA (Google Authenticator / Authy) State
  const [showTotpSetupModal, setShowTotpSetupModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{
    secret: string;
    formattedSecret: string;
    otpauthUri: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [totpInputCode, setTotpInputCode] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);
  const [hasCopiedBackupCodes, setHasCopiedBackupCodes] = useState(false);

  // View Backup Codes & Disable 2FA modals
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [showDisable2FaModal, setShowDisable2FaModal] = useState(false);
  const [isDisabling2Fa, setIsDisabling2Fa] = useState(false);

  // Danger Zone - Xóa tài khoản
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
  const is2FaActive = Boolean(user.twoFactorEnabled);

  // Bắt đầu quy trình thiết lập TOTP 2FA thật
  const handleOpenTotpSetup = () => {
    setTotpError(null);
    setTotpInputCode('');
    setHasCopiedSecret(false);
    setHasCopiedBackupCodes(false);
    const setup = totpService.startSetup(user.email);
    setTotpSetupData(setup);
    setShowTotpSetupModal(true);
  };

  // Xác minh mã từ điện thoại thật và kích hoạt 2FA
  const handleConfirmTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSetupData) return;
    setTotpError(null);
    setIsVerifyingTotp(true);

    const res = await enableTotp2Fa(
      totpSetupData.secret,
      totpInputCode,
      totpSetupData.backupCodes
    );

    setIsVerifyingTotp(false);

    if (!res.success) {
      setTotpError(res.message);
      return;
    }

    setShowTotpSetupModal(false);
    setTotpInputCode('');
    setTotpSetupData(null);
    setStatusMessage({ type: 'success', text: res.message });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Tắt 2FA
  const handleConfirmDisable2Fa = async () => {
    setIsDisabling2Fa(true);
    const res = await disableTotp2Fa();
    setIsDisabling2Fa(false);
    setShowDisable2FaModal(false);

    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCopySecret = () => {
    if (!totpSetupData) return;
    navigator.clipboard.writeText(totpSetupData.secret);
    setHasCopiedSecret(true);
    setTimeout(() => setHasCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    setHasCopiedBackupCodes(true);
    setTimeout(() => setHasCopiedBackupCodes(false), 2000);
  };

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

  const savedBackupCodes = totpService.getBackupCodes(user.id);

  return (
    <div
      data-testid="account-security-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      {/* Main Container với khoảng đệm chuẩn pt-20 sm:pt-24 chống Header đè nội dung */}
      <main className="flex-1 w-full max-w-3xl mx-auto pt-20 sm:pt-24 pb-16 px-4 space-y-6">
        {/* Sub-nav Tabs: Hồ Sơ | Bảo Mật | Gói Cước | Quyền Riêng Tư */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              data-testid="nav-tab-profile"
              onClick={() => router.navigate('/profile')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <User size={13} className="text-zinc-400" />
              <span>Hồ Sơ Cá Nhân</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white font-medium border border-zinc-700 shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Shield size={13} className="text-zinc-200" />
              <span>Bảo Mật</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-billing"
              onClick={() => router.navigate('/billing')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={13} className="text-zinc-400" />
              <span>Gói Cước</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-privacy"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-zinc-400" />
              <span>Quyền Riêng Tư</span>
            </button>
          </div>

          <span className="text-xs text-zinc-500 font-mono hidden sm:inline-block">
            ID: {user.id.slice(0, 12)}...
          </span>
        </div>

        {/* Header Tiêu Đề Trang */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Shield size={20} className="text-zinc-200 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Trung Tâm Bảo Mật Tài Khoản
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Kiểm tra phương thức xác thực đã liên kết, kích hoạt ứng dụng bảo mật 2 bước (Google Authenticator / TOTP) và quản lý phiên đăng nhập an toàn.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 shadow-sm ${
              statusMessage.type === 'success'
                ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                : 'border-rose-900/40 bg-zinc-900 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MỤC 1: XÁC THỰC 2 BƯỚC THẬT 100% (GOOGLE AUTHENTICATOR / TOTP 2FA)       */}
        {/* ========================================================================= */}
        <div data-testid="totp-security-card" className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center border border-zinc-700">
                <QrCode size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Xác Thực 2 Bước (Authenticator App / TOTP 2FA)</h2>
                <div className="text-[11px] text-zinc-400">
                  Chuẩn bảo mật quốc tế tương thích Google Authenticator, Microsoft Authenticator, Authy, Apple Keychain.
                </div>
              </div>
            </div>

            <span
              className="border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  is2FaActive ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
              <span className="font-mono text-[11px]">
                {is2FaActive ? 'ĐÃ KÍCH HOẠT (BẢO MẬT CAO)' : 'CHƯA KÍCH HOẠT'}
              </span>
            </span>
          </div>

          {is2FaActive ? (
            /* Trạng thái ĐÃ KÍCH HOẠT 2FA */
            <div className="space-y-3 pt-1">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center border border-zinc-700 shrink-0">
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                      <span>Ứng Dụng Xác Thực (RFC 6238 TOTP)</span>
                      <span className="border border-zinc-800 bg-zinc-900/80 text-zinc-300 text-[10px] px-2 py-0.5 rounded font-mono">
                        Mã 6 số / 30s
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Bảo vệ tài khoản mỗi khi đăng nhập từ trình duyệt hoặc thiết bị mới.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {savedBackupCodes.length > 0 && (
                    <button
                      type="button"
                      data-testid="btn-view-backup-codes"
                      onClick={() => setShowBackupCodesModal(true)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
                    >
                      Mã Dự Phòng ({savedBackupCodes.length})
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="btn-disable-2fa"
                    onClick={() => setShowDisable2FaModal(true)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
                  >
                    Tắt 2FA
                  </button>
                </div>
              </div>

              {/* Stealth Monochrome Switch Trạng Thái */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-400">
                  Chế độ yêu cầu mã xác thực 2 bước đang bảo vệ tài khoản của bạn.
                </div>
                <button
                  type="button"
                  data-testid="toggle-totp-switch"
                  onClick={() => setShowDisable2FaModal(true)}
                  className="w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer bg-zinc-100 transition-colors duration-200 ease-in-out shrink-0"
                  title="Bấm để tắt 2FA"
                >
                  <div className="bg-zinc-950 w-5 h-5 rounded-full shadow-md transform translate-x-5 transition-transform duration-200 ease-in-out" />
                </button>
              </div>
            </div>
          ) : (
            /* Trạng thái CHƯA KÍCH HOẠT 2FA */
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-700 shrink-0">
                  <Smartphone size={16} />
                </div>
                <div>
                  <div className="font-semibold text-white">Chưa Thiết Lập Ứng Dụng Xác Thực 2 Bước</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Quét mã QR bằng ứng dụng Google Authenticator trên điện thoại để bảo vệ tài khoản khỏi đánh cắp mật khẩu.
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-open-totp-setup"
                onClick={handleOpenTotpSetup}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition cursor-pointer shrink-0 shadow-sm whitespace-nowrap flex items-center gap-1.5"
              >
                <QrCode size={14} />
                <span>Bật 2FA Bằng Ứng Dụng</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MỤC 2: PHƯƠNG THỨC XÁC THỰC ĐÃ LIÊN KẾT                                  */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <h2 className="text-sm font-semibold text-white">Phương Thức Xác Thực Đã Liên Kết</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 font-bold text-sm shrink-0">
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
                className="border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isGoogleAccount ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
                <span className="font-mono text-[10px]">
                  {isGoogleAccount ? 'ĐÃ KẾT NỐI' : 'CHƯA LIÊN KẾT'}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
                  <Key size={15} />
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

              <span className="border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="font-mono text-[10px]">
                  {isGoogleAccount ? 'TÙY CHỌN' : 'HOẠT ĐỘNG'}
                </span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2 leading-relaxed">
            <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
            <span>
              <strong>Bảo mật tài khoản đa nền tảng:</strong> Bạn có thể sử dụng phương thức đăng nhập Google một chạm, mật khẩu an toàn kết hợp với mã xác thực 2 bước TOTP để bảo vệ dữ liệu tối đa.
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MỤC 3: ĐỔI MẬT KHẨU                                                      */}
        {/* ========================================================================= */}
        {!isGoogleAccount && (
          <div className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock size={15} className="text-zinc-400 shrink-0" />
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-zinc-400 transition"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-zinc-400 transition"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-zinc-400 transition"
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
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  {isChangingPass ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MỤC 4: QUẢN LÝ PHIÊN ĐĂNG NHẬP                                           */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe size={15} className="text-zinc-400 shrink-0" />
              <span className="whitespace-nowrap">Quản Lý Phiên Đăng Nhập (Session Security)</span>
            </h2>
            <button
              type="button"
              onClick={logout}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              <LogOut size={13} />
              <span>Đăng Xuất Phiên Này</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <Smartphone size={16} className="text-zinc-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                  <span>Thiết bị đang sử dụng</span>
                  <span className="border border-zinc-800 bg-zinc-900/80 text-zinc-300 text-[10px] px-2 py-0.5 rounded font-mono">
                    Phiên Hiện Tại
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono break-all line-clamp-1 max-w-sm mt-0.5">
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
              <div className="text-[11px] text-zinc-400">Vô hiệu hóa phiên làm việc trên các máy tính lạ hoặc thiết bị công cộng khác.</div>
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

        {/* ========================================================================= */}
        {/* MỤC 5: VÙNG NGUY HIỂM (DANGER ZONE - GDPR)                               */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
          <div className="flex items-center gap-2 text-zinc-300">
            <AlertTriangle size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Vùng Nguy Hiểm (Danger Zone)</h2>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Sau khi xóa tài khoản, toàn bộ thông tin cá nhân, hồ sơ học tập, ghi chú, danh sách nhiệm vụ và quyền lợi gói cước sẽ bị xóa sạch vĩnh viễn khỏi hệ thống theo chuẩn quyền riêng tư GDPR.
          </p>

          <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-zinc-500">
              Hành động này không thể hoàn tác sau khi đã thực hiện.
            </div>
            <button
              type="button"
              data-testid="btn-open-delete-account"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl border border-zinc-800 hover:border-rose-900/50 bg-zinc-900/60 hover:bg-rose-950/20 text-zinc-400 hover:text-rose-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Xóa Tài Khoản Vĩnh Viễn</span>
            </button>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: THIẾT LẬP GOOGLE AUTHENTICATOR (TOTP 2FA) THẬT 100%             */}
      {/* ========================================================================= */}
      {showTotpSetupModal && totpSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-100">
                <QrCode size={18} />
                <span>Thiết Lập Xác Thực 2 Bước (Google Authenticator)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTotpSetupModal(false);
                  setTotpError(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            {totpError && (
              <div className="p-3 rounded-xl border border-rose-900/40 bg-zinc-950 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{totpError}</span>
              </div>
            )}

            {/* Bước 1: Quét mã QR */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-zinc-200">
                Bước 1: Quét mã QR bằng ứng dụng Authenticator
              </div>
              <p className="text-zinc-400">
                Mở ứng dụng <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> hoặc <strong>Authy</strong> trên điện thoại và quét mã QR này:
              </p>
              <div className="flex justify-center py-2">
                <div className="bg-white p-3 rounded-2xl inline-block shadow-md">
                  <img
                    src={totpSetupData.qrCodeUrl}
                    alt="Mã QR TOTP"
                    className="w-48 h-48 block"
                  />
                </div>
              </div>
            </div>

            {/* Bước 2: Hoặc nhập mã thủ công */}
            <div className="space-y-2 text-xs border-t border-zinc-800 pt-3">
              <div className="font-semibold text-zinc-200">
                Bước 2: Hoặc nhập mã khóa bí mật thủ công
              </div>
              <p className="text-zinc-400">
                Nếu camera không quét được, hãy chọn &quot;Nhập khóa thiết lập&quot; trên ứng dụng:
              </p>
              <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <code className="font-mono text-xs tracking-wider text-zinc-200 flex-1 select-all break-all">
                  {totpSetupData.formattedSecret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                >
                  {hasCopiedSecret ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{hasCopiedSecret ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Mã dự phòng khôi phục */}
            <div className="space-y-2 text-xs border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-zinc-200">
                  Mã Khôi Phục Dự Phòng (Lưu lại đề phòng mất điện thoại)
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyBackupCodes(totpSetupData.backupCodes)}
                  className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {hasCopiedBackupCodes ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{hasCopiedBackupCodes ? 'Đã sao chép' : 'Chép 8 mã'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 text-center">
                {totpSetupData.backupCodes.map((code, i) => (
                  <div key={i} className="p-1 rounded bg-zinc-900/60 border border-zinc-800/80">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* Bước 3: Nhập mã 6 số từ điện thoại để kích hoạt */}
            <form onSubmit={handleConfirmTotpSetup} className="space-y-3 border-t border-zinc-800 pt-3">
              <div className="space-y-1">
                <label className="block text-zinc-200 text-xs font-semibold">
                  Bước 3: Nhập mã xác thực 6 chữ số từ app điện thoại
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  data-testid="input-totp-verify-code"
                  value={totpInputCode}
                  onChange={(e) => setTotpInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3.5 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-center font-mono text-xl tracking-[0.3em] focus:outline-none focus:border-zinc-300 transition"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowTotpSetupModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-confirm-enable-totp"
                  disabled={totpInputCode.length !== 6 || isVerifyingTotp}
                  className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  {isVerifyingTotp ? 'Đang xác minh...' : 'Kích Hoạt 2FA Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: XEM LẠI MÃ DỰ PHÒNG KHÔI PHỤC (BACKUP CODES MODAL)               */}
      {/* ========================================================================= */}
      {showBackupCodesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-200">
                <Key size={16} />
                <span>Mã Dự Phòng Khôi Phục</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupCodesModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Mỗi mã dự phòng chỉ có thể sử dụng 1 lần để đăng nhập khi bạn không mang theo điện thoại:
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 text-center">
              {savedBackupCodes.map((code, idx) => (
                <div key={idx} className="p-1.5 rounded bg-zinc-900 border border-zinc-800">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleCopyBackupCodes(savedBackupCodes)}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                {hasCopiedBackupCodes ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{hasCopiedBackupCodes ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBackupCodesModal(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN TẮT 2FA                                                */}
      {/* ========================================================================= */}
      {showDisable2FaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-200">
              <AlertTriangle size={16} className="text-zinc-400" />
              <span>Tắt Xác Thực 2 Bước</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Bạn có chắc chắn muốn tắt tính năng Xác Thực 2 Bước? Tài khoản sẽ mất đi lớp bảo vệ bổ sung khi đăng nhập từ thiết bị lạ.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowDisable2FaModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition cursor-pointer"
              >
                Giữ Lại
              </button>
              <button
                type="button"
                data-testid="btn-confirm-disable-2fa"
                disabled={isDisabling2Fa}
                onClick={handleConfirmDisable2Fa}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                {isDisabling2Fa ? 'Đang tắt...' : 'Xác Nhận Tắt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA TÀI KHOẢN VĨNH VIỄN (GDPR)                         */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-200">
                <AlertTriangle size={16} className="text-rose-400" />
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
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Bạn đang chuẩn bị xóa tài khoản <strong>{user.email}</strong>. Mọi dữ liệu nhiệm vụ, ghi chú IndexedDB và phiên đăng nhập sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
            </p>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs">
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs font-mono tracking-wider focus:outline-none focus:border-zinc-400 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-account"
                disabled={deleteConfirmationText.trim() !== 'XOA TAI KHOAN' || isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-5 py-2 rounded-xl border border-zinc-800 hover:border-rose-900/50 bg-zinc-900/60 hover:bg-rose-950/20 disabled:opacity-40 disabled:cursor-not-allowed text-rose-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
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
