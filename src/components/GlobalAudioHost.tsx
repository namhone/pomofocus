import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/useAudioStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { extractYouTubeEmbedUrl } from '../utils/media';

/**
 * GlobalAudioHost: Quản lý vòng đời phát âm thanh độc lập toàn cục (App.tsx).
 * Giữ cho nhạc nền hoặc luồng âm thanh tiếp tục phát kể cả khi widget đóng hoặc thu nhỏ.
 * Đối với YouTube Video:
 * - KHÔNG BAO GIỜ unmount iframe hoặc re-parent qua createPortal (vì re-parent iframe làm browser reload từ 0:00).
 * - Thẻ <iframe> luôn nằm cố định trong 1 DOM node duy nhất tại GlobalAudioHost.
 * - Sử dụng getBoundingClientRect() đồng bộ liên tục theo requestAnimationFrame:
 *   + Khi AudioWidget mở: neo vào #youtube-player-anchor (chiếm trọn 100% width aspect-video)
 *   + Khi thu nhỏ (Collapsed): neo vào #collapsed-youtube-pip-anchor (Mini Player PiP 160x90px)
 *   + Khi đóng widget: vị trí chuyển sang offscreen (-9999px) mà không unmount, video/nhạc tiếp tục chạy liền mạch từ giây đang phát.
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
  const isSoundsCollapsed = Boolean(soundsWidget?.isOpen && soundsWidget?.isCollapsed);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

  // 2. Đồng bộ vị trí YouTube Video độc lập cố định trong DOM
  const isYouTube = customMusicType === 'youtube' && Boolean(customMusicUrl);
  const youtubeEmbedUrl = isYouTube ? extractYouTubeEmbedUrl(customMusicUrl) : null;

  // Điều khiển Play / Pause / Volume cho iframe YouTube thông qua postMessage API
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !youtubeEmbedUrl) return;

    try {
      if (customMusicPlaying) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      } else {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
      }

      const effectiveVolume = settings.isMuted ? 0 : Math.round(customMusicVolume * settings.masterVolume * 100);
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [effectiveVolume] }),
        '*'
      );
    } catch {
      // Ignored if cross-origin message queueing
    }
  }, [customMusicPlaying, customMusicVolume, settings.masterVolume, settings.isMuted, youtubeEmbedUrl]);

  // Đồng bộ vị trí container của YouTube Iframe theo từng frame (requestAnimationFrame)
  useEffect(() => {
    if (!isYouTube || !youtubeEmbedUrl) {
      if (playerContainerRef.current) {
        playerContainerRef.current.style.top = '-9999px';
        playerContainerRef.current.style.left = '-9999px';
        playerContainerRef.current.style.opacity = '0.001';
        playerContainerRef.current.style.pointerEvents = 'none';
      }
      return;
    }

    let animId: number;

    const syncPosition = () => {
      const container = playerContainerRef.current;
      if (!container) return;

      const expandedAnchor = document.getElementById('youtube-player-anchor');
      const collapsedAnchor = document.getElementById('collapsed-youtube-pip-anchor');

      let targetEl: HTMLElement | null = null;
      if (isSoundsOpen && expandedAnchor) {
        targetEl = expandedAnchor;
      } else if (isSoundsCollapsed && collapsedAnchor) {
        targetEl = collapsedAnchor;
      }

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          container.style.position = 'fixed';
          container.style.top = `${rect.top}px`;
          container.style.left = `${rect.left}px`;
          container.style.width = `${rect.width}px`;
          container.style.height = `${rect.height}px`;
          container.style.opacity = '1';
          container.style.pointerEvents = 'auto';
          container.style.zIndex = isSoundsCollapsed ? '64' : '60';
        }
      } else {
        // Widget đóng hoặc đang ẩn: giữ nguyên phát offscreen
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '320px';
        container.style.height = '180px';
        container.style.opacity = '0.001';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-1';
      }

      animId = requestAnimationFrame(syncPosition);
    };

    animId = requestAnimationFrame(syncPosition);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isYouTube, youtubeEmbedUrl, isSoundsOpen, isSoundsCollapsed]);

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

      {/* Persistent YouTube Iframe container: Cố định vĩnh viễn trong DOM, không bao giờ bị reload */}
      {youtubeEmbedUrl && (
        <div
          ref={playerContainerRef}
          id="global-persistent-youtube-player"
          data-testid="global-youtube-container"
          className="fixed rounded-lg overflow-hidden bg-black shadow-xl"
          style={{
            position: 'fixed',
            top: -9999,
            left: -9999,
            width: 320,
            height: 180,
            opacity: 0.001,
            pointerEvents: 'none',
            zIndex: 60,
            transform: 'translateZ(0)'
          }}
        >
          <iframe
            ref={iframeRef}
            data-testid="youtube-stream-iframe"
            src={youtubeEmbedUrl}
            title="YouTube Player"
            className="w-full h-full border-0 rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};
