import React, { useEffect, useRef } from 'react';
import { useBackgroundStore } from '../stores/useBackgroundStore';
import { FALLBACK_GRADIENTS } from '../data/backgroundPresets';

export const BackgroundCanvas: React.FC = () => {
  const {
    activePresetId,
    customUrl,
    customType,
    presets,
    blurLevel,
    brightnessLevel,
    overlayOpacity,
    useStaticFallback,
    hasError,
    setLoading,
    setError,
    setStaticFallback
  } = useBackgroundStore();

  const preset =
    activePresetId === 'custom' && customUrl
      ? {
          id: 'custom',
          title: 'Nền Tùy Chỉnh',
          category: (customType || 'image') as 'image' | 'video',
          url: customUrl,
          fallbackUrl: 'deep-space',
          thumbnailUrl: '',
          author: 'Người dùng',
          license: 'Custom',
          description: '',
          tags: ['custom']
        }
      : presets.find((p) => p.id === activePresetId) || presets[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Lắng nghe chính sách prefers-reduced-motion của hệ điều hành
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleMotion = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setStaticFallback(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    };

    handleMotion(mediaQuery);
    mediaQuery.addEventListener?.('change', handleMotion);
    return () => {
      mediaQuery.removeEventListener?.('change', handleMotion);
    };
  }, [setStaticFallback]);

  useEffect(() => {
    const syncVideoPlayback = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden || useStaticFallback) {
        video.pause();
      } else {
        void video.play().catch(() => {
          setError(true, 'Không thể phát video nền, tự động chuyển sang nền tĩnh dự phòng');
        });
      }
    };

    document.addEventListener('visibilitychange', syncVideoPlayback);
    syncVideoPlayback();
    return () => document.removeEventListener('visibilitychange', syncVideoPlayback);
  }, [setError, useStaticFallback, activePresetId, customUrl]);

  if (!preset) return null;

  const filterStyle: React.CSSProperties = {
    filter: `blur(${blurLevel}px) brightness(${brightnessLevel}%)`,
    transform: blurLevel > 0 ? 'scale(1.04)' : 'none',
    transition: 'filter 0.3s ease, transform 0.3s ease'
  };

  const isVideo = preset.category === 'video' && !useStaticFallback && !hasError;

  // Xác định nguồn ảnh tĩnh:
  // 1. Nếu preset là ảnh: nạp preset.url (nếu có lỗi nạp fallbackUrl nếu là ảnh)
  // 2. Nếu preset là video: luôn cung cấp fallbackUrl làm ảnh nền móng và poster trước khi video sẵn sàng
  let imageSrc: string | null = null;
  if (preset.category === 'image') {
    if (!hasError) {
      imageSrc = preset.url;
    } else if (
      preset.fallbackUrl?.startsWith('http') ||
      preset.fallbackUrl?.startsWith('data:') ||
      preset.fallbackUrl?.startsWith('blob:')
    ) {
      imageSrc = preset.fallbackUrl;
    }
  } else if (preset.category === 'video') {
    if (
      preset.fallbackUrl?.startsWith('http') ||
      preset.fallbackUrl?.startsWith('data:') ||
      preset.fallbackUrl?.startsWith('blob:')
    ) {
      imageSrc = preset.fallbackUrl;
    }
  } else if (
    preset.url?.startsWith('http') ||
    preset.url?.startsWith('data:') ||
    preset.url?.startsWith('blob:')
  ) {
    if (!hasError) imageSrc = preset.url;
  }

  // Luôn đảm bảo gradient CSS hợp lệ (tránh gán URL ảnh vào background shorthand)
  const validGradient =
    preset.fallbackUrl?.startsWith('linear-gradient') || preset.fallbackUrl?.startsWith('radial-gradient')
      ? preset.fallbackUrl
      : FALLBACK_GRADIENTS[preset.id as keyof typeof FALLBACK_GRADIENTS] || FALLBACK_GRADIENTS.deepSpace;

  return (
    <div
      data-testid="background-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none select-none"
    >
      {/* 1. Base Gradient Layer (Luôn hiện diện làm nền móng vững chắc và fallback tức thì) */}
      <div
        data-testid="background-gradient-element"
        className="absolute inset-0 w-full h-full transition-all duration-700"
        style={{
          background: validGradient,
          ...filterStyle
        }}
      />

      {/* 2. Nền động Video */}
      {isVideo && (
        <video
          ref={videoRef}
          key={`video-${preset.url}`}
          poster={preset.fallbackUrl?.startsWith('http') ? preset.fallbackUrl : undefined}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          data-testid="background-video-element"
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setError(true, 'Video nền lỗi, tự động chuyển sang nền tĩnh dự phòng');
          }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={filterStyle}
        >
          <source src={preset.url} type="video/mp4" />
        </video>
      )}

      {/* 3. Nền tĩnh Image: Ảnh thật chất lượng cao */}
      {imageSrc && (
        <img
          key={`img-${imageSrc}`}
          src={imageSrc}
          alt=""
          data-testid="background-image-element"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true, 'Ảnh nền lỗi, tự động chuyển sang nền tĩnh dự phòng');
          }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={filterStyle}
        />
      )}

      {/* 4. Lớp phủ tối (Overlay) điều chỉnh tương phản */}
      <div
        data-testid="background-overlay"
        className="absolute inset-0 bg-slate-950 transition-opacity duration-300"
        style={{ opacity: overlayOpacity / 100 }}
      />
    </div>
  );
};
