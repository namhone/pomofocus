import React, { useState, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Shield,
  Sparkles,
  Calendar,
  Mail,
  Edit2,
  Check,
  Save,
  Database,
  ExternalLink,
  Crown,
  Camera,
  Upload,
  Trash2,
  User,
  CheckCircle2
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160&h=160&fit=crop&crop=face'
];

export const ProfileView: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, isPro, isLifetime, planLabel, updateProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
        <PlatformHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center space-y-5">
            <h1 className="text-xl font-bold text-white">Yêu Cầu Đăng Nhập</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bạn cần đăng nhập tài khoản để xem và quản lý hồ sơ cá nhân cũng như cập nhật ảnh đại diện.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => router.navigate('/login')}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs transition hover:bg-zinc-200 cursor-pointer"
              >
                Đăng Nhập Ngay
              </button>
              <button
                type="button"
                onClick={() => router.navigate('/app')}
                className="w-full py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs transition cursor-pointer"
              >
                Vào Không Gian Làm Việc
              </button>
            </div>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  // Xử lý tải ảnh trực tiếp từ máy / điện thoại và nén nhẹ bằng canvas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp tin hình ảnh.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Nén và resize ảnh vuông 256x256
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatarUrl(dataUrl);
          setIsEditing(true);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    setSaveStatus(null);
    const success = await updateProfile(displayName.trim(), avatarUrl.trim() || undefined);
    setIsSaving(false);

    if (success) {
      setSaveStatus('Đã cập nhật ảnh đại diện và hồ sơ thành công!');
      setIsEditing(false);
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus('Cập nhật thất bại. Vui lòng thử lại.');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setIsEditing(true);
  };

  const formattedJoinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Mới đây';

  const formattedExpiry = user.proExpiresAt
    ? new Date(user.proExpiresAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : isLifetime
    ? 'Vĩnh viễn (Không giới hạn)'
    : 'Không áp dụng';

  return (
    <div
      data-testid="profile-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-6">
        {/* Sub-nav Tabs: Hồ Sơ | Bảo Mật | Dữ Liệu */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-medium shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
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
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-sky-400" />
              <span>Dữ Liệu</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap hidden sm:flex"
          >
            <span>Vào Không Gian</span>
            <span>→</span>
          </button>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-medium">{saveStatus}</span>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            {/* Avatar & User Details */}
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              {/* Avatar with Camera Overlay */}
              <div className="relative group shrink-0">
                {avatarUrl || user.avatarUrl ? (
                  <img
                    src={avatarUrl || user.avatarUrl}
                    alt={user.displayName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-md group-hover:border-emerald-400 transition"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-white text-xl sm:text-2xl font-bold group-hover:border-emerald-400 transition">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Camera quick edit button */}
                <button
                  type="button"
                  data-testid="profile-change-avatar-btn"
                  onClick={() => {
                    setIsEditing(true);
                    fileInputRef.current?.click();
                  }}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg transition cursor-pointer"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera size={13} />
                </button>

                {isLifetime && (
                  <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black p-1 rounded-full shadow" title="Owner Lifetime">
                    <Crown size={12} />
                  </div>
                )}
              </div>

              {/* Text Info (Sửa hoàn toàn lỗi rớt dòng chữ) */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate" data-testid="profile-display-name">
                    {user.displayName}
                  </h1>
                  <span
                    data-testid="profile-plan-badge"
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border shrink-0 whitespace-nowrap ${
                      isLifetime
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        : isPro
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {planLabel}
                  </span>
                </div>

                {/* Email and Join Date - Clean Column Layout on Mobile */}
                <div className="flex flex-col gap-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-mono truncate">
                    <Mail size={12} className="shrink-0 text-zinc-500" />
                    <span className="truncate">{user.email}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400 whitespace-nowrap">
                    <Calendar size={12} className="shrink-0 text-zinc-500" />
                    <span>Tham gia: {formattedJoinDate}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Edit Button */}
            <button
              type="button"
              data-testid="btn-toggle-edit-profile"
              onClick={() => setIsEditing(!isEditing)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Edit2 size={13} />
              <span>{isEditing ? 'Đóng Chỉnh Sửa' : 'Chỉnh Sửa Hồ Sơ & Avt'}</span>
            </button>
          </div>

          {/* Form chỉnh sửa thông tin & Avatar */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-5 animate-in fade-in">
              {/* Tên hiển thị */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Tên Hiển Thị
                </label>
                <input
                  type="text"
                  data-testid="input-edit-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                  placeholder="Nhập tên hiển thị của bạn..."
                  required
                />
              </div>

              {/* Chỉnh sửa và lưu Avatar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-300">
                    Ảnh Đại Diện (Tải lên từ thiết bị hoặc chọn mẫu)
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Xóa ảnh (dùng chữ cái)</span>
                    </button>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} className="text-emerald-400" />
                    <span>Tải ảnh từ điện thoại / máy tính</span>
                  </button>
                </div>

                {/* Input URL */}
                <div>
                  <input
                    type="url"
                    data-testid="input-edit-avatar-url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition font-mono"
                    placeholder="Hoặc dán URL ảnh (https://...)"
                  />
                </div>

                {/* Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-400">Hoặc chọn nhanh avatar phong cách có sẵn:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          avatarUrl === preset
                            ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/20'
                            : 'border-zinc-700 opacity-70 hover:opacity-100 hover:border-zinc-500'
                        }`}
                        title={`Chọn avatar ${idx + 1}`}
                      >
                        <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDisplayName(user.displayName);
                    setAvatarUrl(user.avatarUrl || '');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  data-testid="btn-save-profile"
                  disabled={isSaving}
                  onClick={() => handleSaveProfile()}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isSaving ? (
                    <span>Đang Lưu...</span>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Lưu Hồ Sơ & Avatar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Thông tin Gói & Đặc Quyền */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span>Đặc Quyền Gói Dịch Vụ</span>
            </h2>
            <button
              type="button"
              onClick={() => router.navigate('/billing')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
            >
              <span>Xem Bảng Giá</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-[11px] text-zinc-400">Trạng Thái Gói</div>
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{planLabel}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-[11px] text-zinc-400">Hạn Sử Dụng</div>
              <div className="font-semibold text-white">{formattedExpiry}</div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="text-xs font-medium text-zinc-300">Tính năng đã kích hoạt:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span>101+ Không gian học tập HD thực tế</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span>Âm thanh tự nhiên & thư viện nhạc sống</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span>Phòng học trực tuyến WebRTC Video</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span>Lịch biểu Time-blocking chuyên sâu</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span>Đồng bộ dữ liệu đám mây đa thiết bị</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span>Tải lên video & âm thanh cá nhân</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
