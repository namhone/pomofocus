import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Bell,
  Waves,
  AlertTriangle,
  RotateCcw,
  Film
} from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { ChimeSoundType } from '../types/audio';

export const AudioWidget: React.FC = () => {
  const {
    settings,
    tracks,
    isAudioBlocked,
    activeTab,
    setActiveTab,
    setMasterVolume,
    toggleMasterMute,
    setSelectedChime,
    setChimeVolume,
    previewChime,
    toggleTrack,
    setTrackVolume,
    stopAllTracks,
    resumeAudioContext,
    resetToDefaults
  } = useAudioStore();

  const openWidget = useLayoutStore((s) => s.openWidget);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const handlePreview = async () => {
    setIsPlayingPreview(true);
    try {
      await previewChime();
    } catch (err) {
      console.warn('Lỗi nghe thử chuông:', err);
    } finally {
      setTimeout(() => setIsPlayingPreview(false), 2000);
    }
  };

  const chimeOptions: { value: ChimeSoundType; label: string; desc: string }[] = [
    { value: 'twinkle', label: 'Twinkle', desc: 'Arpeggio trong trẻo' },
    { value: 'playtime', label: 'Playtime', desc: 'Chuông gõ vui tươi' },
    { value: 'scifi', label: 'Sci-Fi', desc: 'Âm sắc tương lai không gian' },
    { value: 'slow_rise', label: 'Slow Rise', desc: 'Âm ngân chậm ấm áp' },
    { value: 'bird', label: 'Tiếng Chim', desc: 'Tiếng chim hót rộn ràng' },
    { value: 'rooster', label: 'Gà Gáy', desc: 'Tiếng gà ban mai sinh động' }
  ];

  const activePlayingCount = tracks.filter((t) => t.isPlaying).length;

  return (
    <div
      data-testid="audio-widget-root"
      className="w-full h-full flex flex-col justify-between select-none"
    >
      {/* Audio Context Blocked Notice */}
      {isAudioBlocked && (
        <div
          data-testid="audio-blocked-warning"
          className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span>Trình duyệt đang chặn âm thanh tự động</span>
          </div>
          <button
            type="button"
            data-testid="btn-resume-audio"
            onClick={resumeAudioContext}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-[11px] transition cursor-pointer shrink-0"
          >
            Kích hoạt
          </button>
        </div>
      )}

      {/* Master Volume Section */}
      <div className="p-3 bg-black/25 rounded-2xl border border-white/5 mb-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="master-volume-slider" className="text-xs font-medium text-neutral-300">
            Âm Lượng Tổng: {settings.isMuted ? 'Tắt' : `${Math.round(settings.masterVolume * 100)}%`}
          </label>
          <button
            type="button"
            data-testid="btn-toggle-mute"
            onClick={toggleMasterMute}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition cursor-pointer min-h-[28px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
              settings.isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-white/10 text-neutral-300 hover:bg-white/15 hover:text-white'
            }`}
          >
            {settings.isMuted ? (
              <>
                <VolumeX size={13} />
                <span>Đang tắt tiếng</span>
              </>
            ) : (
              <>
                <Volume2 size={13} />
                <span>Đang bật tiếng</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="master-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.masterVolume}
            disabled={settings.isMuted}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="w-full accent-white bg-neutral-800 h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-40 [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-4.5 [&::-moz-range-thumb]:h-4.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
            aria-label="Master volume slider"
          />
        </div>
      </div>

      {/* Tabs Switcher: 2 mục rõ ràng */}
      <div className="grid grid-cols-2 gap-1 p-0.5 bg-black/30 rounded-xl border border-white/10 mb-3 shrink-0">
        <button
          type="button"
          data-testid="tab-chime"
          onClick={() => setActiveTab('chime')}
          className={`py-1.5 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeTab === 'chime'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bell size={13} />
          <span>Chuông Báo</span>
        </button>

        <button
          type="button"
          data-testid="tab-ambient"
          onClick={() => setActiveTab('ambient')}
          className={`py-1.5 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeTab === 'ambient'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Waves size={13} />
          <span>Âm Thanh Nền</span>
          {activePlayingCount > 0 && (
            <span className="w-4 h-4 text-[10px] rounded-full bg-emerald-500 text-neutral-950 font-bold flex items-center justify-center">
              {activePlayingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Chimes */}
      {activeTab === 'chime' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          <div>
            <label className="text-xs text-neutral-400 mb-2 block font-medium">
              Chọn âm báo khi kết thúc hiệp:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {chimeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`chime-option-${opt.value}`}
                  onClick={() => setSelectedChime(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
                    settings.selectedChime === opt.value
                      ? 'bg-neutral-800/80 border-neutral-400/40 shadow-inner'
                      : 'bg-black/20 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="font-semibold text-xs text-white mb-0.5">{opt.label}</div>
                  <div className="text-[10px] text-neutral-400 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="chime-volume-slider" className="text-xs text-neutral-400 font-medium">
                Âm lượng chuông: {Math.round(settings.chimeVolume * 100)}%
              </label>
              <button
                type="button"
                data-testid="btn-preview-chime"
                disabled={isPlayingPreview}
                onClick={handlePreview}
                className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[28px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
              >
                <Play size={11} fill="currentColor" />
                <span>{isPlayingPreview ? 'Đang phát...' : 'Nghe thử'}</span>
              </button>
            </div>
            <input
              id="chime-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.chimeVolume}
              onChange={(e) => setChimeVolume(parseFloat(e.target.value))}
              className="w-full accent-white bg-neutral-800 h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-4.5 [&::-moz-range-thumb]:h-4.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
              aria-label="Chime volume slider"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Ambient Sounds */}
      {activeTab === 'ambient' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">
              Bộ phối âm thanh tập trung (hỗ trợ phối nhiều âm thanh cùng lúc)
            </span>
            {activePlayingCount > 0 && (
              <button
                type="button"
                data-testid="btn-stop-all-ambient"
                onClick={stopAllTracks}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
              >
                Dừng tất cả
              </button>
            )}
          </div>

          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                data-testid={`ambient-track-${track.id}`}
                className={`min-h-[48px] p-2.5 sm:p-3 rounded-xl border transition-all duration-150 ${
                  track.isPlaying
                    ? 'bg-neutral-800/60 border-white/20 shadow-inner'
                    : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      data-testid={`btn-toggle-track-${track.id}`}
                      onClick={() => toggleTrack(track.id)}
                      className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center transition-all duration-150 active:scale-[0.98] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
                        track.isPlaying
                          ? 'bg-white text-black shadow-md'
                          : 'bg-white/10 text-neutral-300 hover:bg-white/20 hover:text-white'
                      }`}
                      aria-label={`${track.isPlaying ? 'Dừng' : 'Bật'} ${track.name}`}
                    >
                      {track.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-neutral-200 truncate" title={track.name}>
                          {track.name}
                        </span>
                        {track.category === 'binaural' && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 shrink-0">
                            Binaural
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-[10px] text-neutral-400 truncate" title={track.description}>{track.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Volume Slider if Playing */}
                  {track.isPlaying && (
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.volume}
                        onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                        className="w-full accent-white bg-neutral-800 h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
                        aria-label={`Âm lượng ${track.name}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Medical Disclaimer for Binaural Beats */}
          <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[10px] text-purple-300/90 leading-relaxed">
            <span className="font-semibold block text-purple-200 mb-0.5">
              ⚠️ Lưu ý y tế (Medical Disclaimer):
            </span>
            Âm thanh mô phỏng nhịp âm hai tai hỗ trợ thư giãn và tập trung — không phải thiết bị y tế; hiệu quả hỗ trợ tập trung hoặc cải thiện giấc ngủ chưa được chứng minh lâm sàng và không được bảo đảm bởi tính năng này, không có tác dụng thay thế chẩn đoán hay điều trị y khoa.
          </div>
        </div>
      )}

      {/* Media Window Quick Launch Banner */}
      <div className="my-2 p-2.5 rounded-xl bg-neutral-900/60 border border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Film size={14} className="text-neutral-400 shrink-0" />
          <span className="text-[11px] text-neutral-300 truncate">
            Muốn xem video YouTube hoặc Livestream học tập?
          </span>
        </div>
        <button
          type="button"
          onClick={() => openWidget('media')}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
        >
          Mở Media
        </button>
      </div>

      {/* Footer: Reset to defaults */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 hover:text-neutral-200 transition cursor-pointer text-xs min-h-[26px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 rounded-lg px-1.5 py-0.5"
        >
          <RotateCcw size={12} />
          <span>Đặt lại mặc định</span>
        </button>
        <span className="text-[10px] text-neutral-500 font-medium">Offline Audio</span>
      </div>
    </div>
  );
};
