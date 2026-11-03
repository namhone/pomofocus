import React, { useState, useMemo } from 'react';
import {
  Film,
  ExternalLink,
  Trash2,
  ListMusic,
  Check,
  Sparkles,
  Plus,
  Bookmark,
  RotateCcw
} from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { extractYouTubeEmbedUrl, extractYouTubePlaylistId } from '../utils/media';

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
  }
];

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

const STORAGE_KEY = 'pomodoro_favorite_playlists';

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

  // Active playing URL
  const activeUrl = customMusicUrl || 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
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

  // Playlist detection
  const isPlaylist = Boolean(extractYouTubePlaylistId(activeUrl)) || (rawEmbedUrl?.includes('videoseries') ?? false);
  const matchedFavorite = favorites.find((f) => f.url === activeUrl);

  const handleApplyUrl = (urlToApply: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed) {
      setCustomMusicUrl('');
      setCustomMusicPlaying(false);
      return;
    }
    const embed = extractYouTubeEmbedUrl(trimmed);
    if (!embed) {
      setCustomMusicError('Vui lòng nhập đường dẫn YouTube hợp lệ (video, live stream hoặc danh sách phát playlist)');
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

    const newFav: FavoritePlaylist = {
      id: `fav-${Date.now()}`,
      name: nameTrimmed || (extractYouTubePlaylistId(urlTrimmed) ? `Playlist ${favorites.length + 1}` : `Video ${favorites.length + 1}`),
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
      className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none"
    >
      {/* 100% Video Display */}
      {youtubeEmbedUrl ? (
        <div className="relative w-full h-full flex-1 bg-black group overflow-hidden">
          <iframe
            src={youtubeEmbedUrl}
            title="YouTube Media Player"
            data-testid="media-youtube-iframe"
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0 aspect-video rounded-b-[18px] bg-black block"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />

          {/* Floating Subtle Station Switcher Trigger (Hiện khi hover hoặc bấm) */}
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 z-20 pointer-events-auto">
            {isPlaylist && (
              <span
                data-testid="badge-is-playlist"
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-600/90 text-indigo-100 border border-indigo-400/30 backdrop-blur-md shadow flex items-center gap-1"
                title="Đang phát danh sách phát - Tự động chuyển bài tiếp theo"
              >
                <ListMusic size={11} className="text-indigo-200" />
                <span className="max-w-[120px] truncate">{matchedFavorite?.name || 'Playlist'}</span>
              </span>
            )}

            <button
              type="button"
              data-testid="btn-toggle-media-picker"
              onClick={() => setShowPicker(!showPicker)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-900/85 hover:bg-neutral-800 text-neutral-200 border border-white/15 backdrop-blur-md shadow-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Đổi trạm hoặc phát Playlist yêu thích"
            >
              <ListMusic size={12} className="text-neutral-300" />
              <span>Đổi trạm / Playlist</span>
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
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-950/90 text-neutral-300 overflow-y-auto">
          <Film size={32} className="text-neutral-500 mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-neutral-100 mb-1">Trình Phát Media & Playlist YouTube</h3>
          <p className="text-xs text-neutral-400 max-w-sm mb-4">
            Dán liên kết Playlist cá nhân hoặc chọn nhanh danh sách phát bên dưới. Tự động chuyển bài kế tiếp khi kết thúc.
          </p>

          {/* 1-Touch Favorite Playlists */}
          <div className="w-full max-w-md mb-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-indigo-300 flex items-center gap-1">
                <Bookmark size={12} />
                <span>Playlist Yêu Thích (1-Chạm)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={11} /> Thêm mới
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  type="button"
                  data-testid={`btn-empty-play-fav-${fav.id}`}
                  onClick={() => handleApplyUrl(fav.url)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/40 text-indigo-100 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <ListMusic size={11} className="text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[150px]">{fav.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Live Stations */}
          <div className="w-full max-w-md text-left">
            <span className="text-[11px] font-medium text-neutral-400 mb-2 block">
              Trạm Live gợi ý:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_STATIONS.map((station) => (
                <button
                  key={station.name}
                  type="button"
                  onClick={() => handleApplyUrl(station.url)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={11} className="text-amber-300 shrink-0" />
                  <span>{station.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
              Chọn Trạm YouTube & Playlist Cá Nhân
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
              placeholder="Dán link Video hoặc Playlist (youtube.com/playlist?list=...)"
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
                  Playlist Ruột Của Bạn (1-Chạm)
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
                    title="Khôi phục 3 playlist mặc định"
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
                      placeholder="Tên playlist (VD: Lofi Chill Học Đêm)"
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
                        <ListMusic size={12} className={isCurrent ? 'text-indigo-400' : 'text-neutral-500'} />
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
                          title="Xóa playlist này"
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
