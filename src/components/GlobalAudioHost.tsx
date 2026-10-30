import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAudioStore } from '../stores/useAudioStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { extractYouTubeEmbedUrl } from '../utils/media';

/**
 * GlobalAudioHost: Quản lý vòng đời phát âm thanh độc lập toàn cục (App.tsx).
 * Giữ cho nhạc nền hoặc luồng âm thanh tiếp tục phát kể cả khi widget đóng hoặc thu nhỏ.
 * Đối với YouTube Video: sử dụng React Portal để đưa iframe trực tiếp vào vùng nội dung
 * của AudioWidget (thay vì fixed positioning trôi nổi), đảm bảo video di chuyển đồng bộ 100%
 * với khung mà không bị trôi lệch, giật lag hay vỡ bố cục.
 */
export const GlobalAudioHost: React.FC = () => {
  const {
    settings,
    customMusicUrl,
    customMusicType,
    customMusicPlaying,
    customMusicVolume,
    setCustomMusicPlaying,
    setCustomMusicError
  } = useAudioStore();

  const soundsWidget = useLayoutStore((s) => s.widgets.sounds);
  const isSoundsOpen = Boolean(soundsWidget?.isOpen && !soundsWidget?.isCollapsed);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const offscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // 1. Đồng bộ luồng Direct Audio (MP3, AAC, Radio Stream)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const effectiveVol = settings.isMuted ? 0 : customMusicVolume * settings.masterVolume;
    audio.volume = Math.max(0, Math.min(1, effectiveVol));
  }, [customMusicVolume, settings.masterVolume, settings.isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || customMusicType !== 'direct_audio' || !customMusicUrl) {
      if (audio && !customMusicPlaying) {
        audio.pause();
      }
      return;
    }

    if (customMusicPlaying) {
      if (audio.src !== customMusicUrl) {
        audio.src = customMusicUrl;
      }
      const effectiveVol = settings.isMuted ? 0 : customMusicVolume * settings.masterVolume;
      audio.volume = Math.max(0, Math.min(1, effectiveVol));

      audio
        .play()
        .then(() => {
          setCustomMusicError(null);
        })
        .catch((err) => {
          console.warn('[GlobalAudioHost] Lỗi phát âm thanh trực tiếp:', err);
          setCustomMusicPlaying(false);
          setCustomMusicError(
            'Không thể phát luồng âm thanh này (có thể do lỗi mạng, chính sách CORS hoặc định dạng không được hỗ trợ).'
          );
        });
    } else {
      audio.pause();
    }
  }, [
    customMusicPlaying,
    customMusicUrl,
    customMusicType,
    settings.isMuted,
    customMusicVolume,
    settings.masterVolume,
    setCustomMusicError,
    setCustomMusicPlaying
  ]);

  // 2. Đồng bộ vị trí portal YouTube Video trực tiếp vào anchor của AudioWidget khi mở
  const isYouTubeActive = customMusicType === 'youtube' && customMusicPlaying && Boolean(customMusicUrl);
  const youtubeEmbedUrl = isYouTubeActive ? extractYouTubeEmbedUrl(customMusicUrl) : null;

  useEffect(() => {
    if (!isYouTubeActive) {
      setPortalTarget(null);
      return;
    }

    if (isSoundsOpen) {
      const anchorEl = document.getElementById('youtube-player-anchor');
      if (anchorEl) {
        setPortalTarget(anchorEl);
        return;
      }
    }

    // Nếu AudioWidget đóng hoặc thu nhỏ: chuyển sang container nền offscreen
    if (offscreenContainerRef.current) {
      setPortalTarget(offscreenContainerRef.current);
    }
  }, [isYouTubeActive, isSoundsOpen]);

  // Kiểm tra liên tục nếu anchor vừa được mount trong AudioWidget
  useEffect(() => {
    if (!isYouTubeActive || !isSoundsOpen) return;

    const checkAnchor = () => {
      const anchorEl = document.getElementById('youtube-player-anchor');
      if (anchorEl && portalTarget !== anchorEl) {
        setPortalTarget(anchorEl);
      }
    };

    checkAnchor();
    const timer = setTimeout(checkAnchor, 100);
    return () => clearTimeout(timer);
  }, [isYouTubeActive, isSoundsOpen, portalTarget]);

  return (
    <div
      data-testid="global-audio-host"
      aria-hidden="true"
      className="pointer-events-none select-none"
    >
      {/* HTML5 Audio Player cố định toàn cục */}
      <audio
        ref={audioRef}
        preload="metadata"
        onError={() => {
          setCustomMusicPlaying(false);
          setCustomMusicError(
            'Máy chủ âm thanh từ chối kết nối hoặc bị chặn CORS. Vui lòng kiểm tra lại liên kết.'
          );
        }}
        onEnded={() => setCustomMusicPlaying(false)}
      />

      {/* Hidden offscreen container để giữ YouTube iframe không unmount khi widget đóng */}
      <div
        ref={offscreenContainerRef}
        data-testid="youtube-offscreen-container"
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 320,
          height: 180,
          opacity: 0.001,
          pointerEvents: 'none'
        }}
      />

      {/* Persistent YouTube Iframe qua React Portal:
          Khi AudioWidget mở: hiển thị trực tiếp bên trong vùng nội dung của khung,
          di chuyển tức thời theo phần cứng GPU mà KHÔNG hề bị lag hoặc trôi lệch.
          Khi widget đóng/thu nhỏ: chuyển sang container nền mà KHÔNG unmount, giữ nhạc tiếp tục phát. */}
      {isYouTubeActive &&
        youtubeEmbedUrl &&
        portalTarget &&
        createPortal(
          <div
            data-testid="global-youtube-container"
            className="w-full h-full relative rounded-lg overflow-hidden pointer-events-auto"
          >
            <iframe
              data-testid="youtube-stream-iframe"
              src={youtubeEmbedUrl}
              title="YouTube Player"
              className="w-full h-full border-0 rounded-lg shadow-md"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>,
          portalTarget
        )}
    </div>
  );
};
