import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronUp
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
import { db, CustomBackgroundRecord } from '../db';

export const SpacesWidget: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPro = user?.plan === 'pro' || user?.plan === 'pro_sandbox';

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

    setCustomBackground(trimmed, customInputType);
    setCustomInputUrl('');
  };

  // Upload tệp tin cục bộ
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    const id = `upload_${Date.now()}`;
    const record: CustomBackgroundRecord = {
      id,
      name: file.name,
      blob: file,
      mediaType,
      mimeType: file.type,
      sizeBytes: file.size,
      createdAt: Date.now()
    };

    await db.custom_backgrounds.put(record);
    setSavedUploads((prev) => [record, ...prev]);

    const objectUrl = URL.createObjectURL(file);
    setCustomBackground(objectUrl, mediaType);
  };

  return (
    <div
      data-testid="spaces-widget"
      className="flex h-full w-full max-w-[340px] max-h-[480px] flex-col text-slate-100 p-2 select-none overflow-hidden"
    >
      {/* Header Info & Actions */}
      <div className="pb-2 border-b border-white/[0.08] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 shrink-0">
              <Palette size={14} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-xs truncate">Thư Viện Không Gian</h3>
              <p className="text-[10px] text-neutral-400 truncate">1.000+ hình nền tuyển chọn Pinterest & Ambient</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="btn-toggle-adjustments"
              onClick={() => setActiveTab(activeTab === 'effects' ? 'wallpapers' : 'effects')}
              className={`p-1.5 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer min-w-[28px] min-h-[28px] border ${
                activeTab === 'effects'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/[0.04] text-neutral-300 hover:text-white border-white/[0.06]'
              }`}
              title="Tinh chỉnh hiệu ứng nền (Blur, Brightness, Overlay)"
            >
              <Sliders size={13} strokeWidth={1.75} />
            </button>

            <button
              type="button"
              data-testid="btn-reset-bg"
              onClick={resetBackground}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Khôi phục nền mặc định"
            >
              <RotateCcw size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Fallback Notice */}
        {(hasError || useStaticFallback) && (
          <div
            data-testid="bg-fallback-indicator"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]"
          >
            <AlertCircle size={13} className="shrink-0" />
            <span>Đang kích hoạt nền tĩnh an toàn</span>
          </div>
        )}

        {/* 2 Tab Chính: [Kho Hình Nền] & [Hiệu Ứng & Ánh Sáng] */}
        <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10 text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('wallpapers')}
            className={`flex-1 py-1 rounded-md font-medium transition cursor-pointer min-h-[28px] flex items-center justify-center gap-1.5 text-xs ${
              activeTab === 'wallpapers'
                ? 'bg-white/15 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Palette size={12} />
            <span>Kho Hình Nền</span>
            <span className="sr-only">Thư viện Tuyển Chọn</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('effects')}
            className={`flex-1 py-1 rounded-md font-medium transition cursor-pointer min-h-[28px] flex items-center justify-center gap-1.5 text-xs ${
              activeTab === 'effects'
                ? 'bg-white/15 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders size={12} />
            <span>Hiệu Ứng & Ánh Sáng</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: KHO HÌNH NỀN (1.000+ Ảnh Pinterest Aesthetic)     */}
      {/* ========================================================= */}
      {activeTab === 'wallpapers' && (
        <div className="flex-1 flex flex-col min-h-0 pt-2 space-y-2 overflow-hidden">
          {/* Thanh tìm kiếm */}
          <div className="relative shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm 1.000+ ảnh (Lofi, Anime, Tokyo, Minimalist...)"
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#0e0e10] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Bộ lọc Danh mục 5 Gu Thẩm Mỹ Pinterest + All + Video */}
          <div className="flex gap-1 overflow-x-auto pb-1 shrink-0 scrollbar-none text-[10px]">
            {/* Nút All (data-testid cho E2E) */}
            <button
              type="button"
              data-testid="filter-cat-all"
              onClick={() => handleCategorySelect('all')}
              className={`px-2 py-1 rounded-md shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white border-white/[0.06]'
              }`}
            >
              <span>🌌</span>
              <span>Tất cả</span>
            </button>

            {WALLPAPER_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
              <button
                key={cat.id}
                type="button"
                data-testid={`filter-cat-${cat.id}`}
                onClick={() => handleCategorySelect(cat.id as WallpaperCategory)}
                className={`px-2 py-1 rounded-md shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-white/[0.03] text-neutral-400 hover:text-white border-white/[0.06]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}

            {/* Video Motion Preset Filter (data-testid cho E2E) */}
            <button
              type="button"
              data-testid="filter-cat-video"
              onClick={() => handleCategorySelect('video')}
              className={`px-2 py-1 rounded-md shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'video'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white border-white/[0.06]'
              }`}
            >
              <Video size={10} className="text-sky-400" />
              <span>Chuyển Động (Video)</span>
            </button>
          </div>

          {/* Freemium PRO Banner */}
          {!isPro && (
            <div
              data-testid="spaces-pro-upgrade-banner"
              className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-xs shrink-0"
            >
              <div className="flex items-center gap-1.5 text-amber-300 min-w-0">
                <Sparkles size={12} className="shrink-0" />
                <span className="text-[10px] font-medium truncate">Mở khóa toàn bộ 1.000+ ảnh 4K & Cyberpunk</span>
              </div>
              <button
                type="button"
                data-testid="spaces-pro-upgrade-btn"
                onClick={() => router.navigate('/billing')}
                className="px-2 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[10px] transition shrink-0 cursor-pointer"
              >
                Nâng cấp
              </button>
            </div>
          )}

          {/* Lưới Ảnh Thumbnail (2 cột bo góc, hover mượt) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {/* 1. Nhóm Video Presets khi filter === 'video' hoặc 'all' (chỉ khi không tìm kiếm) */}
            {(selectedCategory === 'video' || (selectedCategory === 'all' && !searchQuery.trim())) && (
              <div className="grid grid-cols-2 gap-2">
                {BACKGROUND_PRESETS.filter((p) =>
                  selectedCategory === 'video' ? p.category === 'video' : true
                ).map((preset) => {
                  const isSelected = activePresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`preset-card-${preset.id}`}
                      onClick={() => selectPreset(preset.id)}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all p-1.5 flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 shadow-md ring-1 ring-cyan-500/50'
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
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider backdrop-blur-md bg-black/70 text-neutral-300 border border-white/10 flex items-center gap-1">
                          {preset.category === 'video' ? (
                            <>
                              <Video size={8} className="text-sky-400" /> Video
                            </>
                          ) : (
                            <>
                              <ImageIcon size={8} className="text-emerald-400" /> Tuyển chọn
                            </>
                          )}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-medium text-neutral-200 truncate group-hover:text-cyan-300">
                          {preset.title}
                        </h4>
                        <p className="text-[9px] text-neutral-500 truncate">{preset.author}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Nhóm 1.000+ Hình Nền Tuyển Chọn Pinterest */}
            {selectedCategory !== 'video' && (
              <div className="grid grid-cols-2 gap-2">
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
                          setCustomBackground(item.fullUrl, 'image');
                        }
                      }}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all p-1.5 flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 shadow-md ring-1 ring-cyan-500/50'
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
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-black text-[8px] uppercase tracking-wider shadow">
                            PRO
                          </span>
                        )}
                        {isSelected && !isLocked && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-medium text-neutral-200 truncate group-hover:text-cyan-300">
                          {isLocked ? `🔒 ${item.title}` : item.title}
                        </h4>
                        <p className="text-[9px] text-neutral-500 truncate">{item.author}</p>
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
              <span>Tải ảnh từ máy / Dán URL tùy chỉnh</span>
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
                    <Upload size={12} className="text-cyan-400" />
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
                      className="flex-1 min-w-0 bg-[#0e0e10] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
                    />

                    <button
                      type="submit"
                      data-testid="btn-apply-custom-bg"
                      disabled={!customInputUrl.trim()}
                      className="px-2.5 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold text-[11px] transition cursor-pointer disabled:cursor-not-allowed"
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
            {/* Độ mờ hậu cảnh (Blur) */}
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Độ mờ hậu cảnh (Blur)</span>
                <span className="text-cyan-400 font-mono font-semibold">{blurLevel}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                value={blurLevel}
                data-testid="slider-blur"
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <p className="text-[10px] text-neutral-500">Làm mờ ảnh nền giúp các thẻ widget nổi bật, dễ đọc hơn.</p>
            </div>

            {/* Độ sáng hậu cảnh (Brightness) */}
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Độ sáng (Brightness)</span>
                <span className="text-cyan-400 font-mono font-semibold">{brightnessLevel}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={brightnessLevel}
                data-testid="slider-brightness"
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <p className="text-[10px] text-neutral-500">Tăng giảm độ chói sáng của hình nền từ 50% đến 150%.</p>
            </div>

            {/* Lớp phủ tương phản (Dimmer / Overlay) */}
            <div className="space-y-1.5 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">Lớp phủ tối tương phản (Dimmer)</span>
                <span className="text-cyan-400 font-mono font-semibold">{overlayOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="75"
                value={overlayOpacity}
                data-testid="slider-overlay"
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <p className="text-[10px] text-neutral-500">Phủ màn đen trong suốt để tăng tối đa độ tương phản chữ.</p>
            </div>

            {/* Hiệu ứng hạt Ambient (Live Canvas Particles) */}
            <div className="space-y-2 bg-black/25 p-2.5 rounded-xl border border-white/[0.06]">
              <span className="block text-neutral-300 font-medium text-xs">Hiệu ứng hạt Ambient (Live Canvas)</span>
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
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
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
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
            >
              Xem Kho Hình Nền (1.000+ Ảnh)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
