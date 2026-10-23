import React, { useState } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  Video,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useBackgroundStore } from '../stores/useBackgroundStore';
import { BackgroundCategory } from '../types/background';

export const SpacesWidget: React.FC = () => {
  const {
    presets,
    activePresetId,
    blurLevel,
    brightnessLevel,
    overlayOpacity,
    hasError,
    useStaticFallback,
    selectPreset,
    setCustomBackground,
    setBlur,
    setBrightness,
    setOverlayOpacity,
    resetBackground
  } = useBackgroundStore();

  const [selectedCategory, setSelectedCategory] = useState<BackgroundCategory>('all');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputType, setCustomInputType] = useState<'image' | 'video'>('image');
  const [showSliders, setShowSliders] = useState(false);

  const filteredPresets = presets.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInputUrl.trim()) {
      setCustomBackground(customInputUrl.trim(), customInputType);
      setCustomInputUrl('');
    }
  };

  return (
    <div
      data-testid="spaces-widget"
      className="flex h-full w-full flex-col text-slate-100 p-2"
    >
      {/* Header Info & Category Filters */}
      <div className="pb-3 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Palette size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Thư Viện Không Gian (Spaces)</h3>
              <p className="text-[11px] text-slate-400">Chọn bối cảnh tĩnh hoặc video vòng lặp</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="btn-toggle-adjustments"
              onClick={() => setShowSliders(!showSliders)}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                showSliders
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Tinh chỉnh hiệu ứng nền (Blur, Brightness, Overlay)"
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">Chỉnh hiệu ứng</span>
            </button>

            <button
              type="button"
              data-testid="btn-reset-bg"
              onClick={resetBackground}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 bg-slate-800/80 transition"
              title="Khôi phục nền mặc định"
            >
              <RotateCcw size={13} />
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

        {/* Category Tabs */}
        <div className="flex rounded-xl bg-slate-950/60 p-1 border border-white/5 text-xs">
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
              className={`flex-1 py-1 rounded-lg font-medium transition ${
                selectedCategory === id
                  ? 'bg-slate-800 text-cyan-400 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments Panel (Blur, Brightness, Overlay) */}
      {showSliders && (
        <div
          data-testid="bg-adjustments-panel"
          className="my-3 p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Độ mờ hậu cảnh (Blur)</span>
            <span className="text-cyan-400 font-mono">{blurLevel}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={blurLevel}
            data-testid="slider-blur"
            onChange={(e) => setBlur(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Độ sáng (Brightness)</span>
            <span className="text-cyan-400 font-mono">{brightnessLevel}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="150"
            value={brightnessLevel}
            data-testid="slider-brightness"
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Lớp phủ tối tương phản (Overlay)</span>
            <span className="text-cyan-400 font-mono">{overlayOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            value={overlayOpacity}
            data-testid="slider-overlay"
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      )}

      {/* Preset Grid */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
        <div className="grid grid-cols-2 gap-2.5">
          {filteredPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`preset-card-${preset.id}`}
                onClick={() => selectPreset(preset.id)}
                className={`relative group rounded-2xl overflow-hidden border text-left transition-all p-2 flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'border-white/5 bg-slate-900/60 hover:border-white/20'
                }`}
              >
                {/* Thumbnail Preview */}
                <div className="relative w-full h-20 rounded-xl overflow-hidden bg-slate-950 mb-2 border border-white/5">
                  <img
                    src={preset.thumbnailUrl}
                    alt={preset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge Category */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md bg-slate-900/80 text-slate-300 border border-white/10 flex items-center gap-1">
                    {preset.category === 'video' ? (
                      <>
                        <Video size={10} className="text-sky-400" /> Video
                      </>
                    ) : preset.category === 'image' ? (
                      <>
                        <ImageIcon size={10} className="text-emerald-400" /> Ảnh
                      </>
                    ) : (
                      <>
                        <Sparkles size={10} className="text-indigo-400" /> Tối giản
                      </>
                    )}
                  </span>

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>

                {/* Preset Information */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {preset.author}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom URL Input Bar */}
      <form onSubmit={handleApplyCustom} className="pt-3 border-t border-white/5">
        <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
          Hoặc dán URL hình nền / video bên ngoài:
        </label>
        <div className="flex gap-1.5">
          <select
            value={customInputType}
            onChange={(e) => setCustomInputType(e.target.value as 'image' | 'video')}
            className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="image">Ảnh</option>
            <option value="video">Video</option>
          </select>

          <input
            type="url"
            data-testid="input-custom-bg-url"
            placeholder="https://... direct link"
            value={customInputUrl}
            onChange={(e) => setCustomInputUrl(e.target.value)}
            className="flex-1 min-w-0 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />

          <button
            type="submit"
            data-testid="btn-apply-custom-bg"
            disabled={!customInputUrl.trim()}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition"
          >
            Dán
          </button>
        </div>
      </form>
    </div>
  );
};
