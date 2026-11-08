import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractYouTubeVideoId,
  extractYouTubePlaylistId,
  extractYouTubeEmbedUrl,
  isYouTubeMix
} from '../../src/utils/media';
import { useLayoutStore } from '../../src/stores/useLayoutStore';

describe('PomoFocus v6.1 Ultimate Verification Suite', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      isZenMode: false,
      isShortcutsModalOpen: false
    });
  });

  describe('1. Liquid Glass Button CSS & Breathing Keyframes', () => {
    it('defines .liquid-glass-btn, .liquid-glass-btn-active and zenBreathe keyframes in liquidDock.css', () => {
      const cssPath = path.resolve('src/styles/liquidDock.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      expect(css).toContain('.liquid-glass-btn');
      expect(css).toContain('backdrop-filter: blur(24px) saturate(180%)');
      expect(css).toContain('.liquid-glass-btn-active');
      expect(css).toContain('@keyframes zenBreathe');
      expect(css).toContain('.animate-zen-breathe');
    });
  });

  describe('2. Zen Mode Zero-Scrollbar & Ambient Glow Invariants', () => {
    it('verifies ZenOverlay uses h-screen h-[100dvh] overflow-hidden and ambient glow', () => {
      const zenPath = path.resolve('src/components/ZenOverlay.tsx');
      const content = fs.readFileSync(zenPath, 'utf8');

      expect(content).toContain('h-screen h-[100dvh]');
      expect(content).toContain('overflow-hidden');
      expect(content).toContain('bg-emerald-500/15 blur-3xl rounded-full');
      expect(content).not.toContain('overflow-y-auto');
    });

    it('verifies TimerTestInterface removes scale-105 in Zen mode and attaches animate-zen-breathe', () => {
      const timerPath = path.resolve('src/components/TimerTestInterface.tsx');
      const content = fs.readFileSync(timerPath, 'utf8');

      expect(content).not.toContain('scale-105');
      expect(content).toContain('animate-zen-breathe');
      expect(content).toContain('liquid-glass-btn');
    });
  });

  describe('3. Typography & Micro-Interactions Invariants', () => {
    it('verifies NotesWidget textarea uses font-sans instead of font-mono', () => {
      const notesPath = path.resolve('src/components/NotesWidget.tsx');
      const content = fs.readFileSync(notesPath, 'utf8');

      expect(content).toContain('font-sans resize-none');
      expect(content).not.toContain('font-mono resize-none');
    });

    it('verifies TasksWidget uses custom circular glass checkbox and rounded-xl priority chips', () => {
      const tasksPath = path.resolve('src/components/TasksWidget.tsx');
      const content = fs.readFileSync(tasksPath, 'utf8');

      expect(content).toContain('rounded-full border transition-all');
      expect(content).toContain('className="sr-only"');
      expect(content).toContain('rounded-xl border text-[9px]');
    });
  });

  describe('4. Media Utilities (Full URLs, Plain Video IDs, and Playlists)', () => {
    it('correctly extracts plain 11-char Video ID', () => {
      const plainId = 'rFZHOHl-L8A';
      expect(extractYouTubeVideoId(plainId)).toBe('rFZHOHl-L8A');

      const embed = extractYouTubeEmbedUrl(plainId);
      expect(embed).toContain('rFZHOHl-L8A');
    });

    it('correctly extracts full YouTube video URLs and shorts', () => {
      const watchUrl = 'https://www.youtube.com/watch?v=5yx6BWlEVcY';
      expect(extractYouTubeVideoId(watchUrl)).toBe('5yx6BWlEVcY');

      const shortUrl = 'https://youtu.be/5yx6BWlEVcY';
      expect(extractYouTubeVideoId(shortUrl)).toBe('5yx6BWlEVcY');
    });

    it('correctly extracts plain Playlist IDs (PL, RD, OLAK5uy_)', () => {
      const plainPlaylistId = 'PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn';
      expect(extractYouTubePlaylistId(plainPlaylistId)).toBe('PLofht4PTcKYnaH8w5gkDC0o6z738yq2Qn');

      const plainMixId = 'RDMM5qap5aO4i9A';
      expect(extractYouTubePlaylistId(plainMixId)).toBe('RDMM5qap5aO4i9A');
      expect(isYouTubeMix(plainMixId)).toBe(true);
    });
  });

  describe('5. Shortcuts & Esc Capture Invariants', () => {
    it('provides isShortcutsModalOpen and toggleShortcutsModal in useLayoutStore', () => {
      const store = useLayoutStore.getState();
      expect(store.isShortcutsModalOpen).toBe(false);

      store.toggleShortcutsModal();
      expect(useLayoutStore.getState().isShortcutsModalOpen).toBe(true);

      store.setShortcutsModalOpen(false);
      expect(useLayoutStore.getState().isShortcutsModalOpen).toBe(false);
    });

    it('verifies AiCreditsTopupModal has window Escape capture event listener', () => {
      const topupPath = path.resolve('src/components/AiCreditsTopupModal.tsx');
      const content = fs.readFileSync(topupPath, 'utf8');

      expect(content).toContain("window.addEventListener('keydown', handleKeyDown, true)");
    });
  });

  describe('6. Study Room Participants Button', () => {
    it('verifies StudyRoomView renders an interactive button for participants list', () => {
      const roomPath = path.resolve('src/components/StudyRoomView.tsx');
      const content = fs.readFileSync(roomPath, 'utf8');

      expect(content).toContain('data-testid="btn-room-participants-list"');
      expect(content).toContain("setActiveSettingsTab('room_admin')");
      expect(content).toContain('setIsDeviceModalOpen(true)');
    });
  });
});
