import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ALARM_CHIMES } from '../../src/data/alarmSounds';
import { useAudioStore } from '../../src/stores/useAudioStore';

describe('Pomofocus v6.3 — Audio Ducking, Crisp Chimes & Timer Clean UX', () => {
  it('should export the 4 high-end alarm chimes with complete metadata', () => {
    const chimeIds = ALARM_CHIMES.map((c) => c.id);
    expect(chimeIds).toContain('tibetan_bowl');
    expect(chimeIds).toContain('crystal_chime');
    expect(chimeIds).toContain('digital_alarm');
    expect(chimeIds).toContain('brass_bell');

    const tibetan = ALARM_CHIMES.find((c) => c.id === 'tibetan_bowl');
    expect(tibetan?.name).toContain('Tây Tạng');
    expect(tibetan?.url).toBeDefined();

    const crystal = ALARM_CHIMES.find((c) => c.id === 'crystal_chime');
    expect(crystal?.name).toContain('Pha Lê');

    const digital = ALARM_CHIMES.find((c) => c.id === 'digital_alarm');
    expect(digital?.name).toContain('Digital');

    const brass = ALARM_CHIMES.find((c) => c.id === 'brass_bell');
    expect(brass?.name).toContain('Chuông Đồng');
  });

  it('should have applyAudioDucking and restoreAudioDucking methods in useAudioStore', () => {
    const store = useAudioStore.getState();
    expect(typeof store.applyAudioDucking).toBe('function');
    expect(typeof store.restoreAudioDucking).toBe('function');
  });

  it('should maintain balanced Timer widget bounds in useLayoutStore and WidgetContainer', () => {
    const layoutStorePath = path.resolve(__dirname, '../../src/stores/useLayoutStore.ts');
    const layoutContent = fs.readFileSync(layoutStorePath, 'utf-8');
    expect(layoutContent).toContain('maxHeight: 340');
    expect(layoutContent).toContain('maxWidth: 440');

    const widgetContainerPath = path.resolve(__dirname, '../../src/components/WidgetContainer.tsx');
    const containerContent = fs.readFileSync(widgetContainerPath, 'utf-8');
    expect(containerContent).toContain('Math.min(520');
    expect(containerContent).toContain('Math.min(460');
  });

  it('should remove whitish smudge shadow from start button in TimerWidget', () => {
    const timerPath = path.resolve(__dirname, '../../src/components/TimerWidget.tsx');
    const timerContent = fs.readFileSync(timerPath, 'utf-8');
    expect(timerContent).not.toContain('shadow-[0_6px_20px_rgba(255,255,255,0.18)');
    expect(timerContent).toContain('data-testid="timer-start-btn"');
    expect(timerContent).toContain('shadow-md');
  });

  it('should suppress browser spin buttons on all minute inputs in TimerWidget', () => {
    const timerPath = path.resolve(__dirname, '../../src/components/TimerWidget.tsx');
    const timerContent = fs.readFileSync(timerPath, 'utf-8');
    expect(timerContent).toContain('input-pomodoro-min');
    expect(timerContent).toContain('input-short-min');
    expect(timerContent).toContain('input-long-min');
    expect(timerContent).toContain('[appearance:textfield]');
    expect(timerContent).toContain('[&::-webkit-inner-spin-button]:appearance-none');
    expect(timerContent).toContain('[-moz-appearance:textfield]');
  });

  it('should include global number spinner suppression rules in index.css', () => {
    const cssPath = path.resolve(__dirname, '../../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('input[type="number"]::-webkit-outer-spin-button');
    expect(cssContent).toContain('input[type="number"]::-webkit-inner-spin-button');
    expect(cssContent).toContain('-webkit-appearance: none');
  });
});
