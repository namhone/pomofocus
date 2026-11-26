import { describe, it, expect } from 'vitest';
import { imageLuminance, backgroundScrimOpacity } from '../../src/utils/backgroundContrast';
describe('Background visibility and adaptive scrim', () => {
  it('samples linear luminance instead of treating every wallpaper as bright', () => {
    expect(imageLuminance(new Uint8ClampedArray([0, 0, 0, 255]))).toBe(0);
    expect(imageLuminance(new Uint8ClampedArray([255, 255, 255, 255]))).toBe(1);
    expect(imageLuminance(new Uint8ClampedArray([128, 128, 128, 255]))).toBeCloseTo(.216, 2);
    expect(imageLuminance(new Uint8ClampedArray())).toBe(.5);
  });
  it('caps dark Earth/global dimming at 12% even with a legacy high setting', () => {
    expect(backgroundScrimOpacity(.04, 100, 92)).toBeLessThanOrEqual(.12);
    expect(backgroundScrimOpacity(.04, 100, 0)).toBe(0);
  });
  it('bright backgrounds receive stronger bounded dimming while local surfaces protect text', () => {
    expect(backgroundScrimOpacity(1, 100, 30)).toBeGreaterThan(.45);
    expect(backgroundScrimOpacity(1, 150, 80)).toBeLessThanOrEqual(.55);
  });
});
