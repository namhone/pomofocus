import React, { useState } from 'react';
import {
  Film,
  ExternalLink,
  Trash2,
  ListMusic,
  Check,
  Sparkles
} from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { extractYouTubeEmbedUrl } from '../utils/media';

const PRESET_STATIONS = [
  {
    name: 'Lofi Girl - Chill / Study',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    name: 'Synthwave Radio Live',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY'
  },
  {
    name: 'Coffee Shop Lofi Vibes',
    url: 'https://www.youtube.com/watch?v=h2zkV-l_TbY'
  },
  {
    name: 'Quiet Rain & Relaxing Piano',
    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54'
  }
];

export const MediaWidget: React.FC = () => {
  const {
    customMusicUrl,
    setCustomMusicUrl,
    setCustomMusicPlaying,
    setCustomMusicError,
    customMusicError
  } = useAudioStore();

  const [inputUrl, setInputUrl] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Nếu customMusicUrl chưa có, tự động dùng Lofi Girl mặc định khi người dùng mở Media
  const activeUrl = customMusicUrl || 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
  const youtubeEmbedUrl = extractYouTubeEmbedUrl(activeUrl);

  const handleApplyUrl = (urlToApply: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed) {
      setCustomMusicUrl('');
      setCustomMusicPlaying(false);
      return;
    }
    const embed = extractYouTubeEmbedUrl(trimmed);
    if (!embed) {
      setCustomMusicError('Vui lòng nhập đường dẫn YouTube hợp lệ (video hoặc live stream)');
      return;
    }
    setCustomMusicError(null);
    setCustomMusicUrl(trimmed, 'youtube');
    setCustomMusicPlaying(true);
    setShowPicker(false);
    setInputUrl('');
  };

  return (
    <div
      data-testid="media-widget-root"
      className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none"
    >
      {/* 100% Video Display */}
      {youtubeEmbedUrl ? (
        <div className="relative w-full h-full flex-1 bg-black group overflow-hidden">
          <iframe
            src={youtubeEmbedUrl}
            title="YouTube Media Player"
            data-testid="media-youtube-iframe"
            className="w-full h-full border-0 aspect-video rounded-b-[18px] bg-black block"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />

          {/* Floating Subtle Station Switcher Trigger (Hiện khi hover hoặc bấm) */}
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 z-20 pointer-events-auto">
            <button
              type="button"
              data-testid="btn-toggle-media-picker"
              onClick={() => setShowPicker(!showPicker)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-900/85 hover:bg-neutral-800 text-neutral-200 border border-white/15 backdrop-blur-md shadow-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Đổi trạm hoặc nhập link YouTube mới"
            >
              <ListMusic size={12} className="text-neutral-300" />
              <span>Đổi trạm</span>
            </button>
            <button
              type="button"
              data-testid="btn-clear-media"
              onClick={() => {
                setCustomMusicUrl('');
                setCustomMusicPlaying(false);
              }}
              className="p-1 rounded-md bg-neutral-900/85 hover:bg-rose-950/80 text-neutral-400 hover:text-rose-300 border border-white/15 backdrop-blur-md shadow-lg transition-all cursor-pointer"
              title="Tắt video"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ) : (
        /* Empty State / URL Input */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-950/90 text-neutral-300">
          <Film size={32} className="text-neutral-500 mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-neutral-100 mb-1">Trình Phát Media YouTube</h3>
          <p className="text-xs text-neutral-400 max-w-xs mb-4">
            Dán liên kết YouTube hoặc chọn một trạm phát gợi ý để phát video nổi song song với thời gian tập trung.
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            {PRESET_STATIONS.map((station) => (
              <button
                key={station.name}
                type="button"
                onClick={() => handleApplyUrl(station.url)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={11} className="text-amber-300" />
                <span>{station.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Modal / Popover đổi trạm */}
      {showPicker && (
        <div
          data-testid="media-station-picker-popover"
          className="absolute inset-x-2 top-2 bottom-2 z-30 bg-neutral-950/95 backdrop-blur-xl border border-white/15 rounded-xl p-3.5 flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <ListMusic size={13} className="text-white" />
              Chọn Trạm YouTube hoặc Dán URL
            </span>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-neutral-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer"
            >
              Đóng
            </button>
          </div>

          {/* Form input link */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApplyUrl(inputUrl);
            }}
            className="flex items-center gap-1.5 mb-3 shrink-0"
          >
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Dán link YouTube (https://youtu.be/...)"
              data-testid="input-media-url"
              className="flex-1 min-w-0 bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
            />
            <button
              type="submit"
              data-testid="btn-submit-media-url"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition cursor-pointer shrink-0"
            >
              Phát
            </button>
          </form>

          {customMusicError && (
            <p className="text-[10px] text-rose-400 mb-2">{customMusicError}</p>
          )}

          {/* Danh sách trạm phổ biến */}
          <span className="text-[11px] font-medium text-neutral-400 mb-1.5 block">
            Trạm phát gợi ý:
          </span>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {PRESET_STATIONS.map((station) => {
              const isCurrent = activeUrl === station.url;
              return (
                <button
                  key={station.name}
                  type="button"
                  onClick={() => handleApplyUrl(station.url)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer border ${
                    isCurrent
                      ? 'bg-white/15 border-white/30 text-white font-medium'
                      : 'bg-neutral-900/60 border-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">{station.name}</span>
                  {isCurrent ? (
                    <Check size={13} className="text-emerald-400 shrink-0" />
                  ) : (
                    <ExternalLink size={11} className="text-neutral-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
