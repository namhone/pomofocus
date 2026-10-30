import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PomoFocus Error Boundary Caught]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToApp = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary-fallback"
          className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-6 select-none font-sans"
        >
          <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-inner">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Đã xảy ra sự cố không mong muốn
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ứng dụng gặp lỗi tạm thời. Dữ liệu công việc và thời gian Pomodoro của bạn trong IndexedDB đã được tự động bảo toàn.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-lg bg-black/40 border border-zinc-800 text-[11px] font-mono text-zinc-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <RefreshCw size={14} />
                <span>Tải lại trang</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetToApp}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home size={14} />
                <span>Về Trang Chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
