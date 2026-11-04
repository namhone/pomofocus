import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export const TwoFactorGateModal: React.FC = () => {
  const { requires2Fa, pending2FaUser, verify2FaLogin, cancel2FaLogin } = useAuthStore();
  const [totpCode, setTotpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!requires2Fa || !pending2FaUser) {
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const clean = totpCode.trim();
    if (!clean) {
      setErrorMsg('Vui lòng nhập mã xác thực 6 số từ ứng dụng Authenticator.');
      return;
    }

    setIsVerifying(true);
    const res = await verify2FaLogin(clean);
    setIsVerifying(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Mã xác thực không chính xác hoặc đã hết hạn.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="totp-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3.5 shadow-lg shadow-emerald-500/10">
            <ShieldCheck size={28} />
          </div>

          <h2 id="totp-gate-title" className="text-lg font-bold text-white mb-1">
            Trạm Gác Bảo Mật 2FA
          </h2>
          <p className="text-xs text-neutral-400 max-w-xs mb-4">
            Tài khoản <span className="font-semibold text-white">{pending2FaUser.email}</span> đã kích hoạt xác thực 2 bước. Nhập mã OTP 6 số để mở khóa phiên:
          </p>

          {errorMsg && (
            <div className="w-full mb-3.5 flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300 text-left">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="w-full flex flex-col gap-3">
            <div>
              <input
                type="text"
                autoFocus
                data-testid="input-gate-totp-code"
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value.replace(/\s+/g, ''));
                  setErrorMsg('');
                }}
                placeholder="000000"
                maxLength={10}
                className="w-full text-center font-mono text-2xl tracking-[0.35em] font-bold py-2.5 px-4 rounded-xl bg-white/5 border border-emerald-500/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-white placeholder-neutral-600 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              data-testid="btn-submit-gate-2fa"
              disabled={isVerifying || !totpCode.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang đối soát...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Xác Nhận & Mở Khóa</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="btn-cancel-gate-2fa"
              onClick={() => {
                setTotpCode('');
                setErrorMsg('');
                cancel2FaLogin();
              }}
              className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Hủy đăng nhập
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
