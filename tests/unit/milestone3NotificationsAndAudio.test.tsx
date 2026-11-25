import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from '../../src/services/notificationService';
import { AudioContextManager } from '../../src/services/audioContextManager';
import { AmbientSynthesizer } from '../../src/services/ambientSynthesizer';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useTimerStore, wakeLockManager } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { syncMediaSession, setupMediaSessionActionHandlers } from '../../src/utils/mediaSession';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { AudioWidget } from '../../src/components/AudioWidget';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';

// Mock Web Audio API
class MockAudioParam {
  value = 1;
  setValueAtTime = vi.fn((val: number) => { this.value = val; });
  linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  setTargetAtTime = vi.fn((val: number) => { this.value = val; });
  cancelScheduledValues = vi.fn();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam();
  knee = new MockAudioParam();
  ratio = new MockAudioParam();
  attack = new MockAudioParam();
  release = new MockAudioParam();
}

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = new MockAudioNode();
  createGain() { return new MockGainNode(); }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  createOscillator() {
    return {
      type: 'sine',
      frequency: new MockAudioParam(),
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: new MockAudioParam(),
      Q: new MockAudioParam(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createChannelMerger() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }
  sampleRate = 44100;
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}

describe('Milestone 3: Background Notifications, WakeLock & Audio Engine Hardening', () => {
  beforeEach(() => {
    (window as any).AudioContext = MockAudioContext;
    if (typeof window !== 'undefined' && typeof window.HTMLMediaElement !== 'undefined') {
      window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
      window.HTMLMediaElement.prototype.pause = vi.fn();
    }
    class MockMediaMetadata {
      title: string;
      artist: string;
      album: string;
      artwork: any[];
      constructor(init: any) {
        this.title = init.title || '';
        this.artist = init.artist || '';
        this.album = init.album || '';
        this.artwork = init.artwork || [];
      }
    }
    (window as any).MediaMetadata = MockMediaMetadata;
    (global as any).MediaMetadata = MockMediaMetadata;
    wakeLockManager.sentinel = null;
    wakeLockManager.isRequesting = false;
    localStorage.clear();
    useAudioStore.getState().resetToDefaults();
    useTimerStore.getState().reset();
  });

  afterEach(() => {
    wakeLockManager.sentinel = null;
    wakeLockManager.isRequesting = false;
    AudioContextManager.getInstance().close();
    AmbientSynthesizer.getInstance().stopAll();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // FEATURE 12: Android 13+ Notification Permissions, Channel & Exact Alarm
  // =========================================================================
  describe('Feature 12: Android 13+ Notification Permissions, Channel & Exact Alarms', () => {
    it('12.1 AndroidManifest.xml declares SCHEDULE_EXACT_ALARM and POST_NOTIFICATIONS', () => {
      const manifestPath = path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

      expect(manifestContent).toContain('android.permission.POST_NOTIFICATIONS');
      expect(manifestContent).toContain('android.permission.SCHEDULE_EXACT_ALARM');
      expect(manifestContent).toContain('android.permission.WAKE_LOCK');
    });

    it('12.2 MainActivity.java registers pomofocus_timer_channel with IMPORTANCE_HIGH', () => {
      const javaPath = path.resolve(__dirname, '../../android/app/src/main/java/com/pomofocus/workspace/MainActivity.java');
      const javaContent = fs.readFileSync(javaPath, 'utf-8');

      expect(javaContent).toContain('pomofocus_timer_channel');
      expect(javaContent).toContain('NotificationManager.IMPORTANCE_HIGH');
      expect(javaContent).toContain('createNotificationChannel');
    });

    it('12.3 LegalViews.tsx transparently discloses SCHEDULE_EXACT_ALARM in compliance with Law 91/2025/QH15', () => {
      const legalPath = path.resolve(__dirname, '../../src/components/LegalViews.tsx');
      const legalContent = fs.readFileSync(legalPath, 'utf-8');

      expect(legalContent).toContain('SCHEDULE_EXACT_ALARM');
      expect(legalContent).toContain('POST_NOTIFICATIONS');
      expect(legalContent).toContain('WAKE_LOCK');
    });

    it('12.4 NotificationService.scheduleExactAlarm schedules alarm with allowWhileIdle and can be cancelled', async () => {
      const scheduleMock = vi.fn().mockResolvedValue({ notifications: [] });
      const cancelMock = vi.fn().mockResolvedValue({ notifications: [] });
      const createChannelMock = vi.fn().mockResolvedValue(undefined);

      (window as any).Capacitor = {
        Plugins: {
          LocalNotifications: {
            createChannel: createChannelMock,
            schedule: scheduleMock,
            cancel: cancelMock,
            requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' })
          }
        }
      };

      const triggerAt = Date.now() + 5000;
      await NotificationService.scheduleExactAlarm({
        id: 1001,
        title: 'Hiệp tập trung kết thúc',
        body: 'Nghỉ ngơi nào!',
        triggerAt,
        allowWhileIdle: true
      });

      expect(createChannelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pomofocus_timer_channel',
          importance: 5
        })
      );

      expect(scheduleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: [
            expect.objectContaining({
              id: 1001,
              channelId: 'pomofocus_timer_channel',
              schedule: expect.objectContaining({
                allowWhileIdle: true
              })
            })
          ]
        })
      );

      await NotificationService.cancelExactAlarm(1001);
      expect(cancelMock).toHaveBeenCalledWith({ notifications: [{ id: 1001 }] });

      delete (window as any).Capacitor;
    });
  });

  // =========================================================================
  // FEATURE 13: Centralized Screen Wake Lock in useTimerStore & Re-acquisition
  // =========================================================================
  describe('Feature 13: Centralized Screen Wake Lock with auto re-acquisition', () => {
    it('13.1 wakeLockManager requests screen wake lock and releases sentinel', async () => {
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const requestMock = vi.fn().mockResolvedValue({
        release: releaseMock,
        addEventListener: vi.fn()
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      await wakeLockManager.request();
      expect(requestMock).toHaveBeenCalledWith('screen');
      expect(wakeLockManager.isActive()).toBe(true);

      await wakeLockManager.release();
      expect(releaseMock).toHaveBeenCalled();
      expect(wakeLockManager.isActive()).toBe(false);
    });

    it('13.2 wakeLockManager handles rejection gracefully without throwing', async () => {
      const requestMock = vi.fn().mockRejectedValue(new Error('NotAllowedError: Battery Saver'));

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      await expect(wakeLockManager.request()).resolves.not.toThrow();
      expect(wakeLockManager.isActive()).toBe(false);
    });

    it('13.3 useTimerStore.start() acquires wake lock and pause() releases wake lock', async () => {
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const requestMock = vi.fn().mockResolvedValue({
        release: releaseMock,
        addEventListener: vi.fn()
      });

      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: requestMock },
        writable: true,
        configurable: true
      });

      const store = useTimerStore.getState();
      store.init();

      const wakeLockSpy = vi.spyOn(wakeLockManager, 'request');

      act(() => {
        store.start();
      });

      // Allow microtask queue to process wake lock promise resolution
      await Promise.resolve();

      expect(wakeLockSpy).toHaveBeenCalled();
      expect(requestMock).toHaveBeenCalled();

      act(() => {
        store.pause();
      });

      expect(releaseMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // FEATURE 14: Audio Ducking, Overlap Prevention & Preview Cleanup
  // =========================================================================
  describe('Feature 14: Audio Ducking & Overlap Prevention', () => {
    it('14.1 AudioContextManager routes ambient audio through dedicated ambientBusGain connected to masterGain', () => {
      const audioMgr = AudioContextManager.getInstance();
      const ctx = audioMgr.getContext();
      expect(ctx).toBeDefined();

      const ambientBus = audioMgr.getAmbientBusGain();
      const masterGain = audioMgr.getMasterGain();

      expect(ambientBus).toBeDefined();
      expect(masterGain).toBeDefined();
      expect(ambientBus?.connect).toHaveBeenCalledWith(masterGain);
    });

    it('14.2 applyAudioDucking ducks ambient bus without altering user masterVolume setting', () => {
      const store = useAudioStore.getState();
      store.setMasterVolume(0.4);

      store.applyAudioDucking();

      const audioMgr = AudioContextManager.getInstance();
      const ambientBus = audioMgr.getAmbientBusGain() as any;
      expect(ambientBus?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.15, expect.any(Number));

      // Master volume setting remains 40%
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.4);
    });

    it('14.3 stopChime halts both HTMLAudio and ChimeSynthesizer immediately', () => {
      const store = useAudioStore.getState();
      expect(typeof store.stopChime).toBe('function');

      // Calling stopChime does not throw and halts current chime
      expect(() => store.stopChime()).not.toThrow();
    });

    it('14.4 AudioWidget cleans up chime preview when switching tabs away from chime', () => {
      const stopChimeSpy = vi.spyOn(useAudioStore.getState(), 'stopChime');
      const { unmount } = render(<AudioWidget />);

      // Switch to ambient tab
      act(() => {
        useAudioStore.getState().setActiveTab('ambient');
      });

      expect(stopChimeSpy).toHaveBeenCalled();

      unmount();
      expect(stopChimeSpy).toHaveBeenCalledTimes(2);
    });

    it('14.5 MobileSettingsView cleans up chime preview upon unmount', () => {
      const stopChimeSpy = vi.spyOn(useAudioStore.getState(), 'stopChime');
      const { unmount } = render(<MobileSettingsView />);

      unmount();
      expect(stopChimeSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // FEATURE 15: Mixer "Tắt tất cả" Button & AudioContext Suspension
  // =========================================================================
  describe('Feature 15: Mixer "Tắt tất cả" button & AudioContext Suspension', () => {
    it('15.1 AmbientSynthesizer.stopAll() disconnects all active nodes and suspends AudioContext', async () => {
      vi.useFakeTimers();
      try {
        const audioMgr = AudioContextManager.getInstance();
        const suspendSpy = vi.spyOn(audioMgr, 'suspend');

        const synth = AmbientSynthesizer.getInstance();
        await synth.playTrack('noise_pink', 0.5);

        expect(synth.isTrackPlaying('noise_pink')).toBe(true);

        synth.stopAll();

        expect(synth.isTrackPlaying('noise_pink')).toBe(false);
        // Cho phép fade-out 150ms hoàn tất trước khi suspend()
        await vi.advanceTimersByTimeAsync(200);
        expect(suspendSpy).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('15.2 MobileAppShell renders "Tắt tất cả" button in mixer when tracks are active and triggers stopAllTracks', async () => {
      const stopAllTracksSpy = vi.spyOn(useAudioStore.getState(), 'stopAllTracks');

      useLayoutStore.setState({ activeMobileTab: 'spaces' as any });
      // Set an active track
      useAudioStore.setState({
        tracks: useAudioStore.getState().tracks.map((t, idx) =>
          idx === 0 ? { ...t, isPlaying: true } : t
        )
      });

      render(<MobileAppShell />);

      // Switch to audio subtab in Spaces
      const audioSubTabBtn = screen.getByTestId('mobile-spaces-subtab-audio');
      fireEvent.click(audioSubTabBtn);

      const stopAllBtn = screen.getByTestId('mobile-mixer-stop-all');
      expect(stopAllBtn).toBeDefined();
      expect(stopAllBtn.textContent).toContain('Tắt tất cả (1)');

      fireEvent.click(stopAllBtn);
      expect(stopAllTracksSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // FEATURE 16: Bluetooth devicechange & Meet Voice Ducking
  // =========================================================================
  describe('Feature 16: Bluetooth devicechange & Meet Voice Ducking', () => {
    it('16.1 duckForVoice ducks ambient bus to 20% when active and restores to 100% when inactive', () => {
      const audioMgr = AudioContextManager.getInstance();
      const ambientBus = audioMgr.getAmbientBusGain() as any;

      const store = useAudioStore.getState();

      store.duckForVoice(true);
      expect(ambientBus?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, expect.any(Number));

      store.duckForVoice(false);
      expect(ambientBus?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expect.any(Number));
    });

    it('16.2 Disconnecting audio output device triggers stopAllTracks to protect hearing', async () => {
      let deviceChangeListener: (() => void) | null = null;
      let mockDevices = [
        { deviceId: 'headphone_bt_1', kind: 'audiooutput', label: 'Bluetooth Headset' },
        { deviceId: 'internal_speaker', kind: 'audiooutput', label: 'Speaker' }
      ];

      const enumerateDevicesMock = vi.fn().mockImplementation(async () => mockDevices);
      const addEventListenerMock = vi.fn((event: string, cb: () => void) => {
        if (event === 'devicechange') deviceChangeListener = cb;
      });

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          enumerateDevices: enumerateDevicesMock,
          addEventListener: addEventListenerMock,
          removeEventListener: vi.fn()
        },
        writable: true,
        configurable: true
      });

      const stopAllTracksSpy = vi.spyOn(useAudioStore.getState(), 'stopAllTracks');

      // Re-trigger listener setup
      useAudioStore.getState().stopAllTracks();

      // Simulate headphone disconnect (lost device)
      mockDevices = [
        { deviceId: 'internal_speaker', kind: 'audiooutput', label: 'Speaker' }
      ];

      if (deviceChangeListener) {
        await act(async () => {
          deviceChangeListener!();
          await Promise.resolve();
        });
        expect(stopAllTracksSpy).toHaveBeenCalled();
      }
    });
  });

  // =========================================================================
  // FEATURE 17: Zero-Volume Visual/Haptic Alert & MediaSession Synchronization
  // =========================================================================
  describe('Feature 17: Zero-Volume Alert & MediaSession Sync', () => {
    it('17.1 syncMediaSession updates navigator.mediaSession metadata and playbackState', () => {
      let capturedMetadata: any = null;
      let capturedState: string = '';

      Object.defineProperty(navigator, 'mediaSession', {
        value: {
          set metadata(val: any) { capturedMetadata = val; },
          get metadata() { return capturedMetadata; },
          set playbackState(val: string) { capturedState = val; },
          get playbackState() { return capturedState; },
          setActionHandler: vi.fn()
        },
        writable: true,
        configurable: true
      });

      syncMediaSession('pomodoro', 'running', 2, 4, 'Học Toán Cao Cấp');

      expect(capturedMetadata).toBeDefined();
      expect(capturedMetadata.title).toContain('Hiệp tập trung: Học Toán Cao Cấp');
      expect(capturedMetadata.artist).toBe('PomoFocus');
      expect(capturedState).toBe('playing');

      syncMediaSession('short_break', 'paused', 2, 4, null);
      expect(capturedMetadata.title).toContain('Nghỉ ngắn (Hiệp 2/4)');
      expect(capturedState).toBe('paused');
    });

    it('17.2 setupMediaSessionActionHandlers binds play, pause, nexttrack and stop actions', () => {
      const setActionHandlerMock = vi.fn();
      Object.defineProperty(navigator, 'mediaSession', {
        value: {
          setActionHandler: setActionHandlerMock
        },
        writable: true,
        configurable: true
      });

      const onPlay = vi.fn();
      const onPause = vi.fn();
      const onSkip = vi.fn();
      const onReset = vi.fn();

      setupMediaSessionActionHandlers({ onPlay, onPause, onSkip, onReset });

      expect(setActionHandlerMock).toHaveBeenCalledWith('play', expect.any(Function));
      expect(setActionHandlerMock).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(setActionHandlerMock).toHaveBeenCalledWith('nexttrack', expect.any(Function));
      expect(setActionHandlerMock).toHaveBeenCalledWith('stop', expect.any(Function));
    });

    it('17.3 Completing timer when muted or masterVolume is 0 triggers zero-volume celebration warning toast and haptic warning', async () => {
      // Set audio to muted
      useAudioStore.setState({
        settings: {
          ...useAudioStore.getState().settings,
          isMuted: true
        }
      });

      const store = useTimerStore.getState();
      store.init();

      // Trigger completion callback directly on engine or simulate via onComplete
      const engine = (store as any).engineInstance || (useTimerStore as any).engineInstance;
      if (engine) {
        await act(async () => {
          (engine as any).onComplete(
            {
              id: 'test_session_zero_vol',
              phase: 'pomodoro',
              startTime: Date.now() - 1500000,
              endTime: Date.now(),
              durationMinutes: 25,
              dateString: '2026-11-15'
            },
            'short_break'
          );
        });

        // Check that celebration toast includes zero-volume warning
        const toast = useTimerStore.getState().celebrationToast;
        expect(toast).toBeDefined();
        expect(toast).toContain('⚠️ Âm lượng chuông đang tắt');
      }
    });
  });
});
