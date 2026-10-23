import React, { useEffect, useRef } from 'react';
import { useBackgroundStore } from '../stores/useBackgroundStore';

export const BackgroundCanvas: React.FC = () => {
  const {
    getActivePreset,
    blurLevel,
    brightnessLevel,
    overlayOpacity,
    useStaticFallback,
    hasError,
    setLoading,
    setError,
    setStaticFallback
  } = useBackgroundStore();

  const preset = getActivePreset();
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

  if (!preset) return null;

  const filterStyle = {
    filter: `blur(${blurLevel}px) brightness(${brightnessLevel}%)`,
    transform: blurLevel > 0 ? 'scale(1.04)' : 'none' // Tránh viền mờ khi có blur
  };

  const isVideo = preset.category === 'video' && !useStaticFallback;
  const isImage = preset.category === 'image' && !useStaticFallback;

  return (
    <div
      data-testid="background-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none select-none"
    >
      {/* 1. Nền động Video */}
      {isVideo && (
        <video
          ref={videoRef}
          key={`video-${preset.url}`}
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
          className="w-full h-full object-cover transition-all duration-700"
          style={filterStyle}
        >
          <source src={preset.url} type="video/mp4" />
        </video>
      )}

      {/* 2. Nền tĩnh Image */}
      {isImage && (
        <img
          key={`img-${preset.url}`}
          src={preset.url}
          alt=""
          data-testid="background-image-element"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true, 'Ảnh nền lỗi, tự động chuyển sang nền tĩnh dự phòng');
          }}
          className="w-full h-full object-cover transition-all duration-700"
          style={filterStyle}
        />
      )}

      {/* 3. Nền Gradient / Fallback khi lỗi hoặc bật reduced-motion */}
      {(!isVideo && !isImage) && (
        <div
          data-testid="background-gradient-element"
          className="w-full h-full transition-all duration-700"
          style={{
            background: hasError ? preset.fallbackUrl : preset.url,
            ...filterStyle
          }}
        />
      )}

      {/* Lớp phủ tối (Overlay) điều chỉnh độ tương phản cho văn bản & timer */}
      <div
        data-testid="background-overlay"
        className="absolute inset-0 bg-slate-950 transition-opacity duration-300"
        style={{ opacity: overlayOpacity / 100 }}
      />
    </div>
  );
};
