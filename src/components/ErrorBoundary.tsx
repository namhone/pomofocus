import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp, Copy, Check, Sparkles } from 'lucide-react';
import { PomoFocusLogo } from './PomoFocusLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PomoFocus Global Error Boundary Caught]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToApp = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/app';
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  private handleCopyDetails = async () => {
    const errorText = `PomoFocus Error Report:\n${this.state.error?.toString()}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`;
    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy error details:', e);
    }
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div
          data-testid="error-boundary-fallback"
          className="fixed inset-0 z-[100] min-h-screen w-full bg-[#050608] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 select-none font-sans overflow-hidden antialiased"
        >
          {/* Lớp phủ Tinh Vân nền tĩnh lặng */}
          <div className="absolute inset-0 bg-radial from-slate-900/60 via-[#070912]/80 to-black pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Header tối giản */}
          <header className="relative z-10 flex items-center justify-between max-w-2xl mx-auto w-full pt-2">
            <PomoFocusLogo size={22} showWordmark={true} wordmarkClassName="text-xs font-bold text-white tracking-tight" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium font-mono">
              <Sparkles size={11} className="text-amber-400" />
              <span>Dữ liệu Cloud an toàn 100%</span>
            </div>
          </header>

          {/* Hộp Thông Báo Kính Mờ Sang Trọng Trung Tâm */}
          <main className="relative z-10 flex-1 flex items-center justify-center py-6">
            <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-2xl text-center shadow-2xl space-y-6">
              {/* Icon & Badge Phút nghỉ ngắn ngoài dự kiến */}
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
                  <AlertTriangle size={28} />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                  ⚠️ Phút nghỉ ngắn ngoài dự kiến...
                </div>
              </div>

              {/* Tiêu đề & Thông điệp Zen */}
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Không Gian Học Tập Đang Tạm Dừng
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
                  Ứng dụng vừa gặp một trục trặc kỹ thuật nhỏ. Dữ liệu học tập và số tia chớp của bạn trên Cloud vẫn an toàn.
                </p>
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  data-testid="error-boundary-reload-btn"
                  onClick={this.handleReload}
                  className="w-full sm:flex-1 py-2.5 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <RotateCcw size={15} />
                  <span>⟲ Khởi Động Lại Không Gian</span>
                </button>

                <button
                  type="button"
                  data-testid="error-boundary-home-btn"
                  onClick={this.handleResetToApp}
                  className="w-full sm:flex-1 py-2.5 px-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 backdrop-blur-sm"
                >
                  <Home size={15} />
                  <span>Về Bàn Học Cá Nhân</span>
                </button>
              </div>

              {/* Chi tiết kỹ thuật có thể mở rộng (Dành cho Dev / Support) */}
              <div className="pt-2 border-t border-white/[0.06] text-left">
                <button
                  type="button"
                  data-testid="error-toggle-details-btn"
                  onClick={this.toggleDetails}
                  className="w-full flex items-center justify-between text-[11px] text-zinc-500 hover:text-zinc-300 transition py-1 cursor-pointer"
                >
                  <span>Chi tiết kỹ thuật (dành cho lập trình viên)</span>
                  {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showDetails && (
                  <div className="mt-2.5 p-3 rounded-xl bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-2 select-text">
                    <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
                      <span>Lỗi: {error?.name || 'Error'}</span>
                      <button
                        type="button"
                        onClick={this.handleCopyDetails}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] transition cursor-pointer"
                      >
                        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                      </button>
                    </div>

                    <p className="text-rose-400 break-words font-medium">
                      {error?.message || 'Không có thông báo lỗi cụ thể.'}
                    </p>

                    {errorInfo?.componentStack && (
                      <pre className="text-[10px] text-zinc-500 overflow-x-auto max-h-32 p-1.5 bg-zinc-950/80 rounded border border-zinc-900 leading-tight">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Footer tối giản */}
          <footer className="relative z-10 text-center text-[10px] text-zinc-500 font-mono py-2">
            PomoFocus System Resilience Layer · Zero White Screen Guaranteed
          </footer>
        </div>
      );
    }

    return this.props.children;
  }
}
