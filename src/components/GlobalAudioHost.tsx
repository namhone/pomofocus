import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/useAudioStore';

/**
 * GlobalAudioHost: Quản lý vòng đời phát âm thanh độc lập toàn cục (App.tsx).
 * Giữ cho luồng âm thanh trực tiếp (Direct Audio / MP3 / Radio stream) tiếp tục phát
 * liền mạch trong nền.
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Đồng bộ volume Direct Audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const effectiveVol = settings.isMuted ? 0 : customMusicVolume * settings.masterVolume;
    audio.volume = Math.max(0, Math.min(1, effectiveVol));
  }, [customMusicVolume, settings.masterVolume, settings.isMuted]);

  // 2. Đồng bộ phát / dừng luồng âm thanh trực tiếp
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

  return (
    <div
      data-testid="global-audio-host"
      aria-hidden="true"
      className="pointer-events-none select-none hidden"
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
    </div>
  );
};
