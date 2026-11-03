/**
 * Media Utilities for YouTube Embeds & Direct Audio Streams
 */

export function extractYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.trim().match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
}

export function isYouTubeMix(url: string): boolean {
  const listId = extractYouTubePlaylistId(url);
  return Boolean(listId && listId.startsWith('RD'));
}

export function extractYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const listId = extractYouTubePlaylistId(trimmed);
    const videoId = extractYouTubeVideoId(trimmed);

    if (listId) {
      // YouTube Mix (RD...) requires starting videoId in embed URL to avoid "Playlist does not exist" error
      if (listId.startsWith('RD') && videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?list=${encodeURIComponent(listId)}&autoplay=1`;
      }
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}&autoplay=1`;
    }

    if (videoId) {
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
