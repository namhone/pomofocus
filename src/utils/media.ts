/**
 * Media Utilities for YouTube Embeds & Direct Audio Streams
 */

export function extractYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch && listMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listMatch[1])}&autoplay=1`;
    }

    const vMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (vMatch && vMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${vMatch[1]}?autoplay=1&enablejsapi=1`;
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
