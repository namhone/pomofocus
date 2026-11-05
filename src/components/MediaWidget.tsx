import React, { useState, useMemo, useRef } from 'react';
import {
  Film,
  ExternalLink,
  Trash2,
  ListMusic,
  Check,
  Sparkles,
  Plus,
  Bookmark,
  RotateCcw,
  SkipForward,
  SkipBack
} from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import {
  extractYouTubeEmbedUrl,
  extractYouTubePlaylistId,
  isYouTubeMix
} from '../utils/media';

export interface FavoritePlaylist {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_FAVORITE_PLAYLISTS: FavoritePlaylist[] = [
  {
    id: 'fav-lofi-night',
    name: '🌙 Lofi Chill Học Đêm',
    url: 'https://www.youtube.com/playlist?list=PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn'
  },
  {
    id: 'fav-piano-focus',
    name: '🎹 Piano Không Lời Thư Giãn',
    url: 'https://www.youtube.com/playlist?list=PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo'
  },
  {
    id: 'fav-anime-ost',
    name: '✨ Anime OST Học & Code',
    url: 'https://www.youtube.com/playlist?list=PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyNY'
  },
  {
    id: 'fav-lofigirl-mix',
    name: '🔀 Lofi Girl YouTube Mix',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDMMjfKfPfyJRdk'
  }
];

export const PRESET_STATIONS = [
  {
    id: 'st-lofi-girl',
    name: 'Lofi Girl - Chill / Study (24/7)',
    videoId: 'jfKfPfyJRdk',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    id: 'st-synthwave',
    name: 'Synthwave Radio Live',
    videoId: '4xDzrJKXOOY',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY'
  },
  {
    id: 'st-coffee-lofi',
    name: 'Coffee Shop Lofi Vibes',
    videoId: 'h2zkV-l_TbY',
    url: 'https://www.youtube.com/watch?v=h2zkV-l_TbY'
  },
  {
    id: 'st-quiet-rain',
    name: 'Quiet Rain & Relaxing Piano',
    videoId: 'lTRiuFIWV54',
    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54'
  },
  {
    id: 'st-chillhop',
    name: 'Chillhop Study Beats',
    videoId: '5yx6BWlEVcY',
    url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY'
  }
];

const STORAGE_KEY = 'pomodoro_favorite_playlists';

export const MediaWidget: React.FC = () => {
  const {
    customMusicUrl,
    setCustomMusicUrl,
    setCustomMusicPlaying,
    setCustomMusicError,
    customMusicError
  } = useAudioStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showAddFav, setShowAddFav] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [newFavUrl, setNewFavUrl] = useState('');
  const [favError, setFavError] = useState<string | null>(null);

  // Load and persist Favorite Playlists
  const [favorites, setFavorites] = useState<FavoritePlaylist[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_FAVORITE_PLAYLISTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_FAVORITE_PLAYLISTS;
  });

  const saveFavorites = (newList: FavoritePlaylist[]) => {
    setFavorites(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  const [stationIndex, setStationIndex] = useState(0);
  const currentStation = PRESET_STATIONS[stationIndex] || PRESET_STATIONS[0];

  // Active playing URL
  const activeUrl = customMusicUrl || currentStation.url;
  const rawEmbedUrl = extractYouTubeEmbedUrl(activeUrl);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://pomofocus-workspace.vercel.app';

  // Build standard embed URL with enablejsapi=1 and origin
  const youtubeEmbedUrl = useMemo(() => {
    if (!rawEmbedUrl) return null;
    try {
      const parsed = new URL(rawEmbedUrl);
      if (!parsed.searchParams.has('enablejsapi')) {
        parsed.searchParams.set('enablejsapi', '1');
      }
      parsed.searchParams.set('origin', currentOrigin);
      return parsed.toString();
    } catch {
      const glue = rawEmbedUrl.includes('?') ? '&' : '?';
      return `${rawEmbedUrl}${glue}enablejsapi=1&origin=${encodeURIComponent(currentOrigin)}`;
    }
  }, [rawEmbedUrl, currentOrigin]);

  // Playlist & YouTube Mix detection
  const isMix = isYouTubeMix(activeUrl);
  const isPlaylist = Boolean(extractYouTubePlaylistId(activeUrl)) || (rawEmbedUrl?.includes('videoseries') ?? false);
  const matchedFavorite = favorites.find((f) => f.url === activeUrl);

  // YouTube IFrame Player API postMessage Controls (Skip Forward & Skip Back)
  const sendPlayerCommand = (func: string, args: unknown[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args
        }),
        '*'
      );
    }
  };

  const handleNextVideo = () => {
    if (isPlaylist || isMix) {
      sendPlayerCommand('nextVideo');
    }
    setStationIndex((prev) => {
      const nextIdx = (prev + 1) % PRESET_STATIONS.length;
      const nextStation = PRESET_STATIONS[nextIdx];
      setCustomMusicUrl(nextStation.url, 'youtube');
      setCustomMusicPlaying(true);
      return nextIdx;
    });
  };

  const handlePrevVideo = () => {
    if (isPlaylist || isMix) {
      sendPlayerCommand('previousVideo');
    }
    setStationIndex((prev) => {
      const prevIdx = (prev - 1 + PRESET_STATIONS.length) % PRESET_STATIONS.length;
      const prevStation = PRESET_STATIONS[prevIdx];
      setCustomMusicUrl(prevStation.url, 'youtube');
      setCustomMusicPlaying(true);
      return prevIdx;
    });
  };

  const handleApplyUrl = (urlToApply: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed) {
      setCustomMusicUrl('');
      setCustomMusicPlaying(false);
      return;
    }
    const embed = extractYouTubeEmbedUrl(trimmed);
    if (!embed) {
      setCustomMusicError('Vui lòng nhập đường dẫn YouTube hợp lệ (video, live stream, playlist hoặc YouTube Mix)');
      return;
    }
    setCustomMusicError(null);
    setCustomMusicUrl(trimmed, 'youtube');
    setCustomMusicPlaying(true);
    setShowPicker(false);
    setInputUrl('');
  };

  const handleAddFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newFavName.trim();
    const urlTrimmed = newFavUrl.trim() || activeUrl;

    if (!urlTrimmed) {
      setFavError('Vui lòng nhập đường dẫn playlist YouTube');
      return;
    }

    const embed = extractYouTubeEmbedUrl(urlTrimmed);
    if (!embed) {
      setFavError('Đường dẫn YouTube không hợp lệ');
      return;
    }

    const isMixUrl = isYouTubeMix(urlTrimmed);
    const isPlayUrl = Boolean(extractYouTubePlaylistId(urlTrimmed));
    const fallbackDefaultName = isMixUrl
      ? `YouTube Mix ${favorites.length + 1}`
      : isPlayUrl
      ? `Playlist ${favorites.length + 1}`
      : `Video ${favorites.length + 1}`;

    const newFav: FavoritePlaylist = {
      id: `fav-${Date.now()}`,
      name: nameTrimmed || fallbackDefaultName,
      url: urlTrimmed
    };

    saveFavorites([...favorites, newFav]);
    setNewFavName('');
    setNewFavUrl('');
    setFavError(null);
    setShowAddFav(false);
  };

  const handleDeleteFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.filter((f) => f.id !== id);
    saveFavorites(updated.length > 0 ? updated : DEFAULT_FAVORITE_PLAYLISTS);
  };

  const handleResetFavorites = () => {
    saveFavorites(DEFAULT_FAVORITE_PLAYLISTS);
  };

  return (
    <div
      data-testid="media-widget-root"
      className="relative w-full h-full flex flex-col bg-zinc-950 overflow-hidden select-none"
    >
      {/* 1. Khung phát YouTube độc lập (100% video, không bị nút đè chéo lên controls) */}
      <div className="flex-1 w-full bg-black relative min-h-[160px] overflow-hidden">
        {youtubeEmbedUrl ? (
          <iframe
            ref={iframeRef}
            key={currentStation.id}
            src={youtubeEmbedUrl}
            title="YouTube Media Player"
            data-testid="media-youtube-iframe"
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0 block bg-black"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400 bg-zinc-950">
            <Film size={32} className="text-zinc-600 mb-2 stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">Trình Phát Media YouTube</h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-3">
              Chưa có trạm hoặc danh sách nào đang phát. Bấm &quot;Đổi trạm&quot; để chọn nhạc lofi hoặc dán link YouTube.
            </p>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition cursor-pointer"
            >
              Chọn Trạm Phát
            </button>
          </div>
        )}
      </div>

      {/* 2. Thanh điều khiển tách biệt ở đáy, hoàn toàn ngoài khung video */}
      <div className="h-12 px-3 flex items-center justify-between border-t border-zinc-800 bg-zinc-950/95 shrink-0 gap-2">
        {/* Bên trái: Thông tin trạm / Mix / Playlist */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[42%]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-medium text-zinc-200 truncate">
            {matchedFavorite?.name || currentStation.name}
          </span>
        </div>

        {/* Bên phải: Nút Trước ⏮ / Tiếp ⏭ / Đổi trạm / Tắt */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="btn-media-prev-video"
            onClick={handlePrevVideo}
            className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Trạm trước (hoặc bài trước)"
          >
            <SkipBack size={12} className="text-zinc-400" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          <button
            type="button"
            data-testid="btn-media-next-video"
            onClick={handleNextVideo}
            className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Trạm tiếp theo (hoặc bài tiếp theo)"
          >
            <span className="hidden sm:inline">Tiếp</span>
            <SkipForward size={12} className="text-zinc-400" />
          </button>

          <button
            type="button"
            data-testid="btn-toggle-media-picker"
            onClick={() => setShowPicker(!showPicker)}
            className="px-2.5 py-1 text-xs text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Đổi trạm hoặc phát Playlist yêu thích"
          >
            <ListMusic size={12} />
            <span>Đổi trạm</span>
          </button>

          <button
            type="button"
            data-testid="btn-clear-media"
            onClick={() => {
              setCustomMusicUrl('');
              setCustomMusicPlaying(false);
            }}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition active:scale-95 cursor-pointer"
            title="Tắt video"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Floating Modal / Popover đổi trạm & quản lý Playlist */}
      {showPicker && (
        <div
          data-testid="media-station-picker-popover"
          className="absolute inset-x-2 top-2 bottom-2 z-30 bg-neutral-950/95 backdrop-blur-xl border border-white/15 rounded-xl p-3.5 flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
            <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <ListMusic size={13} className="text-indigo-400" />
              Chọn Trạm YouTube, Playlist & Mix Cá Nhân
            </span>
            <button
              type="button"
              data-testid="btn-close-media-picker"
              onClick={() => {
                setShowPicker(false);
                setShowAddFav(false);
                setFavError(null);
              }}
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
            className="flex items-center gap-1.5 mb-2.5 shrink-0"
          >
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Dán link Video, Playlist (list=PL...) hoặc Mix (list=RD...)"
              data-testid="input-media-url"
              className="flex-1 min-w-0 bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              data-testid="btn-submit-media-url"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition cursor-pointer shrink-0"
            >
              Phát ngay
            </button>
          </form>

          {customMusicError && (
            <p className="text-[10px] text-rose-400 mb-2 shrink-0">{customMusicError}</p>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* 1-TOUCH FAVORITE PLAYLISTS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                  <Bookmark size={11} />
                  Playlist & Mix Ruột Của Bạn (1-Chạm)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddFav(!showAddFav);
                      if (!showAddFav && !newFavUrl) {
                        setNewFavUrl(activeUrl);
                      }
                    }}
                    data-testid="btn-toggle-add-fav"
                    className="text-[10px] text-indigo-400 hover:text-indigo-200 font-medium flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={11} /> {showAddFav ? 'Thu gọn' : 'Thêm Playlist'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFavorites}
                    title="Khôi phục playlist mặc định"
                    className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded cursor-pointer"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>

              {/* Add form */}
              {showAddFav && (
                <form
                  onSubmit={handleAddFavorite}
                  data-testid="form-add-fav-playlist"
                  className="p-2 mb-2 rounded-lg bg-indigo-950/30 border border-indigo-700/40 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newFavName}
                      onChange={(e) => setNewFavName(e.target.value)}
                      placeholder="Tên playlist (VD: Lofi Chill Học Đêm, Mix EDM)"
                      data-testid="input-fav-playlist-name"
                      className="flex-1 min-w-0 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newFavUrl}
                      onChange={(e) => setNewFavUrl(e.target.value)}
                      placeholder="Link YouTube (hoặc để trống lấy link đang phát)"
                      data-testid="input-fav-playlist-url"
                      className="flex-1 min-w-0 bg-neutral-900 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      data-testid="btn-save-fav-playlist"
                      className="px-2.5 py-1 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shrink-0"
                    >
                      Lưu
                    </button>
                  </div>
                  {favError && (
                    <p className="text-[10px] text-rose-400">{favError}</p>
                  )}
                </form>
              )}

              {/* List of favorites */}
              <div className="space-y-1">
                {favorites.map((fav) => {
                  const isCurrent = activeUrl === fav.url;
                  const isFavMix = isYouTubeMix(fav.url);
                  return (
                    <div
                      key={fav.id}
                      data-testid={`fav-playlist-item-${fav.id}`}
                      className={`w-full group px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer border ${
                        isCurrent
                          ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-100 font-medium'
                          : 'bg-neutral-900/60 border-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => handleApplyUrl(fav.url)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isFavMix ? (
                          <Sparkles size={12} className={isCurrent ? 'text-amber-400' : 'text-neutral-500'} />
                        ) : (
                          <ListMusic size={12} className={isCurrent ? 'text-indigo-400' : 'text-neutral-500'} />
                        )}
                        <span className="truncate">{fav.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <Check size={12} className="text-emerald-400" />
                        )}
                        <button
                          type="button"
                          data-testid={`btn-delete-fav-${fav.id}`}
                          onClick={(e) => handleDeleteFavorite(fav.id, e)}
                          title="Xóa khỏi danh sách yêu thích"
                          className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRESET STATIONS SECTION */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 mb-1.5 block">
                Trạm Live Gợi Ý (Video 24/7):
              </span>
              <div className="space-y-1">
                {PRESET_STATIONS.map((station) => {
                  const isCurrent = activeUrl === station.url;
                  return (
                    <button
                      key={station.name}
                      type="button"
                      onClick={() => handleApplyUrl(station.url)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer border ${
                        isCurrent
                          ? 'bg-white/15 border-white/30 text-white font-medium'
                          : 'bg-neutral-900/60 border-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate pr-2">{station.name}</span>
                      {isCurrent ? (
                        <Check size={12} className="text-emerald-400 shrink-0" />
                      ) : (
                        <ExternalLink size={11} className="text-neutral-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
