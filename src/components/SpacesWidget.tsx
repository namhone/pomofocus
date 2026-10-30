import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useBackgroundStore } from '../stores/useBackgroundStore';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { BackgroundCategory, CatalogCategory, AmbientEffectType } from '../types/background';
import { CATALOG_CATEGORIES, queryCatalog } from '../data/backgroundCatalog';
import { db, CustomBackgroundRecord } from '../db';

export const SpacesWidget: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPro = user?.plan === 'pro' || user?.plan === 'pro_sandbox';
  const {
    presets,
    activePresetId,
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

  const [activeTab, setActiveTab] = useState<'presets' | 'catalog' | 'upload'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<BackgroundCategory>('all');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputType, setCustomInputType] = useState<'image' | 'video'>('image');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showSliders, setShowSliders] = useState(false);

  // Catalog state (600 Desktop + 100 Mobile)
  const [catalogCategory, setCatalogCategory] = useState<CatalogCategory>('all');
  const [catalogOrientation, setCatalogOrientation] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);

  // Local uploads list from Dexie
  const [savedUploads, setSavedUploads] = useState<CustomBackgroundRecord[]>([]);

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

  const filteredPresets = presets.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const catalogResult = queryCatalog({
    category: catalogCategory,
    orientation: catalogOrientation,
    query: catalogSearch,
    page: catalogPage,
    pageSize: 24
  });

  // URL Scheme validation
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

  // Upload local file to IndexedDB
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
      className="flex h-full w-full flex-col text-slate-100 p-1 select-none"
    >
      {/* Header Info & Category Filters */}
      <div className="pb-2.5 border-b border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
              <Palette size={15} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-medium text-white text-xs">Thư Viện Không Gian</h3>
              <p className="text-[10px] text-neutral-400">101 hình nền tuyển chọn HD, ambient và tùy chỉnh</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="btn-toggle-adjustments"
              onClick={() => setShowSliders(!showSliders)}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer min-h-[30px] border ${
                showSliders
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/[0.04] text-neutral-300 hover:text-white border-white/[0.06]'
              }`}
              title="Tinh chỉnh hiệu ứng nền (Blur, Brightness, Overlay)"
            >
              <Sliders size={13} strokeWidth={1.75} />
              <span className="text-[11px] font-medium">{showSliders ? 'Đóng hiệu ứng' : 'Hiệu ứng & Hạt'}</span>
            </button>

            <button
              type="button"
              data-testid="btn-reset-bg"
              onClick={resetBackground}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer min-w-[30px] min-h-[30px] flex items-center justify-center"
              title="Khôi phục nền mặc định"
            >
              <RotateCcw size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Warning Badge if Fallback is active */}
        {(hasError || useStaticFallback) && (
          <div
            data-testid="bg-fallback-indicator"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>Đang kích hoạt chế độ nền tĩnh dự phòng (An toàn / Tiết kiệm pin)</span>
          </div>
        )}

        {/* Navigation Tabs (Presets / 700+ Catalog / Local Upload) */}
        <div className="flex rounded-xl bg-black/30 p-0.5 border border-white/10 text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1 rounded-lg font-medium transition cursor-pointer min-h-[28px] ${
              activeTab === 'presets'
                ? 'bg-white/15 text-white shadow-sm border border-white/15'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Mặc định
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-1 rounded-lg font-medium transition cursor-pointer min-h-[28px] ${
              activeTab === 'catalog'
                ? 'bg-white/15 text-white shadow-sm border border-white/15'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Thư viện Tuyển Chọn (101 HD)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1 rounded-lg font-medium transition cursor-pointer min-h-[28px] ${
              activeTab === 'upload'
                ? 'bg-white/15 text-white shadow-sm border border-white/15'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tải lên của tôi
          </button>
        </div>

        {/* Presets Sub-tabs for E2E Test Compatibility */}
        {activeTab === 'presets' && (
          <div className="flex rounded-xl bg-white/[0.02] p-0.5 border border-white/[0.04] text-[11px] gap-1">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'video', label: 'Động (Video)' },
              { id: 'image', label: 'Tĩnh (Ảnh)' },
              { id: 'gradient', label: 'Tối giản' }
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                data-testid={`filter-cat-${id}`}
                onClick={() => setSelectedCategory(id as BackgroundCategory)}
                className={`flex-1 py-1 rounded-md font-medium transition cursor-pointer min-h-[26px] ${
                  selectedCategory === id
                    ? 'bg-white/15 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Adjustments Panel (Blur, Brightness, Dimmer / Overlay & Live Particles) */}
      {showSliders && (
        <div
          data-testid="bg-adjustments-panel"
          className="my-2.5 p-3 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 space-y-2 text-xs shrink-0"
        >
          {/* Blur (0 - 16px) */}
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Độ mờ hậu cảnh (Blur)</span>
            <span className="text-cyan-400 font-mono">{blurLevel}px</span>
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

          {/* Brightness (50 - 150%) */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-neutral-300">Độ sáng (Brightness)</span>
            <span className="text-cyan-400 font-mono">{brightnessLevel}%</span>
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

          {/* Overlay / Dimmer (0 - 75%) */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-neutral-300">Lớp phủ tối tương phản (Dimmer)</span>
            <span className="text-cyan-400 font-mono">{overlayOpacity}%</span>
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

          {/* Ambient Live Canvas Particles */}
          <div className="pt-2 border-t border-white/[0.06]">
            <span className="block text-neutral-300 mb-1.5 font-medium">Hiệu ứng hạt Ambient (Live Canvas)</span>
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              {[
                { id: 'none', label: 'Tắt', icon: <Sparkles size={11} /> },
                { id: 'rain', label: 'Mưa', icon: <CloudRain size={11} /> },
                { id: 'snow', label: 'Tuyết', icon: <Snowflake size={11} /> },
                { id: 'sakura', label: 'Anh đào', icon: <Flower2 size={11} /> },
                { id: 'fireflies', label: 'Đom đóm', icon: <Zap size={11} /> }
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`ambient-particle-${id}`}
                  onClick={() => setAmbientEffect(id as AmbientEffectType)}
                  className={`py-1 px-1 rounded-md flex flex-col items-center justify-center gap-0.5 border cursor-pointer transition-colors ${
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
      )}

      {/* TAB 1: Default Presets */}
      {activeTab === 'presets' && (
        <div className="flex-1 overflow-y-auto py-2.5 space-y-2 pr-1">
          <div className="grid grid-cols-2 gap-2">
            {filteredPresets.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-card-${preset.id}`}
                  onClick={() => selectPreset(preset.id)}
                  className={`relative group rounded-xl overflow-hidden border text-left transition-all p-2 flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-md ring-1 ring-cyan-500/50'
                      : 'border-white/[0.08] bg-black/25 hover:bg-black/40 hover:border-white/20'
                  }`}
                >
                  <div className="relative w-full h-20 rounded-lg overflow-hidden bg-black mb-2 border border-white/5">
                    <img
                      src={preset.thumbnailUrl}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider backdrop-blur-md bg-black/70 text-neutral-300 border border-white/10 flex items-center gap-1">
                      {preset.category === 'video' ? (
                        <>
                          <Video size={9} className="text-sky-400" /> Video
                        </>
                      ) : preset.category === 'image' ? (
                        <>
                          <ImageIcon size={9} className="text-emerald-400" /> Ảnh
                        </>
                      ) : (
                        <>
                          <Sparkles size={9} className="text-indigo-400" /> Tối giản
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
                    <h4 className="text-xs font-medium text-neutral-200 truncate group-hover:text-cyan-300">
                      {preset.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">{preset.author}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Catalog 700+ Entries */}
      {activeTab === 'catalog' && (
        <div className="flex-1 flex flex-col overflow-hidden py-2 space-y-2">
          {/* Search & Category Filter */}
          <div className="space-y-1.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => {
                  setCatalogSearch(e.target.value);
                  setCatalogPage(1);
                }}
                placeholder="Tìm không gian (Cyberpunk, Anime, Nature...)"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0e0e10] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Category selection */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
              {CATALOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCatalogCategory(cat.id);
                    setCatalogPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-full shrink-0 border transition-colors cursor-pointer ${
                    catalogCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-white border-white/[0.06]'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Orientation Filter */}
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <div className="flex items-center gap-1">
                {(['all', 'desktop', 'mobile'] as const).map((ori) => (
                  <button
                    key={ori}
                    type="button"
                    onClick={() => {
                      setCatalogOrientation(ori);
                      setCatalogPage(1);
                    }}
                    className={`px-1.5 py-0.5 rounded uppercase font-medium ${
                      catalogOrientation === ori ? 'bg-white/20 text-white' : 'hover:text-white'
                    }`}
                  >
                    {ori === 'all' ? 'Tất cả' : ori === 'desktop' ? '16:9 Desktop' : '9:16 Mobile'}
                  </button>
                ))}
              </div>
              <span className="font-mono text-cyan-400 text-[10px]">
                {catalogResult.total} mục ({catalogResult.uniqueSeedCount} ảnh độc nhất 100%)
              </span>
            </div>
          </div>

          {/* Freemium PRO Banner in Catalog */}
          {!isPro && (
            <div
              data-testid="spaces-pro-upgrade-banner"
              className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-xs"
            >
              <div className="flex items-center gap-1.5 text-amber-300">
                <Sparkles size={13} className="shrink-0" />
                <span className="text-[11px] font-medium">Gói PRO: Mở khóa hình nền Cyberpunk & hạt 4K</span>
              </div>
              <button
                type="button"
                data-testid="spaces-pro-upgrade-btn"
                onClick={() => router.navigate('/billing')}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[10px] transition shrink-0 cursor-pointer"
              >
                Nâng cấp
              </button>
            </div>
          )}

          {/* Grid items */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            <div className="grid grid-cols-3 gap-1.5">
              {catalogResult.items.map((item) => {
                const isItemPro = item.tags.includes('cyberpunk') || item.category === 'cyberpunk';
                const isLocked = !isPro && isItemPro;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={isLocked ? 'spaces-pro-item' : undefined}
                    onClick={() => {
                      if (isLocked) {
                        router.navigate('/billing');
                      } else {
                        setCustomBackground(item.url, 'image');
                      }
                    }}
                    className="group relative rounded-lg overflow-hidden border border-white/[0.06] hover:border-cyan-500/50 text-left aspect-video bg-black cursor-pointer transition-all"
                    title={isLocked ? `${item.title} (Gói PRO)` : item.title}
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {isLocked && (
                      <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-amber-400 text-neutral-950 font-black text-[8px] uppercase tracking-wider shadow">
                        PRO
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1 flex items-end">
                      <span className="text-[9px] text-white truncate font-medium">
                        {isLocked ? `🔒 ${item.title}` : item.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs">
            <button
              type="button"
              disabled={catalogPage <= 1}
              onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-neutral-400 font-mono">
              Trang {catalogPage} / {catalogResult.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={catalogPage >= catalogResult.totalPages}
              onClick={() => setCatalogPage((p) => Math.min(catalogResult.totalPages, p + 1))}
              className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Local Uploads (IndexedDB) */}
      {activeTab === 'upload' && (
        <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
          {/* File Picker */}
          <div className="border border-dashed border-white/20 rounded-xl p-4 text-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <Upload size={22} className="mx-auto mb-2 text-cyan-400" />
            <p className="text-xs font-medium text-white mb-1">Chọn ảnh hoặc video từ máy tính</p>
            <p className="text-[10px] text-neutral-400 mb-3">Lưu trữ bảo mật trong trình duyệt (IndexedDB)</p>
            <label
              htmlFor="bg-file-input"
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer inline-block transition-colors"
            >
              Chọn tệp tin
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

          {/* List of previously saved custom backgrounds */}
          <div>
            <h4 className="text-xs font-medium text-neutral-300 mb-2">Đã lưu trong máy ({savedUploads.length})</h4>
            {savedUploads.length === 0 ? (
              <p className="text-[11px] text-neutral-500 italic">Chưa có tệp nào được tải lên.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {savedUploads.map((record) => {
                  const url = URL.createObjectURL(record.blob);
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setCustomBackground(url, record.mediaType)}
                      className="p-2 rounded-xl bg-[#0e0e10] border border-white/[0.08] hover:border-cyan-500/40 text-left text-xs space-y-1 cursor-pointer transition-colors"
                    >
                      <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        {record.mediaType === 'video' ? (
                          <Video size={16} className="text-sky-400" />
                        ) : (
                          <ImageIcon size={16} className="text-emerald-400" />
                        )}
                      </div>
                      <span className="block text-[10px] text-neutral-400 font-mono">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom URL Input Bar (always present at bottom for test compatibility) */}
      <form onSubmit={validateAndApplyUrl} className="pt-2 border-t border-white/[0.06] mt-auto">
        <label className="block text-[10px] font-medium text-neutral-400 mb-1">
          Hoặc dán URL hình ảnh/video trực tiếp (hỗ trợ http, https, data, blob):
        </label>
        {urlError && <p className="text-[10px] text-rose-400 mb-1">{urlError}</p>}
        <div className="flex gap-1.5">
          <select
            value={customInputType}
            onChange={(e) => setCustomInputType(e.target.value as 'image' | 'video')}
            className="bg-[#0e0e10] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-neutral-300 focus:outline-none"
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
            className="flex-1 min-w-0 bg-[#0e0e10] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
          />

          <button
            type="submit"
            data-testid="btn-apply-custom-bg"
            disabled={!customInputUrl.trim()}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold text-xs transition cursor-pointer disabled:cursor-not-allowed"
          >
            Dán
          </button>
        </div>
      </form>
    </div>
  );
};
