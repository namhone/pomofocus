import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Bell, Waves, AlertTriangle, RotateCcw } from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { ChimeSoundType } from '../types/audio';

export const AudioWidget: React.FC = () => {
  const {
    settings,
    tracks,
    isAudioBlocked,
    setMasterVolume,
    toggleMasterMute,
    setSelectedChime,
    setChimeVolume,
    previewChime,
    toggleTrack,
    setTrackVolume,
    stopAllTracks,
    resumeAudioContext,
    resetToDefaults,
    activeTab,
    setActiveTab,
  } = useAudioStore();

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const chimeOptions: { value: ChimeSoundType; label: string; desc: string }[] = [
    { value: 'twinkle', label: 'Twinkle', desc: 'Arpeggio trong trẻo lấp lánh' },
    { value: 'playtime', label: 'Playtime', desc: 'Giai điệu vui tươi khởi sắc' },
    { value: 'scifi', label: 'Sci-fi', desc: 'Âm thanh không gian tương lai' },
    { value: 'slow_rise', label: 'Slow Rise', desc: 'Hợp âm ngân vang ấm áp' },
    { value: 'rooster', label: 'Rooster', desc: 'Báo thức vui nhộn điệu gà gáy' },
    { value: 'bird', label: 'Bird', desc: 'Tiếng chim hót líu lo tự nhiên' },
  ];

  const handlePreview = async () => {
    setIsPlayingPreview(true);
    try {
      await previewChime();
    } catch (err) {
      console.warn('Lỗi nghe thử chuông:', err);
    } finally {
      setTimeout(() => setIsPlayingPreview(false), 1200);
    }
  };

  const activePlayingCount = tracks.filter((t) => t.isPlaying).length;

  return (
    <div
      data-testid="audio-widget-content"
      className="flex flex-col h-full w-full select-none text-slate-100"
    >
      {/* Autoplay Warning Banner if blocked by browser policy */}
      {isAudioBlocked && (
        <button
          type="button"
          data-testid="resume-audio-banner"
          onClick={() => resumeAudioContext()}
          className="mb-3 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center justify-between gap-2 hover:bg-amber-500/30 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span>Trình duyệt đang chặn âm thanh. Nhấn vào đây để bật.</span>
          </div>
          <span className="font-semibold underline shrink-0">Bật ngay</span>
        </button>
      )}

      {/* Master Volume Section */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-300">
            Master: {Math.round(settings.masterVolume * 100)}%
          </span>
          <button
            type="button"
            data-testid="master-mute-btn"
            onClick={toggleMasterMute}
            aria-label={settings.isMuted ? 'Bật tiếng Master' : 'Tắt tiếng Master'}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              settings.isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {settings.isMuted ? (
              <>
                <VolumeX size={14} />
                <span>Đang tắt tiếng</span>
              </>
            ) : (
              <>
                <Volume2 size={14} />
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
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
            aria-label="Master volume slider"
          />
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/5 mb-3 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('chime')}
          className={`py-1.5 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'chime'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell size={14} />
          <span>Chuông Báo ({settings.selectedChime})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ambient')}
          className={`py-1.5 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'ambient'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves size={14} />
          <span>Âm Thanh Nền</span>
          {activePlayingCount > 0 && (
            <span className="w-4 h-4 text-[10px] rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center">
              {activePlayingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Chimes */}
      {activeTab === 'chime' && (
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-medium">
              Chọn âm báo khi kết thúc hiệp:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {chimeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`chime-option-${opt.value}`}
                  onClick={() => setSelectedChime(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    settings.selectedChime === opt.value
                      ? 'bg-cyan-950/60 border-cyan-500/60 shadow-inner'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-100 flex items-center justify-between">
                    <span>{opt.label}</span>
                    {settings.selectedChime === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chime Volume */}
          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <label htmlFor="chime-volume-slider">
                Âm lượng chuông: {Math.round(settings.chimeVolume * 100)}%
              </label>
            </div>
            <input
              id="chime-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.chimeVolume}
              onChange={(e) => setChimeVolume(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Preview Button */}
          <button
            type="button"
            data-testid="preview-chime-btn"
            onClick={handlePreview}
            disabled={isPlayingPreview}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{isPlayingPreview ? '🎶 Đang phát...' : '▶ Nghe Thử Chuông Báo'}</span>
          </button>
        </div>
      )}

      {/* Tab 2: Ambient Soundscape */}
      {activeTab === 'ambient' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Trộn đa âm thanh môi trường:</span>
            {activePlayingCount > 0 && (
              <button
                type="button"
                onClick={stopAllTracks}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition cursor-pointer font-medium"
              >
                Dừng tất cả ({activePlayingCount})
              </button>
            )}
          </div>

          {/* Tracks list */}
          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                data-testid={`track-item-${track.id}`}
                className={`p-2.5 rounded-xl border transition ${
                  track.isPlaying
                    ? 'bg-slate-800/80 border-cyan-500/50 shadow-inner'
                    : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTrack(track.id)}
                      data-testid={`toggle-track-${track.id}`}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition shrink-0 cursor-pointer ${
                        track.isPlaying
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      aria-label={track.isPlaying ? `Tắt ${track.name}` : `Bật ${track.name}`}
                    >
                      {track.isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                    </button>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-200 truncate">
                          {track.name}
                        </span>
                        {track.category === 'binaural' && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            Binaural
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-[10px] text-slate-400 truncate">{track.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Volume Slider if Playing */}
                  {track.isPlaying && (
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.volume}
                        onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                        aria-label={`Âm lượng ${track.name}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Medical Disclaimer for Binaural Beats */}
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-300/90 leading-relaxed">
            <span className="font-semibold block text-purple-200 mb-0.5">
              ⚠️ Lưu ý y tế (Medical Disclaimer):
            </span>
            Âm thanh mô phỏng nhịp âm hai tai hỗ trợ thư giãn và tập trung — không phải thiết bị y tế và không có tác dụng thay thế chẩn đoán hay điều trị y khoa.
          </div>
        </div>
      )}

      {/* Footer: Reset to defaults */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 hover:text-slate-200 transition cursor-pointer text-[11px]"
        >
          <RotateCcw size={12} />
          <span>Đặt lại mặc định</span>
        </button>
        <span className="text-[10px] text-slate-500">100% Offline Procedural Sound</span>
      </div>
    </div>
  );
};
