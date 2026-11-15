import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimerWidget } from '../../src/components/TimerWidget';
import { SettingsWidget } from '../../src/components/SettingsWidget';
import { SettingsView } from '../../src/components/SettingsView';
import { TasksWidget } from '../../src/components/TasksWidget';
import { TimerTestInterface } from '../../src/components/TimerTestInterface';
import { AiCompanionWidget } from '../../src/components/AiCompanionWidget';
import { haptics } from '../../src/utils/haptics';
import { copyToClipboard } from '../../src/utils/clipboard';

describe('Milestone 2 - Virtual Keyboard, Input Attributes, IME & Native Plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature 7: Virtual Keyboard & Input attributes (14 Inputs)', () => {
    it('attaches inputMode="numeric" and enterKeyHint to TimerWidget inputs', () => {
      render(<TimerWidget />);
      const pomoInput = screen.getByTestId('input-pomodoro-min');
      const shortInput = screen.getByTestId('input-short-min');
      const longInput = screen.getByTestId('input-long-min');

      expect(pomoInput.getAttribute('inputmode')).toBe('numeric');
      expect(pomoInput.getAttribute('enterkeyhint')).toBe('next');

      expect(shortInput.getAttribute('inputmode')).toBe('numeric');
      expect(shortInput.getAttribute('enterkeyhint')).toBe('next');

      expect(longInput.getAttribute('inputmode')).toBe('numeric');
      expect(longInput.getAttribute('enterkeyhint')).toBe('done');
    });

    it('attaches inputMode="numeric" and enterKeyHint to SettingsWidget inputs', () => {
      render(<SettingsWidget />);
      const pomoInput = screen.getByTestId('settings-input-pomodoro-min');
      const shortInput = screen.getByTestId('settings-input-short-min');
      const longInput = screen.getByTestId('settings-input-long-min');

      expect(pomoInput.getAttribute('inputmode')).toBe('numeric');
      expect(pomoInput.getAttribute('enterkeyhint')).toBe('next');

      expect(shortInput.getAttribute('inputmode')).toBe('numeric');
      expect(shortInput.getAttribute('enterkeyhint')).toBe('next');

      expect(longInput.getAttribute('inputmode')).toBe('numeric');
      expect(longInput.getAttribute('enterkeyhint')).toBe('done');
    });

    it('attaches inputMode="numeric" and enterKeyHint to SettingsView cycle inputs', () => {
      render(<SettingsView />);
      const pomoInput = screen.getByTestId('input-setting-pomodoro');
      const shortInput = screen.getByTestId('input-setting-short-break');
      const longInput = screen.getByTestId('input-setting-long-break');
      const roundsInput = screen.getByTestId('input-setting-rounds');

      expect(pomoInput.getAttribute('inputmode')).toBe('numeric');
      expect(pomoInput.getAttribute('enterkeyhint')).toBe('next');

      expect(shortInput.getAttribute('inputmode')).toBe('numeric');
      expect(shortInput.getAttribute('enterkeyhint')).toBe('next');

      expect(longInput.getAttribute('inputmode')).toBe('numeric');
      expect(longInput.getAttribute('enterkeyhint')).toBe('next');

      expect(roundsInput.getAttribute('inputmode')).toBe('numeric');
      expect(roundsInput.getAttribute('enterkeyhint')).toBe('done');
    });

    it('attaches inputMode="numeric" and enterKeyHint="done" to TasksWidget estimated pomodoros', () => {
      render(<TasksWidget />);
      const estimatedInput = screen.getByTestId('input-estimated-pomodoros');
      expect(estimatedInput.getAttribute('inputmode')).toBe('numeric');
      expect(estimatedInput.getAttribute('enterkeyhint')).toBe('done');
    });

    it('attaches inputMode="numeric" and enterKeyHint to TimerTestInterface inputs', () => {
      render(<TimerTestInterface />);
      const pomoInput = screen.getByTestId('input-pomodoro-min');
      const shortInput = screen.getByTestId('input-short-min');
      const longInput = screen.getByTestId('input-long-min');

      expect(pomoInput.getAttribute('inputmode')).toBe('numeric');
      expect(pomoInput.getAttribute('enterkeyhint')).toBe('next');

      expect(shortInput.getAttribute('inputmode')).toBe('numeric');
      expect(shortInput.getAttribute('enterkeyhint')).toBe('next');

      expect(longInput.getAttribute('inputmode')).toBe('numeric');
      expect(longInput.getAttribute('enterkeyhint')).toBe('done');
    });
  });

  describe('Feature 8: Vietnamese IME isComposing Protection', () => {
    it('blocks Enter send action in AiCompanionWidget when isComposing is true', () => {
      render(<AiCompanionWidget />);
      const input = screen.getByTestId('ai-prompt-input');
      expect(input.getAttribute('enterkeyhint')).toBe('send');

      fireEvent.change(input, { target: { value: 'Đang gõ tiếng việt' } });

      const preventDefaultSpy = vi.fn();
      fireEvent.keyDown(input, {
        key: 'Enter',
        nativeEvent: { isComposing: true } as any,
        isComposing: true,
        preventDefault: preventDefaultSpy,
      });

      // Enter is prevented from submitting prematurely while composing
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect((input as HTMLTextAreaElement).value).toBe('Đang gõ tiếng việt');
    });
  });

  describe('Feature 11: Native Plugins & Safe Fallbacks (Haptics & Clipboard)', () => {
    it('haptics triggers vibration fallback when native platform is not present', async () => {
      const vibrateSpy = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateSpy,
        writable: true,
        configurable: true,
      });

      await haptics.impact('light');
      expect(vibrateSpy).toHaveBeenCalledWith(10);

      await haptics.impact('medium');
      expect(vibrateSpy).toHaveBeenCalledWith(25);

      await haptics.notification('success');
      expect(vibrateSpy).toHaveBeenCalledWith([80, 40, 120]);
    });

    it('copyToClipboard copies text via navigator.clipboard and falls back gracefully', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });

      const success = await copyToClipboard('PomoFocus-v8.1-Test');
      expect(success).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith('PomoFocus-v8.1-Test');
    });

    it('copyToClipboard falls back to document.execCommand if clipboard.writeText rejects', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('DOMException: Document is not focused')),
        },
        writable: true,
        configurable: true,
      });

      const execMock = vi.fn().mockReturnValue(true);
      (document as any).execCommand = execMock;

      const success = await copyToClipboard('Fallback-Text');
      expect(success).toBe(true);
      expect(execMock).toHaveBeenCalledWith('copy');
    });
  });
});
