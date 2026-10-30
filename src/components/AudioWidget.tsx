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
  Radio,
  Music,
  Trash2,
  Info
} from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { ChimeSoundType } from '../types/audio';
import { extractYouTubeEmbedUrl, isDirectAudioUrl } from '../utils/media';

export const AudioWidget: React.FC = () => {
  const {
    settings,
    tracks,
    isAudioBlocked,
    activeTab,
    customMusicUrl,
    customMusicType,
    customMusicPlaying,
    customMusicVolume,
    customMusicError,
    customMusicList,
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
    resetToDefaults,
    setCustomMusicUrl,
    setCustomMusicPlaying,
    setCustomMusicVolume,
    setCustomMusicError,
    addCustomMusicToList,
    removeCustomMusicFromList
  } = useAudioStore();

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [inputUrl, setInputUrl] = useState(customMusicUrl);
  const [inputName, setInputName] = useState('');

  const handleApplyMusicUrl = (urlToApply: string, nameToApply?: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed) {
      setCustomMusicUrl('');
      setCustomMusicPlaying(false);
      setCustomMusicError(null);
      return;
    }

    setCustomMusicError(null);
    const ytEmbed = extractYouTubeEmbedUrl(trimmed);

    if (ytEmbed) {
      setCustomMusicUrl(trimmed, 'youtube');
      setCustomMusicPlaying(true);
      if (nameToApply) {
        addCustomMusicToList(nameToApply, trimmed, 'youtube');
      }
    } else {
      // Direct audio / Web Radio
      const isDirect = isDirectAudioUrl(trimmed);
      if (!isDirect && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        setCustomMusicError('Vui lòng nhập đường dẫn URL hợp lệ (http:// hoặc https://)');
        return;
      }
      setCustomMusicUrl(trimmed, 'direct_audio');
      setCustomMusicPlaying(true);
      if (nameToApply) {
        addCustomMusicToList(nameToApply, trimmed, 'direct_audio');
      }
    }
  };

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
    { value: 'twinkle', label: 'Twinkle', desc: 'Arpeggio trong trẻo lấp lánh' },
    { value: 'playtime', label: 'Playtime', desc: 'Giai điệu vui tươi khởi sắc' },
    { value: 'scifi', label: 'Sci-fi', desc: 'Âm thanh không gian tương lai' },
    { value: 'slow_rise', label: 'Slow Rise', desc: 'Hợp âm ngân vang ấm áp' },
    { value: 'rooster', label: 'Rooster', desc: 'Báo thức vui nhộn điệu gà gáy' },
    { value: 'bird', label: 'Bird', desc: 'Tiếng chim hót líu lo tự nhiên' },
  ];

  const activePlayingCount = tracks.filter((t) => t.isPlaying).length;
  const youtubeEmbedUrl = customMusicType === 'youtube' ? extractYouTubeEmbedUrl(customMusicUrl) : null;

  return (
    <div
      data-testid="audio-widget-content"
      className="flex flex-col h-full w-full select-none text-neutral-100"
    >
      {/* Autoplay Warning Banner if blocked by browser policy */}
      {isAudioBlocked && (
        <button
          type="button"
          data-testid="resume-audio-banner"
          onClick={() => resumeAudioContext()}
          className="mb-3 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between gap-2 hover:bg-amber-500/25 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span>Trình duyệt đang chặn âm thanh. Nhấn vào đây để bật.</span>
          </div>
          <span className="font-semibold underline shrink-0">Bật ngay</span>
        </button>
      )}

      {/* Master Volume Section */}
      <div className="bg-black/25 border border-white/10 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-300">
            Master: {Math.round(settings.masterVolume * 100)}%
          </span>
          <button
            type="button"
            data-testid="master-mute-btn"
            onClick={toggleMasterMute}
            aria-label={settings.isMuted ? 'Bật tiếng Master' : 'Tắt tiếng Master'}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer min-h-[30px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
              settings.isMuted
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
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
            className="w-full accent-neutral-200 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
            aria-label="Master volume slider"
          />
        </div>
      </div>

      {/* Tabs Switcher: 3 mục rõ ràng */}
      <div className="grid grid-cols-3 gap-1 p-0.5 bg-black/30 rounded-xl border border-white/10 mb-3 shrink-0">
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
          <span>Chuông Báo ({settings.selectedChime})</span>
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

        <button
          type="button"
          data-testid="tab-music"
          onClick={() => setActiveTab('music')}
          className={`py-1.5 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeTab === 'music'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Music size={13} />
          <span>Nhạc & Stream</span>
          {customMusicPlaying && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
                  <div className="text-xs font-medium text-neutral-100 flex items-center justify-between">
                    <span>{opt.label}</span>
                    {settings.selectedChime === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chime Volume */}
          <div className="bg-black/25 border border-white/10 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
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
              className="w-full accent-neutral-200 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Preview Button */}
          <button
            type="button"
            data-testid="preview-chime-btn"
            onClick={handlePreview}
            disabled={isPlayingPreview}
            className="w-full py-2 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-900 font-semibold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
          >
            <span>{isPlayingPreview ? '🎶 Đang phát...' : '▶ Nghe Thử Chuông Báo'}</span>
          </button>
        </div>
      )}

      {/* Tab 2: Ambient Soundscape */}
      {activeTab === 'ambient' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Trộn đa âm thanh môi trường:</span>
            {activePlayingCount > 0 && (
              <button
                type="button"
                onClick={stopAllTracks}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 rounded px-1"
              >
                Dừng tất cả ({activePlayingCount})
              </button>
            )}
          </div>

          {/* Tracks list */}
          <div className="space-y-1.5">
            {tracks.map((track) => (
              <div
                key={track.id}
                data-testid={`track-item-${track.id}`}
                className={`p-2 rounded-xl border transition ${
                  track.isPlaying
                    ? 'bg-black/40 border-neutral-400/30 shadow-inner'
                    : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTrack(track.id)}
                      data-testid={`toggle-track-${track.id}`}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition shrink-0 cursor-pointer min-w-[28px] min-h-[28px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
                        track.isPlaying
                          ? 'bg-neutral-100 text-neutral-900 shadow-sm'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                      aria-label={track.isPlaying ? `Tắt ${track.name}` : `Bật ${track.name}`}
                    >
                      {track.isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                    </button>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-neutral-200 truncate">
                          {track.name}
                        </span>
                        {track.category === 'binaural' && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 shrink-0">
                            Binaural
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-[10px] text-neutral-400 truncate">{track.description}</p>
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
                        className="w-full accent-neutral-200 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
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

      {/* Tab 3: Nhạc & Luồng Phát (Custom Music / Stream) */}
      {activeTab === 'music' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {/* Active Player Status */}
          {customMusicUrl ? (
            <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 shadow-inner space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-300">
                    {customMusicType === 'youtube' ? 'YouTube Embed Live' : 'Luồng Âm Thanh Trực Tiếp'}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="btn-stop-custom-music"
                  onClick={() => {
                    setCustomMusicPlaying(false);
                    setCustomMusicUrl('');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  Dừng & Xóa
                </button>
              </div>

              {/* YouTube Player Anchor: Nơi GlobalAudioHost neo iframe cố định vào khi widget mở */}
              {customMusicType === 'youtube' && youtubeEmbedUrl && (
                <div
                  id="youtube-player-anchor"
                  data-testid="youtube-player-anchor"
                  className="relative w-full rounded-lg overflow-hidden aspect-video bg-black/90 border border-white/10 shadow-md flex items-center justify-center select-none"
                >
                  <span className="text-[11px] text-neutral-400 animate-pulse">
                    Đang phát luồng YouTube...
                  </span>
                </div>
              )}

              {/* Direct Audio Controls */}
              {customMusicType === 'direct_audio' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      data-testid="btn-toggle-direct-audio"
                      onClick={() => setCustomMusicPlaying(!customMusicPlaying)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {customMusicPlaying ? <Pause size={13} /> : <Play size={13} />}
                      <span>{customMusicPlaying ? 'Tạm dừng nhạc' : 'Tiếp tục phát'}</span>
                    </button>
                  </div>

                  {/* Volume Slider for Custom Music */}
                  <div className="bg-white/5 p-2 rounded-lg flex items-center gap-2">
                    <Volume2 size={12} className="text-neutral-400" />
                    <input
                      data-testid="slider-custom-music-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={customMusicVolume}
                      onChange={(e) => setCustomMusicVolume(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                      aria-label="Âm lượng nhạc trực tiếp"
                    />
                    <span className="text-[10px] text-neutral-400 font-mono w-8 text-right">
                      {Math.round(customMusicVolume * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {customMusicError && (
                <p data-testid="custom-music-error-msg" className="text-[10px] text-rose-400 leading-relaxed bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  ⚠️ {customMusicError}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-neutral-400">
              Chưa có luồng nhạc nào đang phát. Hãy nhập liên kết bên dưới hoặc chọn một trạm gợi ý.
            </div>
          )}

          {/* Form thêm nhạc bằng Link URL */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2.5">
            <span className="text-xs font-semibold text-neutral-200 block">
              Thêm Nhạc / Luồng Trực Tuyến bằng URL
            </span>

            <div className="space-y-1.5">
              <input
                data-testid="input-custom-music-url"
                type="text"
                placeholder="Dán link nhạc (.mp3, .aac, radio stream hoặc link YouTube)..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400/60"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Đặt tên bài hát / trạm (tùy chọn)..."
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400/60"
                />
                <button
                  type="button"
                  data-testid="btn-play-custom-url"
                  onClick={() => handleApplyMusicUrl(inputUrl, inputName)}
                  disabled={!inputUrl.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  Phát ngay
                </button>
              </div>
            </div>

            {/* Hướng dẫn định dạng & CORS */}
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] text-neutral-400 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Info size={11} className="text-sky-400" />
                <span>Định dạng được hỗ trợ:</span>
              </div>
              <p>• <strong>Âm thanh trực tiếp:</strong> File MP3, AAC, OGG, WAV hoặc luồng Web Radio trực tiếp.</p>
              <p>• <strong>YouTube:</strong> Video, Livestream lofi 24/7 hoặc danh sách phát.</p>
              <p className="text-neutral-500">
                * Lưu ý: Nếu phát file MP3 từ máy chủ ngoài bị chặn CORS, hãy chuyển sang nguồn phát hỗ trợ CORS hoặc nhúng luồng YouTube.
              </p>
            </div>
          </div>

          {/* Curated Stations */}
          <div>
            <span className="text-[11px] font-semibold text-neutral-300 block mb-1.5">
              Kênh Gợi Ý 24/7 & Đã Lưu:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {customMusicList.map((station) => (
                <div
                  key={station.id}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition group flex flex-col justify-between"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyMusicUrl(station.url)}
                    className="text-left cursor-pointer w-full"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-neutral-200 group-hover:text-emerald-300 truncate">
                        {station.name}
                      </span>
                      <Play size={10} className="text-neutral-400 group-hover:text-emerald-400 shrink-0" />
                    </div>
                    <span className="text-[9px] text-neutral-500 block truncate mt-0.5">
                      {station.type === 'youtube' ? 'YouTube Live Stream' : 'Direct Audio Stream'}
                    </span>
                  </button>
                  {customMusicList.length > 3 && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => removeCustomMusicFromList(station.id)}
                        className="text-neutral-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                        title="Xóa kênh này khỏi danh sách"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer: Reset to defaults */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 hover:text-neutral-200 transition cursor-pointer text-xs min-h-[26px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 rounded-lg px-1.5 py-0.5"
        >
          <RotateCcw size={12} />
          <span>Đặt lại mặc định</span>
        </button>
        <span className="text-[10px] text-neutral-500 font-medium">100% Offline Procedural Sound</span>
      </div>
    </div>
  );
};
