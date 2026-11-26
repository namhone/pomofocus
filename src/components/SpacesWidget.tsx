import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  Video,
  Sparkles,
  AlertCircle,
  Upload,
  Search,
  CloudRain,
  Snowflake,
  Flower2,
  Zap,
  ChevronDown,
  ChevronUp,
  Music,
  Lock,
} from 'lucide-react';
import { useBackgroundStore } from '../stores/useBackgroundStore';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { AmbientEffectType } from '../types/background';
import {
  WallpaperCategory,
  WALLPAPER_CATEGORIES,
  queryWallpapers,
  WallpaperItem
} from '../data/wallpapers';
import { BACKGROUND_PRESETS } from '../data/backgroundPresets';
import { isOwnerEmail, isLadyBoss, isVipFriend, hasVipAccess } from '../services/authService';
import { AudioWidget } from './AudioWidget';
import { db, CustomBackgroundRecord } from '../db';

/**
 * Feature 18: Client-side canvas resize and compression to WebP (max 1080p, quality 0.85).
 * Downscales images over 1920x1080 to prevent Android WebView Out-Of-Memory (OOM) crashes.
 */
export async function compressImageToWebP(
  file: File | Blob,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    return file;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';

    const cleanupTempUrl = () => {
      if (objectUrl && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    };

    img.onload = () => {
      cleanupTempUrl();

      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      cleanupTempUrl();
      resolve(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      resolve(file);
    }
  });
}

export const SpacesWidget: React.FC = () => {
  const router = useRouter();
  const { user, isPro: storeIsPro, isLifetime, isOwner } = useAuthStore();
  const isPrivileged = Boolean(
    storeIsPro ||
    isLifetime ||
    isOwner ||
    user?.role === 'founder' ||
    user?.plan === 'lifetime' ||
    user?.plan === 'pro' ||
    isOwnerEmail(user?.email) ||
    isLadyBoss(user?.email) ||
    isVipFriend(user?.email) ||
    hasVipAccess(user)
  );
  const isPro = isPrivileged;
  // Tab chuyển đổi giữa [ 🖼️ Hình Nền ] và [ 🎵 Âm Thanh & Chuông ]
  const [spaceMainTab, setSpaceMainTab] = useState<'wallpapers' | 'audio'>('wallpapers');

  const {
    activePresetId,
    customUrl,
    blurLevel,
    brightnessLevel,
    overlayOpacity,
    ambientEffect,
    hasError,
    useStaticFallback,
    selectPreset,
    setCustomBackground,
    setBlur,
    setBrightness,
    setOverlayOpacity,
    setAmbientEffect,
    resetBackground
  } = useBackgroundStore();

  // 2 Tab chính: "Kho Hình Nền" (mặc định) & "Hiệu Ứng & Ánh Sáng"
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'effects'>('wallpapers');

  // Filter & Search state cho Kho Hình Nền
  const [selectedCategory, setSelectedCategory] = useState<WallpaperCategory | 'all' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loadedWallpapers, setLoadedWallpapers] = useState<WallpaperItem[]>([]);

  // Tùy chỉnh tải lên & Dán URL
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputType, setCustomInputType] = useState<'image' | 'video'>('image');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [savedUploads, setSavedUploads] = useState<CustomBackgroundRecord[]>([]);

  // Load Dexie uploads
  useEffect(() => {
    let isMounted = true;
    db.custom_backgrounds
      .toArray()
      .then((records) => {
        if (isMounted) setSavedUploads(records);
      })
      .catch((err) => console.warn('Lỗi đọc custom_backgrounds:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Truy vấn wallpapers khi category hoặc search thay đổi
  const { items: queriedItems, total, hasMore } = useMemo(() => {
    if (selectedCategory === 'video') {
      return { items: [], total: 0, hasMore: false };
    }
    return queryWallpapers({
      category: selectedCategory === 'all' ? 'all' : selectedCategory,
      query: searchQuery,
      page,
      limit: 24
    });
  }, [selectedCategory, searchQuery, page]);

  // Cập nhật danh sách ảnh tích lũy (Infinite list / Tải thêm)
  useEffect(() => {
    if (page === 1) {
      setLoadedWallpapers(queriedItems);
    } else {
      setLoadedWallpapers((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = queriedItems.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
    }
  }, [queriedItems, page]);

  const handleCategorySelect = (cat: WallpaperCategory | 'all' | 'video') => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // Reference tracking active custom blob URL for memory leak cleanup
  const prevBlobUrlRef = useRef<string | null>(null);

  const cleanupPrevBlobUrl = () => {
    if (
      prevBlobUrlRef.current &&
      prevBlobUrlRef.current.startsWith('blob:') &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      try {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      } catch {}
      prevBlobUrlRef.current = null;
    }
  };

  const handleSelectPreset = (presetId: string) => {
    cleanupPrevBlobUrl();
    selectPreset(presetId);
  };

  const handleResetBackground = () => {
    cleanupPrevBlobUrl();
    resetBackground();
  };

  // Áp dụng custom URL
  const validateAndApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    const trimmed = customInputUrl.trim();
    if (!trimmed) return;

    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol)) {
        setUrlError('Chỉ hỗ trợ giao thức http, https, data hoặc blob.');
        return;
      }
    } catch {
      if (!trimmed.startsWith('data:') && !trimmed.startsWith('blob:')) {
        setUrlError('Định dạng URL không hợp lệ.');
        return;
      }
    }

    cleanupPrevBlobUrl();
    setCustomBackground(trimmed, customInputType);
    setCustomInputUrl('');
  };

  // Upload tệp tin cục bộ với nén WebP (max 1080p) & thu hồi ObjectURL cũ
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    const id = `upload_${Date.now()}`;

    let processedBlob: Blob = file;
    let finalMimeType = file.type;
    let finalName = file.name;

    if (mediaType === 'image') {
      try {
        const compressed = await compressImageToWebP(file, 1920, 1080, 0.85);
        if (compressed) {
          processedBlob = compressed;
          finalMimeType = compressed.type || 'image/webp';
          finalName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
        }
      } catch (err) {
        console.warn('Lỗi nén ảnh WebP, dùng file gốc:', err);
      }
    }

    const record: CustomBackgroundRecord = {
      id,
      name: finalName,
      blob: processedBlob,
      mediaType,
      mimeType: finalMimeType,
      sizeBytes: processedBlob.size,
      createdAt: Date.now()
    };

    await db.custom_backgrounds.put(record);
    setSavedUploads((prev) => [record, ...prev]);

    cleanupPrevBlobUrl();
    const objectUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(processedBlob) : '';
    prevBlobUrlRef.current = objectUrl;
    setCustomBackground(objectUrl, mediaType);
  };

  return (
    <div
      data-testid="spaces-widget"
      className="flex h-full w-full min-w-0 max-h-[80vh] flex-col text-slate-100 p-2 select-none overflow-hidden"
    >
            {/* 2 Tab chuyển đổi rõ ràng ở đầu: [ 🖼️ Hình Nền ] | [ 🎵 Âm Thanh & Chuông ] */}
      <div className="flex flex-nowrap rounded-xl bg-zinc-900/90 p-1 border border-white/10 text-xs gap-1 shrink-0 mb-2">
        <button
          type="button"
          data-testid="spaces-tab-wallpapers"
          onClick={() => setSpaceMainTab('wallpapers')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${
            spaceMainTab === 'wallpapers'
              ? 'bg-white/20 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ImageIcon size={13} strokeWidth={1.5} className="shrink-0" />
          <span className="whitespace-nowrap">Hình nền</span>
        </button>
        <button
          type="button"
          data-testid="spaces-tab-audio"
          onClick={() => setSpaceMainTab('audio')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${
            spaceMainTab === 'audio'
              ? 'bg-white/20 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Music size={13} strokeWidth={1.5} className="shrink-0" />
          <span className="whitespace-nowrap">Âm thanh & chuông</span>
        </button>
      </div>

      {spaceMainTab === 'audio' ? (
        <div className="flex-1 min-h-[380px] p-1">
          <AudioWidget />
        </div>
      ) : (
        <>
      {/* Header Info & Actions */}
      <div className="pb-1 border-b border-white/[0.06] space-y-1 shrink-0">
        <div className="flex items-center justify-between flex-nowrap shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-zinc-700/15 text-zinc-300 border border-zinc-500/25 shrink-0">
              <Palette size={14} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-xs truncate">Thư viện không gian</h3>
              <p className="text-[10px] text-neutral-400 truncate">Không gian nền</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="btn-toggle-adjustments"
              onClick={() => setActiveTab(activeTab === 'effects' ? 'wallpapers' : 'effects')}
              className={`p-1.5 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer min-w-[28px] min-h-[28px] border ${
                activeTab === 'effects'
                  ? 'bg-zinc-700/20 text-zinc-300 border-zinc-500/40'
                  : 'bg-white/[0.04] text-neutral-300 hover:text-white border-white/[0.06]'
              }`}
              title="Tinh chỉnh hiệu ứng nền (blur, brightness, overlay)"
            >
              <Sliders size={13} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              data-testid="btn-reset-bg"
              onClick={handleResetBackground}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Khôi phục nền mặc định"
            >
              <RotateCcw size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Fallback Notice */}
        {(hasError || useStaticFallback) && (
          <div
            data-testid="bg-fallback-indicator"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-700/10 border border-zinc-500/30 text-zinc-300 text-[11px]"
          >
            <AlertCircle size={13} className="shrink-0" />
            <span>Đang kích hoạt nền tĩnh an toàn</span>
          </div>
        )}

        {/* 2 Tab Chính: [Kho Hình Nền] & [Hiệu Ứng & Ánh Sáng] */}

      </div>

      {/* ========================================================= */}
      {/* TAB 1: KHO HÌNH NỀN (Ảnh tinh tuyển)     */}
      {/* ========================================================= */}
      {activeTab === 'wallpapers' && (
        <div className="flex-1 flex flex-col min-h-0 pt-2 space-y-2 overflow-hidden">
          {/* Hàng chọn nhanh Màu Đơn Sắc Chuẩn Zen (Pure Solid Colors) */}
          <div className="bg-black/40 p-1.5 rounded-xl border border-white/[0.06] space-y-1 shrink-0">
            <div className="hidden">
              <span className="font-semibold text-neutral-300">Đơn sắc chuẩn zen (pure flat)</span>
              <span className="text-[10px] text-zinc-400">100% không ảnh tĩnh tâm</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'zen-pure-black', label: 'Đen tuyền', color: '#09090b' },
                { id: 'zen-deep-graphite', label: 'Than chì', color: '#18181b' },
                { id: 'zen-night-blue', label: 'Xanh đêm', color: '#0b132b' }
              ].map((zen) => {
                const isSelected = activePresetId === zen.id;
                return (
                  <button
                    key={zen.id}
                    type="button"
                    data-testid={`zen-color-${zen.id}`}
                    onClick={() => handleSelectPreset(zen.id)}
                    className={`h-7 rounded-lg border flex items-center justify-center gap-1.5 px-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-zinc-400 border-white/40 scale-[1.02]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    style={{ backgroundColor: zen.color }}
                    title={zen.label}
                  >
                    <span className="text-[10px] font-medium text-zinc-300 drop-shadow-sm">{zen.label}</span>
                    {isSelected && <Check size={11} className="text-zinc-300" strokeWidth={1.5} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thanh tìm kiếm */}
          <div className="relative shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              aria-label="Tìm hình nền"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Tìm không gian nền (Lofi, anime, Tokyo, minimalist...)"
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#0e0e10] border border-white/[0.08] text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500/50"
            />
          </div>

          {/* Bộ lọc Danh mục 5 Gu Thẩm Mỹ Pinterest + All + Video */}
          <select aria-label="Danh mục hình nền" value={selectedCategory} onChange={event => handleCategorySelect(event.target.value as WallpaperCategory | 'video')} className="w-full min-w-0 shrink-0 rounded-lg border border-white/[0.06] bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100">
            {WALLPAPER_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
            <option value="video">Chuyển động</option>
          </select>

          {/* Lưới Ảnh Thumbnail (responsive 2-4 cột bo góc, hover mượt) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
            {/* 1. Nhóm Video Presets khi filter === 'video' hoặc 'all' (chỉ khi không tìm kiếm) */}
            {(selectedCategory === 'video' || (selectedCategory === 'all' && !searchQuery.trim())) && (
              <div data-testid="presets-grid" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,132px),1fr))] gap-2">
                {BACKGROUND_PRESETS.filter((p) =>
                  (selectedCategory === 'video'
                    ? p.category === 'video'
                    : p.category !== 'solid' && !p.id.startsWith('zen-') && p.id !== 'pure-black')
                ).map((preset) => {
                  const isSelected = activePresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`preset-card-${preset.id}`}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all p-1.5 flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                        isSelected
                          ? 'border-zinc-500 bg-zinc-950/30 shadow-md ring-1 ring-zinc-500/50'
                          : 'border-white/[0.08] bg-black/30 hover:bg-black/50 hover:border-white/20'
                      }`}
                    >
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-900 mb-1 border border-white/5">
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=60';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-semibold backdrop-blur-md bg-black/70 text-neutral-300 border border-white/10 flex items-center gap-1">
                          {preset.category === 'video' ? (
                            <>
                              <Video size={8} className="text-zinc-300" /> Video
                            </>
                          ) : (
                            <>
                              <ImageIcon size={8} className="text-zinc-300" /> Tuyển chọn
                            </>
                          )}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-700 text-white flex items-center justify-center shadow">
                            <Check size={11} strokeWidth={1.5} />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-medium text-neutral-200 truncate group-hover:text-zinc-300">
                          {preset.title}
                        </h4>
                        <p className="text-[9px] text-zinc-400 truncate">{preset.author}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Nhóm Hình Nền Tuyển Chọn Pinterest */}
            {selectedCategory !== 'video' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,132px),1fr))] gap-2">
                {loadedWallpapers.map((item) => {
                  const isItemPro = item.category === 'cyberpunk-tokyo';
                  const isLocked = !isPro && isItemPro;
                  const isSelected = customUrl === item.fullUrl;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={isLocked ? 'spaces-pro-item' : undefined}
                      onClick={() => {
                        if (isLocked) {
                          router.navigate('/billing');
                        } else {
                          cleanupPrevBlobUrl();
                          setCustomBackground(item.fullUrl, 'image');
                        }
                      }}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all p-1.5 flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                        isSelected
                          ? 'border-zinc-500 bg-zinc-950/30 shadow-md ring-1 ring-zinc-500/50'
                          : 'border-white/[0.08] bg-black/30 hover:bg-black/50 hover:border-white/20'
                      }`}
                      title={isLocked ? `${item.title} (Gói PRO)` : item.title}
                    >
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-900 mb-1 border border-white/5">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=60';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-semibold backdrop-blur-md bg-black/60 text-neutral-300 border border-white/10 capitalize">
                          {item.category.replace('-', ' ')}
                        </span>
                        {isLocked && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-zinc-700 text-white font-black text-[8px] normal-case tracking-wider shadow">
                            PRO
                          </span>
                        )}
                        {isSelected && !isLocked && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-700 text-white flex items-center justify-center shadow">
                            <Check size={11} strokeWidth={1.5} />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-medium text-neutral-200 truncate group-hover:text-zinc-300 flex items-center">
                          {isLocked && <Lock size={11} strokeWidth={1.5} className="inline mr-1 text-zinc-400 shrink-0" />}
                          <span className="truncate">{item.title}</span>
                        </h4>
                        <p className="text-[9px] text-zinc-400 truncate">{item.author}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Nút Tải Thêm (Pagination / Lazy loading batch 24 ảnh) */}
            {hasMore && selectedCategory !== 'video' && (
              <div className="pt-2 pb-1 text-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer"
                >
                  Tải thêm hình nền ({loadedWallpapers.length} / {total})
                </button>
              </div>
            )}
          </div>

          {/* Drawer thu gọn: Tải lên & Nhập link URL */}
          <div className="shrink-0 pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowUploadDrawer(!showUploadDrawer)}
              className="w-full py-1 text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center justify-between cursor-pointer"
            >
              <span>Tải ảnh từ máy / dán URL tùy chỉnh</span>
              {showUploadDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showUploadDrawer && (
              <div className="pt-2 space-y-2">
                {/* File Upload Button */}
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="bg-file-input"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-center text-[11px] text-neutral-200 cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Upload size={12} className="text-zinc-300" />
                    <span>Chọn tệp tin từ máy ({savedUploads.length})</span>
                  </label>
                  <input
                    id="bg-file-input"
                    data-testid="input-custom-bg-file"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Form URL */}
                <form onSubmit={validateAndApplyUrl} className="space-y-1">
                  {urlError && <p className="text-[10px] text-rose-400">{urlError}</p>}
                  <div className="flex gap-1">
                    <select
                      value={customInputType}
                      onChange={(e) => setCustomInputType(e.target.value as 'image' | 'video')}
                      className="bg-[#0e0e10] border border-white/[0.08] rounded-md px-1.5 py-1 text-[11px] text-neutral-300 focus:outline-none"
                    >
                      <option value="image">Ảnh</option>
                      <option value="video">Video</option>
                    </select>

                    <input
                      type="url"
                      data-testid="input-custom-bg-url"
                      placeholder="https://... URL trực tiếp"
                      value={customInputUrl}
                      onChange={(e) => {
                        setCustomInputUrl(e.target.value);
                        setUrlError(null);
                      }}
                      className="flex-1 min-w-0 bg-[#0e0e10] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500/50"
                    />

                    <button
                      type="submit"
                      data-testid="btn-apply-custom-bg"
                      disabled={!customInputUrl.trim()}
                      className="px-2.5 py-1 rounded-md bg-zinc-700 hover:bg-zinc-700 disabled:opacity-40 text-white font-semibold text-[11px] transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      Dán
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HIỆU ỨNG & ÁNH SÁNG (Blur, Brightness, Dimmer, Live)*/}
      {/* ========================================================= */}
      {activeTab === 'effects' && (
        <div
          data-testid="bg-adjustments-panel"
          className="flex-1 flex flex-col justify-between py-2 space-y-3 overflow-y-auto pr-0.5 text-xs"
        >
          <div className="space-y-3.5">
            {/* Độ mờ hậu cảnh */}
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Độ mờ hậu cảnh</span>
                <span className="text-zinc-300 font-mono font-semibold">{blurLevel}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                value={blurLevel}
                data-testid="slider-blur"
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <p className="text-[10px] text-zinc-400">Làm mờ ảnh nền giúp các thẻ widget nổi bật, dễ đọc hơn.</p>
            </div>

            {/* Độ sáng nền */}
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Độ sáng nền</span>
                <span className="text-zinc-300 font-mono font-semibold">{brightnessLevel}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={brightnessLevel}
                data-testid="slider-brightness"
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <p className="text-[10px] text-zinc-400">Tăng giảm độ chói sáng của hình nền từ 50% đến 150%.</p>
            </div>

            {/* Lớp phủ tối */}
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Lớp phủ tối</span>
                <span className="text-zinc-300 font-mono font-semibold">{overlayOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="75"
                value={overlayOpacity}
                data-testid="slider-overlay"
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <p className="text-[10px] text-zinc-400">Phủ màn đen trong suốt để tăng tối đa độ tương phản chữ.</p>
            </div>

            {/* Hiệu ứng hạt môi trường */}
            <div className="space-y-2 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <span className="block text-neutral-300 font-medium text-xs">Hiệu ứng môi trường</span>
              <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                {[
                  { id: 'none', label: 'Tắt', icon: <Sparkles size={12} /> },
                  { id: 'rain', label: 'Mưa', icon: <CloudRain size={12} /> },
                  { id: 'snow', label: 'Tuyết', icon: <Snowflake size={12} /> },
                  { id: 'sakura', label: 'Anh đào', icon: <Flower2 size={12} /> },
                  { id: 'fireflies', label: 'Đom đóm', icon: <Zap size={12} /> }
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`ambient-particle-${id}`}
                    onClick={() => setAmbientEffect(id as AmbientEffectType)}
                    className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border cursor-pointer transition-colors ${
                      ambientEffect === id
                        ? 'bg-zinc-700/20 border-zinc-500/40 text-zinc-300 font-semibold'
                        : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nút quay lại kho ảnh */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('wallpapers')}
              className="w-full py-2 rounded-xl bg-zinc-700 hover:bg-zinc-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Xem kho hình nền
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
