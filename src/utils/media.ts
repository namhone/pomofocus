import { isNativeApiRuntime, PRODUCTION_API_ORIGIN } from './apiConfig';

/**
 * Media Utilities for YouTube Embeds & Direct Audio Streams
 */

export function extractYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Nhận dạng trực tiếp Playlist ID (bắt đầu bằng PL, RD, hoặc OLAK5uy_)
  if (/^(?:PL|RD|OLAK5uy_)[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Nhận dạng trực tiếp 11 ký tự YouTube Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
}

/**
 * Feature 19: Return safe origin for YouTube IFrame player embed.
 * In Android Capacitor WebView, origin evaluates to https://localhost or file://,
 * which causes YouTube Error 150/101 ("video cannot be played on embedded players").
 * Substituting canonical production origin satisfies YouTube embed security policy.
 */
export function getSafeYouTubeOrigin(): string {
  if (typeof window === 'undefined') {
    return PRODUCTION_API_ORIGIN;
  }
  if (
    isNativeApiRuntime() ||
    window.location.protocol.startsWith('capacitor') ||
    window.location.protocol.startsWith('file') ||
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port)
  ) {
    return PRODUCTION_API_ORIGIN;
  }
  return window.location.origin;
}

export function isYouTubeMix(url: string): boolean {
  const listId = extractYouTubePlaylistId(url);
  return Boolean(listId && listId.startsWith('RD'));
}

export function buildYouTubeMixEmbedUrl(videoId: string, origin?: string): string {
  const hostOrigin = origin || getSafeYouTubeOrigin();
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&list=RD${videoId}&origin=${hostOrigin}`;
}

export function extractYouTubeEmbedUrl(url: string, autoMix: boolean = false, customOrigin?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const listId = extractYouTubePlaylistId(trimmed);
    const videoId = extractYouTubeVideoId(trimmed);
    const origin = customOrigin || getSafeYouTubeOrigin();

    if (listId) {
      // YouTube Mix (RD...) requires starting videoId in embed URL to avoid "Playlist does not exist" error
      if (listId.startsWith('RD') && videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?list=${encodeURIComponent(listId)}&autoplay=1`;
      }
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}&autoplay=1`;
    }

    if (videoId) {
      if (autoMix) {
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&list=RD${videoId}&origin=${origin}&autoplay=1`;
      }
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
    }

    return null;
  } catch {
    return null;
  }
}

export function isDirectAudioUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp3') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.wav') ||
    clean.endsWith('.aac') ||
    clean.endsWith('.m4a') ||
    clean.includes('/audio') ||
    clean.includes('stream') ||
    clean.includes(':8000') ||
    clean.includes(':8443')
  );
}
