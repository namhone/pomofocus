import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractYouTubeEmbedUrl,
  extractYouTubePlaylistId,
  extractYouTubeVideoId,
  isYouTubeMix,
  isDirectAudioUrl
} from '../../src/utils/media';
import { useAudioStore, DEFAULT_SETTINGS } from '../../src/stores/useAudioStore';
import { DEFAULT_FAVORITE_PLAYLISTS } from '../../src/components/MediaWidget';

describe('Media Utilities & Global Audio Lifecycle', () => {
  beforeEach(() => {
    useAudioStore.getState().resetToDefaults();
  });

  it('extractYouTubePlaylistId correctly extracts list parameter from various URL structures', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/playlist?list=PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn')).toBe(
      'PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn'
    );
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=jfKfPfyJRdk&list=PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo')).toBe(
      'PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo'
    );
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDMMjfKfPfyJRdk')).toBe(
      'RDMMjfKfPfyJRdk'
    );
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBeNull();
    expect(extractYouTubePlaylistId('')).toBeNull();
  });

  it('isYouTubeMix correctly detects YouTube Mix RD lists', () => {
    expect(isYouTubeMix('https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDMMjfKfPfyJRdk')).toBe(true);
    expect(isYouTubeMix('https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDCLAK5uy_k')).toBe(true);
    expect(isYouTubeMix('https://www.youtube.com/playlist?list=PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn')).toBe(false);
  });

  it('extractYouTubeVideoId correctly extracts video ID', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
    expect(extractYouTubeVideoId('https://youtu.be/4xDzrJKXOOY')).toBe('4xDzrJKXOOY');
    expect(extractYouTubeVideoId('https://www.youtube.com/playlist?list=PL1234567890')).toBeNull();
  });

  it('extractYouTubeEmbedUrl parses various YouTube formats including YouTube Mix (RD)', () => {
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBe(
      'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1'
    );
    expect(extractYouTubeEmbedUrl('https://youtu.be/4xDzrJKXOOY')).toBe(
      'https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1'
    );
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/embed/h2zkV-l_TbY')).toBe(
      'https://www.youtube-nocookie.com/embed/h2zkV-l_TbY?autoplay=1&enablejsapi=1'
    );
    // Regular Playlist (PL...): uses videoseries
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/playlist?list=PL1234567890')).toBe(
      'https://www.youtube-nocookie.com/embed/videoseries?list=PL1234567890&autoplay=1'
    );
    // YouTube Mix (RD...): preserves starting videoId with list parameter
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDMMjfKfPfyJRdk')).toBe(
      'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?list=RDMMjfKfPfyJRdk&autoplay=1'
    );
    expect(extractYouTubeEmbedUrl('https://invalid-url.com')).toBeNull();
  });

  it('isDirectAudioUrl identifies audio file extensions and stream keywords', () => {
    expect(isDirectAudioUrl('https://stream.example.com/live.mp3')).toBe(true);
    expect(isDirectAudioUrl('https://example.com/music.ogg')).toBe(true);
    expect(isDirectAudioUrl('https://example.com/audio/sample.wav')).toBe(true);
    expect(isDirectAudioUrl('https://radio.example.com:8000/live')).toBe(true);
    expect(isDirectAudioUrl('https://youtube.com/watch?v=123')).toBe(false);
  });

  it('maintains custom music state in useAudioStore independently of UI widget state', () => {
    const store = useAudioStore.getState();

    // 1. Set music URL and start playing
    store.setCustomMusicUrl('https://example.com/track.mp3', 'direct_audio');
    store.setCustomMusicPlaying(true);
    store.setCustomMusicVolume(0.75);

    expect(useAudioStore.getState().customMusicPlaying).toBe(true);
    expect(useAudioStore.getState().customMusicUrl).toBe('https://example.com/track.mp3');
    expect(useAudioStore.getState().customMusicVolume).toBe(0.75);

    // 2. Changing volume or master settings keeps playing state intact
    store.setMasterVolume(0.9);
    expect(useAudioStore.getState().customMusicPlaying).toBe(true);
    expect(useAudioStore.getState().settings.masterVolume).toBe(0.9);

    // 3. Pause stops playing without losing track URL
    store.setCustomMusicPlaying(false);
    expect(useAudioStore.getState().customMusicPlaying).toBe(false);
    expect(useAudioStore.getState().customMusicUrl).toBe('https://example.com/track.mp3');

    // 4. Resume starts playing again
    store.setCustomMusicPlaying(true);
    expect(useAudioStore.getState().customMusicPlaying).toBe(true);
  });

  it('supports YouTube playlist parsing and favorite playlists workflow', () => {
    // 1. Parsing single video vs playlist with list parameter
    const videoWithList = 'https://www.youtube.com/watch?v=jfKfPfyJRdk&list=PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn';
    const embedUrl = extractYouTubeEmbedUrl(videoWithList);
    expect(embedUrl).toContain('videoseries?list=PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn');

    // 2. Setting store with playlist URL
    const store = useAudioStore.getState();
    store.setCustomMusicUrl(videoWithList, 'youtube');
    store.setCustomMusicPlaying(true);

    expect(useAudioStore.getState().customMusicUrl).toBe(videoWithList);
    expect(useAudioStore.getState().customMusicType).toBe('youtube');
    expect(useAudioStore.getState().customMusicPlaying).toBe(true);

    // 3. YouTube Mix (RD...) workflow
    const mixUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk&list=RDMMjfKfPfyJRdk';
    const mixEmbed = extractYouTubeEmbedUrl(mixUrl);
    expect(mixEmbed).toBe('https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?list=RDMMjfKfPfyJRdk&autoplay=1');
    expect(isYouTubeMix(mixUrl)).toBe(true);

    // 4. Default Favorite Playlists verification
    expect(DEFAULT_FAVORITE_PLAYLISTS.length).toBeGreaterThanOrEqual(4);
    const hasMix = DEFAULT_FAVORITE_PLAYLISTS.some((fav) => fav.url.includes('list=RD'));
    const hasPlaylist = DEFAULT_FAVORITE_PLAYLISTS.some((fav) => fav.url.includes('list=PL'));
    expect(hasMix).toBe(true);
    expect(hasPlaylist).toBe(true);
  });
});
