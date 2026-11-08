import React, { useState, useMemo, useRef } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
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
  SkipBack,
  Play,
  Pause,
  Maximize2
} from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import {
  extractYouTubeEmbedUrl,
  extractYouTubePlaylistId,
  extractYouTubeVideoId,
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
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A&list=RDMM5qap5aO4i9A'
  }
];

export const PRESET_STATIONS = [
  {
    id: 'st-lofi-girl',
    name: 'Lofi Girl - Chill / Study (24/7)',
    videoId: 'rFZHOHl-L8A',
    url: 'https://www.youtube.com/watch?v=rFZHOHl-L8A'
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

  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoTitle, setVideoTitle] = useState<string>('');
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

  // Active playing URL & Video/Playlist IDs
  const activeUrl = customMusicUrl || currentStation.url;
  const cleanVideoId = extractYouTubeVideoId(activeUrl) || currentStation.videoId;
  const playlistId = extractYouTubePlaylistId(activeUrl);
  // Tự động kích hoạt YouTube Radio Mix (list=RD${cleanVideoId}) khi người dùng dán URL/ID đơn lẻ
  const effectivePlaylistId = playlistId || (cleanVideoId ? `RD${cleanVideoId}` : undefined);
  const isMix = isYouTubeMix(activeUrl) || Boolean(!playlistId && cleanVideoId);
  const matchedFavorite = favorites.find((f) => f.url === activeUrl);

  const opts: YouTubeProps['opts'] = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pomofocus-workspace.vercel.app';
    return {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        origin,
        enablejsapi: 1,
        ...(effectivePlaylistId
          ? { listType: 'playlist', list: effectivePlaylistId }
          : {})
      }
    };
  }, [activeUrl, cleanVideoId, effectivePlaylistId]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    youtubePlayerRef.current = event.target;
    if (typeof window !== 'undefined') {
      (window as any).__pomoYoutubePlayer = event.target;
    }
    setIsPlaying(true);
    try {
      const data = event.target.getVideoData();
      if (data?.title) setVideoTitle(data.title);
    } catch {}
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1: PLAYING, 2: PAUSED, 0: ENDED
    if (event.data === 1) {
      setIsPlaying(true);
      try {
        const data = event.target.getVideoData();
        if (data?.title) setVideoTitle(data.title);
      } catch {}
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      if (effectivePlaylistId || isMix) {
        try {
          event.target.nextVideo();
        } catch {}
      } else {
        handleNextVideo();
      }
    }
  };

  const togglePlay = () => {
    if (!youtubePlayerRef.current) return;
    try {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        youtubePlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch {}
  };

  const handleNextVideo = () => {
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.nextVideo === 'function') {
      try {
        youtubePlayerRef.current.nextVideo();
        return;
      } catch (err) {
        console.debug('[MediaWidget] nextVideo error:', err);
      }
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
    if (youtubePlayerRef.current) {
      try {
        const currentTime = typeof youtubePlayerRef.current.getCurrentTime === 'function'
          ? youtubePlayerRef.current.getCurrentTime()
          : 0;
        if (currentTime > 3 && typeof youtubePlayerRef.current.seekTo === 'function') {
          youtubePlayerRef.current.seekTo(0, true); // Tua lại từ đầu bài hát
          return;
        } else if (typeof youtubePlayerRef.current.previousVideo === 'function') {
          youtubePlayerRef.current.previousVideo(); // Lùi về bài trước đó trong hàng chờ
          return;
        }
      } catch (err) {
        console.debug('[MediaWidget] previousVideo error:', err);
      }
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
      setCustomMusicError('Vui lòng nhập đường dẫn YouTube hoặc Video ID (11 ký tự), Playlist hoặc YouTube Mix hợp lệ');
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
      {/* 1. Khung phát YouTube độc lập qua react-youtube (100% video, không bị nút đè chéo) */}
      <div
        className="flex-1 w-full bg-black relative min-h-[160px] overflow-hidden flex items-center justify-center"
        data-testid="media-youtube-container"
      >
        {cleanVideoId || playlistId ? (
          <YouTube
            key={`${cleanVideoId || 'list'}-${playlistId || 'none'}`}
            videoId={playlistId ? undefined : cleanVideoId}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="w-full h-full"
            iframeClassName="w-full h-full border-0 block bg-black"
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

      {/* 2. Thanh nhập URL / Video ID trực diện bên dưới video */}
      {customMusicError && (
        <div className="px-3 py-1 text-[11px] text-rose-400 bg-rose-950/40 border-t border-rose-900/50">
          {customMusicError}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleApplyUrl(inputUrl);
        }}
        className="px-2.5 py-1.5 flex items-center gap-2 border-t border-white/10 bg-zinc-950/90 shrink-0"
      >
        <input
          data-testid="input-media-direct-url"
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Dán link YouTube hoặc Video ID (11 ký tự)..."
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 flex-1 transition"
        />
        <button
          data-testid="btn-apply-direct-media"
          type="submit"
          className="liquid-glass-btn text-xs px-3 py-1 rounded-xl font-medium shrink-0 cursor-pointer text-emerald-300 border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 transition"
        >
          Phát
        </button>
      </form>

      {/* 3. Thanh điều khiển tách biệt ở đáy, hoàn toàn ngoài khung video */}
      <div className="h-11 px-3 flex items-center justify-between border-t border-white/5 bg-zinc-950/95 shrink-0 gap-2">
        {/* Bên trái: Thông tin trạm / Mix / Playlist */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[38%]">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
          <span className="text-[11px] font-medium text-zinc-200 truncate" title={videoTitle || matchedFavorite?.name || currentStation.name}>
            {videoTitle || matchedFavorite?.name || currentStation.name}
          </span>
        </div>

        {/* Bên phải: Nút Trước ⏮ / Play-Pause / Tiếp ⏭ / Đổi trạm / Tắt */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="btn-media-prev-video"
            onClick={handlePrevVideo}
            className="px-2 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Trạm trước (hoặc bài trước)"
          >
            <SkipBack size={12} className="text-zinc-400" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          <button
            type="button"
            data-testid="btn-media-toggle-play"
            onClick={togglePlay}
            className="px-2 py-1 text-xs text-zinc-200 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
          >
            {isPlaying ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
          </button>

          <button
            type="button"
            data-testid="btn-media-next-video"
            onClick={handleNextVideo}
            className="px-2 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Trạm tiếp theo (hoặc bài tiếp theo)"
          >
            <span className="hidden sm:inline">Tiếp</span>
            <SkipForward size={12} className="text-zinc-400" />
          </button>

          <button
            type="button"
            data-testid="btn-toggle-media-picker"
            onClick={() => setShowPicker(!showPicker)}
            className="px-2 py-1 text-xs text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="Đổi trạm hoặc phát Playlist yêu thích"
          >
            <ListMusic size={12} />
            <span>Đổi trạm</span>
          </button>

          <button
            type="button"
            data-testid="btn-toggle-media-fullscreen"
            onClick={() => {
              const root = document.querySelector('[data-testid="media-widget-root"]')?.parentElement;
              if (!document.fullscreenElement) {
                if (root?.requestFullscreen) {
                  root.requestFullscreen();
                } else if ((root as any)?.webkitRequestFullscreen) {
                  (root as any).webkitRequestFullscreen();
                }
              } else {
                if (document.exitFullscreen) {
                  document.exitFullscreen();
                } else if ((document as any)?.webkitExitFullscreen) {
                  (document as any).webkitExitFullscreen();
                }
              }
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition active:scale-95 cursor-pointer"
            title="Toàn màn hình"
          >
            <Maximize2 size={13} />
          </button>

          <button
            type="button"
            data-testid="btn-clear-media"
            onClick={() => {
              setCustomMusicUrl('');
              setCustomMusicPlaying(false);
            }}
            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition active:scale-95 cursor-pointer"
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
              placeholder="Dán link Video, Video ID (11 ký tự), Playlist hoặc Mix..."
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
