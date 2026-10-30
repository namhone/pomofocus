import { describe, it, expect, beforeEach } from 'vitest';
import { extractYouTubeEmbedUrl, isDirectAudioUrl } from '../../src/utils/media';
import { useAudioStore, DEFAULT_SETTINGS } from '../../src/stores/useAudioStore';

describe('Media Utilities & Global Audio Lifecycle', () => {
  beforeEach(() => {
    useAudioStore.getState().resetToDefaults();
  });

  it('extractYouTubeEmbedUrl parses various YouTube formats', () => {
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBe(
      'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1'
    );
    expect(extractYouTubeEmbedUrl('https://youtu.be/4xDzrJKXOOY')).toBe(
      'https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1'
    );
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/embed/h2zkV-l_TbY')).toBe(
      'https://www.youtube-nocookie.com/embed/h2zkV-l_TbY?autoplay=1&enablejsapi=1'
    );
    expect(extractYouTubeEmbedUrl('https://www.youtube.com/playlist?list=PL1234567890')).toBe(
      'https://www.youtube-nocookie.com/embed/videoseries?list=PL1234567890&autoplay=1'
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
});
