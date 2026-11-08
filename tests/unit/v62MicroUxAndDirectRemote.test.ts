import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Pomofocus v6.2 — Micro UX & Direct YouTube Remote Verification Suite', () => {
  it('1. Verifies Ultra-thin 5px Scrollbar in src/index.css', () => {
    const cssPath = path.resolve('src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('width: 5px;');
    expect(cssContent).toContain('height: 5px;');
    expect(cssContent).toContain('background: rgba(255, 255, 255, 0.15);');
    expect(cssContent).toContain('background: rgba(255, 255, 255, 0.35);');
    expect(cssContent).toContain('scrollbar-width: thin;');
  });

  it('2. Verifies Direct YouTube Remote Toolbar in src/components/MediaWidget.tsx', () => {
    const mediaPath = path.resolve('src/components/MediaWidget.tsx');
    const mediaContent = fs.readFileSync(mediaPath, 'utf-8');

    expect(mediaContent).toContain('data-testid="input-media-direct-url"');
    expect(mediaContent).toContain('data-testid="btn-apply-direct-media"');
    expect(mediaContent).toContain('data-testid="btn-media-prev-video"');
    expect(mediaContent).toContain('data-testid="btn-media-toggle-play"');
    expect(mediaContent).toContain('data-testid="btn-media-next-video"');
    expect(mediaContent).toContain('data-testid="btn-toggle-media-fullscreen"');
    expect(mediaContent).toContain('data-testid="btn-toggle-media-picker"');
  });

  it('3. Verifies Apple Stepper Pill for Estimated Pomodoros in src/components/TasksWidget.tsx', () => {
    const tasksPath = path.resolve('src/components/TasksWidget.tsx');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

    expect(tasksContent).toContain('data-testid="input-estimated-pomodoros"');
    expect(tasksContent).toContain('Apple Stepper Pill');
    expect(tasksContent).toContain('Math.max(1, v - 1)');
    expect(tasksContent).toContain('Math.min(20, v + 1)');
    expect(tasksContent).toContain('font-mono font-semibold');
  });

  it('4. Verifies Apple Stepper Pills for Timer Durations in src/components/SettingsWidget.tsx', () => {
    const settingsPath = path.resolve('src/components/SettingsWidget.tsx');
    const settingsContent = fs.readFileSync(settingsPath, 'utf-8');

    expect(settingsContent).toContain('data-testid="settings-input-pomodoro-min"');
    expect(settingsContent).toContain('data-testid="settings-input-short-min"');
    expect(settingsContent).toContain('data-testid="settings-input-long-min"');
    expect(settingsContent).toContain('Math.max(1, timerSettings.pomodoroMinutes - 1)');
    expect(settingsContent).toContain('Math.min(120, timerSettings.pomodoroMinutes + 1)');
    expect(settingsContent).toContain('Math.max(1, timerSettings.shortBreakMinutes - 1)');
    expect(settingsContent).toContain('Math.min(60, timerSettings.shortBreakMinutes + 1)');
  });

  it('5. Verifies Soft Rounded Play/Pause Buttons in src/components/AudioWidget.tsx', () => {
    const audioPath = path.resolve('src/components/AudioWidget.tsx');
    const audioContent = fs.readFileSync(audioPath, 'utf-8');

    expect(audioContent).toContain('data-testid={`btn-toggle-track-${track.id}`}');
    expect(audioContent).toContain('rounded-full');
    expect(audioContent).toContain('w-8 h-8');
  });
});
