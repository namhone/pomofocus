import React, { useCallback, useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/useAudioStore';

/**
 * GlobalAudioHost: Quản lý vòng đời phát âm thanh độc lập toàn cục (App.tsx).
 * Giữ cho luồng âm thanh trực tiếp (Direct Audio / MP3 / Radio stream) tiếp tục phát
 * liền mạch trong nền, với fade-in/out mượt mà và giải phóng PCM khi unmount/chuyển loại.
 */
export const GlobalAudioHost: React.FC = () => {
  const {
    settings,
    customMusicUrl,
    customMusicType,
    customMusicPlaying,
    customMusicVolume,
    setCustomMusicPlaying,
    setCustomMusicError,
  } = useAudioStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playSeqRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const computeTargetVol = useCallback(() => {
    const state = useAudioStore.getState();
    const raw = state.settings.isMuted ? 0 : state.customMusicVolume * state.settings.masterVolume;
    return Math.max(0, Math.min(1, raw));
  }, []);

  const clearFade = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeVolume = useCallback(
    (audio: HTMLAudioElement, toVol: number, durationMs: number, onDone?: () => void) => {
      clearFade();
      const safeTo = Math.max(0, Math.min(1, toVol));
      const startVol = Math.max(0, Math.min(1, audio.volume));
      if (durationMs <= 0 || Math.abs(startVol - safeTo) < 0.005) {
        try {
          audio.volume = safeTo;
        } catch {}
        onDone?.();
        return;
      }

      const stepMs = 20;
      const totalSteps = Math.max(1, Math.round(durationMs / stepMs));
      let step = 0;

      fadeTimerRef.current = setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / totalSteps);
        const nextVol = Math.max(0, Math.min(1, startVol + (safeTo - startVol) * progress));
        try {
          audio.volume = nextVol;
        } catch {}

        if (step >= totalSteps) {
          clearFade();
          try {
            audio.volume = safeTo;
          } catch {}
          onDone?.();
        }
      }, stepMs);
    },
    [clearFade]
  );

  const teardownAudio = useCallback(
    (audio: HTMLAudioElement | null) => {
      clearFade();
      playSeqRef.current += 1;
      if (!audio) return;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        if (typeof audio.removeAttribute === 'function') {
          audio.removeAttribute('src');
        }
        if (typeof audio.load === 'function') {
          audio.load();
        }
      } catch {}
    },
    [clearFade]
  );

  // 1. Đồng bộ volume Direct Audio mượt mà (không kích hoạt lại audio.play())
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const effectiveVol = settings.isMuted ? 0 : customMusicVolume * settings.masterVolume;
    const targetVol = Math.max(0, Math.min(1, effectiveVol));
    if (!audio.paused) {
      fadeVolume(audio, targetVol, 80);
    } else {
      clearFade();
      audio.volume = targetVol;
    }
  }, [customMusicVolume, settings.masterVolume, settings.isMuted, fadeVolume, clearFade]);

  // 2. Đồng bộ phát / dừng luồng âm thanh trực tiếp
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (customMusicType !== 'direct_audio' || !customMusicUrl) {
      if (audio.getAttribute('src') || !audio.paused) {
        teardownAudio(audio);
      }
      return;
    }

    if (customMusicPlaying) {
      const seq = ++playSeqRef.current;
      if (audio.getAttribute('src') !== customMusicUrl) {
        clearFade();
        try {
          audio.pause();
        } catch {}
        audio.src = customMusicUrl;
        try {
          if (typeof audio.load === 'function') {
            audio.load();
          }
        } catch {}
      }
      audio.volume = 0;

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (isUnmountedRef.current) {
              teardownAudio(audio);
              return;
            }
            if (seq !== playSeqRef.current) {
              return;
            }
            setCustomMusicError(null);
            fadeVolume(audio, computeTargetVol(), 220);
          })
          .catch((err) => {
            if (isUnmountedRef.current || seq !== playSeqRef.current) return;
            console.warn('[GlobalAudioHost] Lỗi phát âm thanh trực tiếp:', err);
            setCustomMusicPlaying(false);
            setCustomMusicError(
              'Không thể phát luồng âm thanh này (có thể do lỗi mạng, chính sách CORS hoặc định dạng không được hỗ trợ).'
            );
          });
      }
    } else {
      const seq = ++playSeqRef.current;
      if (!audio.paused && audio.volume > 0.01) {
        fadeVolume(audio, 0, 160, () => {
          if (seq === playSeqRef.current) {
            try {
              audio.pause();
            } catch {}
          }
        });
      } else {
        clearFade();
        try {
          audio.pause();
        } catch {}
      }
    }
  }, [
    customMusicPlaying,
    customMusicUrl,
    customMusicType,
    setCustomMusicError,
    setCustomMusicPlaying,
    clearFade,
    fadeVolume,
    teardownAudio,
    computeTargetVol,
  ]);

  // 3. Unmount cleanup giải phóng bộ nhớ PCM
  useEffect(() => {
    isUnmountedRef.current = false;
    const audio = audioRef.current;
    return () => {
      isUnmountedRef.current = true;
      teardownAudio(audio);
    };
  }, [teardownAudio]);

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
