import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Database,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  FileText,
  Clock,
  ListTodo,
  Calendar,
  X,
  ShieldCheck,
  User,
  Shield,
  CreditCard
} from 'lucide-react';

export const PrivacyDataView: React.FC = () => {
  const router = useRouter();
  const { exportUserData, clearUserData } = useAuthStore();

  const [stats, setStats] = useState({
    tasks: 0,
    notes: 0,
    sessions: 0,
    projects: 0,
    planner: 0
  });

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDatabaseCounts = async () => {
    try {
      const [tasks, notes, sessions, projects, planner] = await Promise.all([
        db.tasks.count(),
        db.notes.count(),
        db.focus_sessions.count(),
        db.projects.count(),
        db.planner_blocks.count()
      ]);
      setStats({ tasks, notes, sessions, projects, planner });
    } catch (err) {
      console.warn('Lỗi kiểm tra cơ sở dữ liệu IndexedDB:', err);
    }
  };

  useEffect(() => {
    loadDatabaseCounts();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const payload = await exportUserData();
      if (!payload) {
        showToast('error', 'Không thể tạo bản sao lưu.');
        setIsExporting(false);
        return;
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `pomofocus-data-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('success', 'Đã tải xuống bản sao lưu JSON thành công!');
    } catch (err) {
      console.warn('Lỗi xuất dữ liệu:', err);
      showToast('error', 'Lỗi trong quá trình xuất dữ liệu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmationInput !== 'XOA DU LIEU' && deleteConfirmationInput !== 'XOA') {
      showToast('error', 'Vui lòng gõ chính xác "XOA" để xác nhận.');
      return;
    }

    setIsDeleting(true);
    try {
      const success = await clearUserData();
      if (success) {
        setShowDeleteModal(false);
        setDeleteConfirmationInput('');
        await loadDatabaseCounts();
        showToast('success', 'Đã xóa toàn bộ dữ liệu trên thiết bị thành công.');
      } else {
        showToast('error', 'Không thể hoàn tất thao tác xóa.');
      }
    } catch (err) {
      console.warn('Lỗi khi xóa dữ liệu:', err);
      showToast('error', 'Đã xảy ra sự cố khi xóa.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      data-testid="privacy-data-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-6">
        {/* Sub-nav Tabs: Hồ Sơ | Bảo Mật | Gói Cước | Quyền Riêng Tư */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => router.navigate('/profile')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <User size={13} className="text-emerald-400" />
              <span>Hồ Sơ Cá Nhân</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/account/security')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Shield size={13} className="text-amber-400" />
              <span>Bảo Mật</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/billing')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={13} className="text-cyan-400" />
              <span>Gói Cước</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-medium shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-sky-400" />
              <span>Quyền Riêng Tư</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400">
            <ShieldCheck size={14} />
            <span className="whitespace-nowrap">Local-First & Client Encrypted</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database size={22} className="text-white shrink-0" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Quản Lý Dữ Liệu & Quyền Riêng Tư
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            PomoFocus tuân thủ triết lý <strong>Local-First</strong>: Mọi công việc, ghi chú và lịch sử tập trung được lưu trữ trực tiếp trên thiết bị của bạn qua IndexedDB.
          </p>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 shadow-sm ${
              toastMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* IndexedDB Storage Inspector */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive size={16} className="text-sky-400 shrink-0" />
              <span>Dung Lượng Cơ Sở Dữ Liệu IndexedDB</span>
            </h2>
            <button
              type="button"
              onClick={loadDatabaseCounts}
              className="text-[11px] text-zinc-400 hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Làm mới
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Nhiệm vụ (Tasks)</span>
                <ListTodo size={14} className="text-sky-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono" data-testid="count-tasks">
                {stats.tasks}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Ghi chú (Notes)</span>
                <FileText size={14} className="text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono" data-testid="count-notes">
                {stats.notes}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Phiên học (Sessions)</span>
                <Clock size={14} className="text-rose-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono" data-testid="count-sessions">
                {stats.sessions}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Lịch biểu (Planner)</span>
                <Calendar size={14} className="text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono" data-testid="count-planner">
                {stats.planner}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Dự án (Projects)</span>
                <HardDrive size={14} className="text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono" data-testid="count-projects">
                {stats.projects}
              </div>
            </div>
          </div>
        </div>

        {/* Data Portability (Export) */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Download size={16} className="text-emerald-400 shrink-0" />
              <span>Xuất Dữ Liệu Cá Nhân (Data Portability)</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tải xuống toàn bộ dữ liệu của bạn dưới định dạng tệp tin JSON tiêu chuẩn. Bạn hoàn toàn làm chủ dữ liệu của mình.
            </p>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              data-testid="btn-export-data-json"
              disabled={isExporting}
              onClick={handleExportData}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap"
            >
              <Download size={14} />
              <span>{isExporting ? 'Đang tạo bản sao lưu...' : 'Xuất File JSON'}</span>
            </button>
          </div>
        </div>

        {/* Danger Zone (Clear Data) */}
        <div className="p-5 sm:p-7 rounded-2xl border border-rose-950/60 bg-rose-950/20 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-rose-300 mb-1 flex items-center gap-2">
              <Trash2 size={16} className="text-rose-400 shrink-0" />
              <span>Xóa Toàn Bộ Dữ Liệu Trên Thiết Bị</span>
            </h2>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              Hành động này sẽ xóa vĩnh viễn toàn bộ công việc, ghi chú, lịch sử phiên học và cài đặt cá nhân lưu trên trình duyệt này. Thao tác không thể hoàn tác.
            </p>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              data-testid="btn-open-clear-data-modal"
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow"
            >
              <Trash2 size={14} />
              <span>Xóa Sạch Dữ Liệu Cục Bộ</span>
            </button>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          data-testid="clear-data-confirm-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full p-6 rounded-2xl border border-rose-900 bg-zinc-950 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle size={16} />
                <span>Xác Nhận Xóa Dữ Liệu</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ công việc, ghi chú và lịch sử tập trung không? Dữ liệu sẽ biến mất vĩnh viễn khỏi thiết bị này.
            </p>

            <div>
              <label className="block text-zinc-400 mb-1.5">
                Vui lòng nhập <strong className="text-rose-400 font-mono">XOA</strong> vào ô bên dưới:
              </label>
              <input
                type="text"
                data-testid="input-confirm-delete"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="XOA"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-execute"
                disabled={(deleteConfirmationInput !== 'XOA' && deleteConfirmationInput !== 'XOA DU LIEU') || isDeleting}
                onClick={handleDeleteAllData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold cursor-pointer transition shadow"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SharedFooter />
    </div>
  );
};
