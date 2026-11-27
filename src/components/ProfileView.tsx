import { UiLabel } from './common/UiSymbol';
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { getEffectiveAvatarUrl, isValidAvatarUrl } from '../services/authService';
import { ProfileService } from '../services/profileService';
import { processAndSaveCustomAvatar } from '../services/avatarUploadService';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { MobileSubViewLayout } from './mobile/MobileSubViewLayout';
import {
  ArrowLeft,
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
  CheckCircle2,
  CreditCard,
  AtSign,
  Target,
  EyeOff,
  Ghost,
  Loader2,
  Globe,
  AlertCircle
} from 'lucide-react';
import { MONOCHROME_GEOMETRIC_AVATARS } from '../utils/monochromeAvatars';
import { UserAvatar } from './common/UserAvatar';
import { getSubscriptionBadge } from '../utils/userBadge';

export const ProfileView: React.FC = () => {
  const router = useRouter();
  const { isMobile, isNativeCapacitor } = useDeviceDetection();
  const isMobileOrNative = isMobile || isNativeCapacitor;
  const { user, isAuthenticated, isLifetime, updateProfile } = useAuthStore();
  const badgeInfo = getSubscriptionBadge(user);
  const effectiveBadge = badgeInfo.label;

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.customAvatarUrl || user?.avatarUrl || '');
  const [username, setUsername] = useState(user?.username || '');

  const [focusGoal, setFocusGoal] = useState(user?.focusGoal || user?.bio || '');
  const [hideEmailInRoom, setHideEmailInRoom] = useState(Boolean(user?.hideEmailInRoom));
  const [incognitoJoinRoom, setIncognitoJoinRoom] = useState(Boolean(user?.incognitoJoinRoom));

  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States hỗ trợ tính năng All-in-One Avatar (Nén 1:1, CORS bypass, Supabase Storage)
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [avatarOptimizationInfo, setAvatarOptimizationInfo] = useState<{
    sizeKb: number;
    isCloud: boolean;
    message: string;
  } | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Đồng bộ avatar & profile khi store thay đổi
  useEffect(() => {
    if (!isEditing && user) {
      setAvatarUrl(user.customAvatarUrl || user.avatarUrl || '');
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setFocusGoal(user.focusGoal || user.bio || '');
    }
  }, [user, isEditing]);

  if (!isAuthenticated || !user) {
    return (
      <MobileSubViewLayout
        className="max-md:[&_button]:min-h-[44px] max-md:[&_button]:min-w-[44px] max-md:[&_button]:touch-manipulation"
        title="Hồ sơ cá nhân"
        subtitle="Yêu cầu đăng nhập"
        onBack={() => router.navigate('/app')}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center space-y-5">
            <h1 className="text-xl font-bold text-white">Yêu cầu đăng nhập</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bạn cần đăng nhập tài khoản để xem và quản lý hồ sơ cá nhân cũng như cập nhật ảnh đại diện.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => router.navigate('/login')}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs transition hover:bg-zinc-200 cursor-pointer"
              >
                Đăng nhập ngay
              </button>
              <button
                type="button"
                onClick={() => router.navigate('/app')}
                className="w-full py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs transition cursor-pointer"
              >
                Vào không gian làm việc
              </button>
            </div>
          </div>
        </div>
      </MobileSubViewLayout>
    );
  }

  // Xử lý tải ảnh trực tiếp từ máy / điện thoại: Tự động cắt vuông 1:1, nén nhẹ ~30KB và lưu Supabase Cloud Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn tệp tin hình ảnh hợp lệ (PNG, JPG, WebP, GIF).');
      return;
    }

    setIsProcessingAvatar(true);
    setAvatarError(null);
    setAvatarOptimizationInfo(null);

    try {
      const result = await processAndSaveCustomAvatar(user.id, file, user.email);
      if (result.success) {
        setAvatarUrl(result.avatarUrl);
        setAvatarOptimizationInfo({
          sizeKb: result.sizeKb,
          isCloud: result.isCloudStorage,
          message: result.message || ''
        });
        setSaveStatus(`Đã tối ưu ${result.sizeKb} KB & cập nhật ảnh đại diện thành công!`);
        setIsEditing(true);
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setAvatarError(result.error || 'Không thể xử lý ảnh tải lên.');
      }
    } catch (err: any) {
      setAvatarError(err?.message || 'Lỗi xử lý tệp ảnh.');
    } finally {
      setIsProcessingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Xử lý dán URL ảnh từ internet: Tự động vượt tường lửa CORS qua Proxy, cắt vuông 1:1, nén và lưu Supabase Cloud
  const handleApplyUrlAvatar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    setIsProcessingAvatar(true);
    setAvatarError(null);
    setAvatarOptimizationInfo(null);

    try {
      const result = await processAndSaveCustomAvatar(user.id, cleanUrl, user.email);
      if (result.success) {
        setAvatarUrl(result.avatarUrl);
        setUrlInput('');
        setAvatarOptimizationInfo({
          sizeKb: result.sizeKb,
          isCloud: result.isCloudStorage,
          message: result.message || ''
        });
        setSaveStatus(`Đã tải & tối ưu ảnh từ URL (${result.sizeKb} KB) thành công!`);
        setIsEditing(true);
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setAvatarError(result.error || 'Không thể tải hoặc xử lý ảnh từ liên kết này.');
      }
    } catch (err: any) {
      setAvatarError(err?.message || 'Lỗi khi tải ảnh từ đường dẫn mạng.');
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  // Chọn avatar hình học tối giản có sẵn
  const handleSelectPresetAvatar = async (svgDataUri: string) => {
    setAvatarUrl(svgDataUri);
    setAvatarError(null);
    setAvatarOptimizationInfo({
      sizeKb: 2,
      isCloud: false,
      message: 'Avatar hình học tối giản sắc nét SVG Retina'
    });
    setIsEditing(true);

    if (user?.id) {
      if (!await ProfileService.updateAvatar(user.id, svgDataUri, user.email)) {
        setAvatarError('Không thể lưu ảnh đại diện. Vui lòng thử lại.');
        setAvatarUrl(user.avatarUrl || '');
        return;
      }
      useAuthStore.setState((state) => ({
        user: state.user?.id === user.id
          ? {
              ...state.user,
              avatarUrl: svgDataUri,
              customAvatarUrl: svgDataUri,
              hasCustomAvatar: true
            }
          : state.user
      }));
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    setSaveStatus(null);
    const success = await updateProfile({
      displayName: displayName.trim(),
      username: username.trim() || undefined,
      bio: focusGoal.trim() || undefined,
      focusGoal: focusGoal.trim() || undefined,
      hideEmailInRoom,
      incognitoJoinRoom
    });
    setIsSaving(false);

    if (success) {
      setSaveStatus('Đã cập nhật hồ sơ cá nhân và quyền riêng tư thành công!');
      setIsEditing(false);
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus('Cập nhật thất bại. Vui lòng thử lại.');
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    const success = await updateProfile({ avatarUrl: '', customAvatarUrl: '', hasCustomAvatar: false });
    if (!success) {
      setAvatarError('Không thể xóa ảnh đại diện. Vui lòng thử lại.');
      return;
    }
    if (useAuthStore.getState().user?.id !== user.id) return;
    setAvatarUrl(getEffectiveAvatarUrl(useAuthStore.getState().user));
    setAvatarOptimizationInfo(null);
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
    <MobileSubViewLayout
      title="Hồ sơ cá nhân"
      subtitle={user.email}
      backTestId="back-to-workspace-btn"
      onBack={() => router.navigate('/app')}
      className="max-md:[&_button]:min-h-[44px] max-md:[&_button]:min-w-[44px] max-md:[&_button]:touch-manipulation selection:bg-white selection:text-black"
    >
      <div
        data-testid="profile-view"
        className="w-full max-w-3xl mx-auto pt-4 sm:pt-6 pb-16 px-4 space-y-6"
      >
        {/* Nút Quay Lại Bàn Học & User Email cho Desktop Web */}
        {!isMobileOrNative && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              data-testid="back-to-workspace-btn"
              onClick={() => router.navigate('/app')}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer group py-1"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1 text-zinc-400 group-hover:text-white" />
              <span>Quay lại không gian học</span>
            </button>

            <span
              className="text-[11px] sm:text-xs text-zinc-400 font-mono truncate max-w-[140px] sm:max-w-xs"
              title={user.email}
            >
              {user.email}
            </span>
          </div>
        )}

        {/* Sub-nav Tabs: Hồ sơ | Bảo mật | Gói cước | Dữ liệu (Full Width Scrollable) */}
        <div className="w-full pb-3 border-b border-zinc-800">
          <div className="grid grid-cols-2 min-[380px]:grid-cols-4 sm:flex sm:items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs [&_button]:justify-center max-sm:[&_svg]:hidden">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-white font-medium border border-zinc-700 shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <User size={13} className="text-zinc-200" />
              <span>Hồ sơ</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-security"
              onClick={() => router.navigate('/account/security')}
              className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Shield size={13} className="text-zinc-400" />
              <span>Bảo mật</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-billing"
              onClick={() => router.navigate('/billing')}
              className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CreditCard size={13} className="text-zinc-400" />
              <span>Gói cước</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-privacy"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Database size={13} className="text-zinc-400" />
              <span>Dữ liệu</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div className="p-3.5 rounded-xl border border-zinc-500/30 bg-zinc-950/40 text-zinc-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-zinc-300" />
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
                <UserAvatar
                  user={user}
                  avatarUrl={isValidAvatarUrl(avatarUrl) ? avatarUrl : undefined}
                  size={72}
                  ring="ring-2 ring-zinc-700/80"
                  alt={displayName || user.displayName || 'Avatar'}
                  testId="profile-user-avatar"
                  className="rounded-full"
                />

                {/* Camera quick edit button */}
                <button
                  type="button"
                  data-testid="profile-change-avatar-btn"
                  onClick={() => {
                    setIsEditing(true);
                    fileInputRef.current?.click();
                  }}
                  className="absolute -bottom-1 -right-1 min-w-[24px] min-h-[24px] w-6 h-6 p-1 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 shadow-lg transition cursor-pointer flex items-center justify-center"
                  aria-label="Thay đổi ảnh đại diện"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera size={13} />
                </button>

                {isLifetime && (
                  <div className="absolute -top-1.5 -right-1.5 bg-zinc-800 border border-zinc-700 text-zinc-200 p-1 rounded-full shadow" title="Owner Lifetime">
                    <Crown size={12} />
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate" data-testid="profile-display-name">
                    <UiLabel text={user.displayName} />
                  </h1>
                  {user.username && (
                    <span className="text-xs font-mono text-zinc-400 font-medium" data-testid="profile-handle">
                      {user.username}
                    </span>
                  )}
                  <span
                    data-testid="profile-plan-badge"
                    className={badgeInfo.badgeClass}
                  >
                    {badgeInfo.label}
                  </span>
                </div>

                {/* Bio / Focus Goal if available */}
                {(user.focusGoal || user.bio) && (
                  <div className="text-xs text-zinc-300/90 font-medium flex items-center gap-1.5 truncate">
                    <Target size={12} className="text-zinc-300 shrink-0" />
                    <span className="truncate">{user.focusGoal || user.bio}</span>
                  </div>
                )}

                {/* Email and Join Date */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-zinc-400">
                  {user.email && user.email.trim() ? (
                    <span className="flex items-center gap-1.5 font-mono min-w-0" data-testid="profile-email-container">
                      <Mail size={12} className="shrink-0 text-zinc-400" />
                      <span className="truncate text-zinc-300 select-text">{user.email}</span>
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5 text-zinc-400 whitespace-nowrap">
                    <Calendar size={12} className="shrink-0 text-zinc-400" />
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
              <span>{isEditing ? 'Đóng Chỉnh Sửa' : 'Chỉnh sửa hồ sơ'}</span>
            </button>
          </div>

          {/* Form chỉnh sửa thông tin & Avatar */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-5 animate-in fade-in">
              {/* Grid 2 cột: Tên hiển thị & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Tên hiển thị (display name)
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

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
                    <AtSign size={13} className="text-zinc-400" />
                    <span>Định danh duy nhất (handle / tag)</span>
                  </label>
                  <input
                    type="text"
                    data-testid="input-edit-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs font-mono focus:outline-none focus:border-white transition"
                    placeholder="@namho (dùng để tag trong phòng học)"
                  />
                </div>
              </div>

              {/* Tiểu sử / Mục tiêu học tập */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
                  <Target size={13} className="text-zinc-300" />
                  <span>Mục tiêu hoặc tiểu sử</span>
                </label>
                <input
                  type="text"
                  data-testid="input-edit-focus-goal"
                  value={focusGoal}
                  onChange={(e) => setFocusGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-xs focus:outline-none focus:border-white transition"
                  placeholder="Ví dụ: đạt ielts 8.0, hoàn thành đồ án, ôn thi..."
                  maxLength={100}
                />
              </div>

              {/* Chỉnh sửa và chọn Avatar */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>Ảnh đại diện tùy chỉnh</span>
                    </label>
                  </div>

                  {avatarUrl && (
                    <button
                      type="button"
                      data-testid="profile-btn-remove-avatar"
                      onClick={handleRemoveAvatar}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Xóa ảnh (dùng chữ cái)</span>
                    </button>
                  )}
                </div>

                {/* Banner trạng thái đang xử lý nén / tải ảnh */}
                {isProcessingAvatar && (
                  <div className="p-3 rounded-xl border border-zinc-500/30 bg-zinc-950/40 text-zinc-300 text-xs flex items-center gap-2.5 animate-pulse">
                    <Loader2 size={15} className="animate-spin text-zinc-300 shrink-0" />
                    <span>Đang chuẩn bị và lưu ảnh đại diện...</span>
                  </div>
                )}

                {/* Badge thông báo tối ưu hóa thành công */}
                {avatarOptimizationInfo && (
                  <div className="p-3 rounded-xl border border-zinc-500/30 bg-zinc-950/40 text-zinc-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 size={15} className="text-zinc-300 shrink-0" />
                    <span className="font-medium">
                      ✓ Đã cắt vuông 1:1 • nén còn {avatarOptimizationInfo.sizeKb} KB • {avatarOptimizationInfo.isCloud ? 'Supabase Storage CDN' : 'Supabase Cloud Profile'}
                    </span>
                  </div>
                )}

                {/* Banner báo lỗi ảnh / CORS */}
                {avatarError && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle size={15} className="text-rose-400 shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}

                {/* 2 Nguồn Tải Ảnh: Thiết Bị & URL Mạng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* NGUỒN 1: Tải từ thiết bị */}
                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-1.5 mb-1">
                        <Upload size={13} className="text-zinc-300" />
                        <span>Nguồn 1: tải từ thiết bị</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 leading-relaxed">
                        Hỗ trợ png, jpg, webp. Tự động cắt vuông và nén dưới 50kb.
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      data-testid="input-upload-avatar-file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      data-testid="btn-upload-avatar-device"
                      disabled={isProcessingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload size={13} className="text-zinc-300" />
                      <span>{isProcessingAvatar ? 'Đang Xử Lý...' : 'Chọn Ảnh Từ Máy / Điện Thoại'}</span>
                    </button>
                  </div>

                  {/* NGUỒN 2: Dán URL từ mạng */}
                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-1.5 mb-1">
                        <Globe size={13} className="text-zinc-300" />
                        <span>Nguồn 2: dán URL ảnh mạng</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 leading-relaxed">
                        Discord, imgur, Facebook, pinterest hoặc liên kết ảnh trực tiếp.
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        data-testid="input-edit-avatar-url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyUrlAvatar();
                          }
                        }}
                        placeholder="https://... dán link ảnh"
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-white text-xs font-mono focus:outline-none focus:border-white transition"
                      />
                      <button
                        type="button"
                        data-testid="btn-apply-avatar-url"
                        disabled={!urlInput.trim() || isProcessingAvatar}
                        onClick={() => handleApplyUrlAvatar()}
                        className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400 text-white text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        {isProcessingAvatar ? 'Đang Tải...' : 'Áp Dụng'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* NGUỒN 3: Kho 6 Avatar Tối Giản Hình Học */}
                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                      <span>Kho 6 avatar hình học tối giản</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                    {MONOCHROME_GEOMETRIC_AVATARS.map((geo) => (
                      <button
                        type="button"
                        key={geo.id}
                        data-testid={`avatar-preset-${geo.id}`}
                        onClick={() => handleSelectPresetAvatar(geo.svgDataUri)}
                        className={`group relative p-1.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                          avatarUrl === geo.svgDataUri
                            ? 'bg-zinc-800 border-white shadow-md shadow-white/10 scale-102'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                        }`}
                        title={geo.name}
                      >
                        <img
                          src={geo.svgDataUri}
                          alt={geo.name}
                          className="w-10 h-10 rounded-full object-contain"
                        />
                        <span className="text-[9px] text-zinc-400 group-hover:text-zinc-200 transition text-center line-clamp-1 truncate w-full">
                          {geo.name.split(' (')[0]}
                        </span>
                        {avatarUrl === geo.svgDataUri && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-zinc-700 text-black flex items-center justify-center text-[8px]">
                            ✓
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quyền Riêng Tư Trong Phòng Học */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                <span className="text-xs font-semibold text-zinc-300 block">
                  Cài đặt quyền riêng tư trong phòng học
                </span>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <EyeOff size={15} className="text-zinc-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-white">Ẩn địa chỉ email trong phòng học</div>
                        <div className="text-[11px] text-zinc-400">Các thành viên khác chỉ nhìn thấy tên hiển thị và định danh của bạn.</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      data-testid="toggle-hide-email"
                      checked={hideEmailInRoom}
                      onChange={(e) => setHideEmailInRoom(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white accent-white focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Ghost size={15} className="text-zinc-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-white">Chế độ tàng hình</div>
                        <div className="text-[11px] text-zinc-400">Không hiển thị thông báo popup làm gián đoạn khi bạn tham gia phòng học.</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      data-testid="toggle-incognito-join"
                      checked={incognitoJoinRoom}
                      onChange={(e) => setIncognitoJoinRoom(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white accent-white focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDisplayName(user.displayName);
                    setAvatarUrl(user.avatarUrl || '');
                    setUsername(user.username || '');
                    setFocusGoal(user.focusGoal || user.bio || '');
                    setHideEmailInRoom(Boolean(user.hideEmailInRoom));
                    setIncognitoJoinRoom(Boolean(user.incognitoJoinRoom));
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
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Lưu hồ sơ &amp; cài đặt</span>
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
              <Sparkles size={16} className="text-zinc-300" />
              <span>Đặc quyền gói dịch vụ</span>
            </h2>
            <button
              type="button"
              onClick={() => router.navigate('/billing')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
            >
              <span>Xem bảng giá</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-[11px] text-zinc-400">Trạng thái gói</div>
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
                <span>{effectiveBadge}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-[11px] text-zinc-400">Hạn sử dụng</div>
              <div className="font-semibold text-white">{formattedExpiry}</div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="text-xs font-medium text-zinc-300">Tính năng đã kích hoạt:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-zinc-300 shrink-0" />
                <span>100+ bối cảnh tập trung</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-zinc-300 shrink-0" />
                <span>Âm thanh tự nhiên &amp; thư viện nhạc sống</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-zinc-300 shrink-0" />
                <span>Phòng học trực tuyến</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-zinc-300 shrink-0" />
                <span>Lịch biểu time-blocking chuyên sâu</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-zinc-300 shrink-0" />
                <span>Đồng bộ dữ liệu đám mây đa thiết bị</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-zinc-300 shrink-0" />
                <span>Tải lên video &amp; âm thanh cá nhân</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileSubViewLayout>
  );
};
