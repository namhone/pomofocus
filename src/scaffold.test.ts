import { describe, it, expect } from 'vitest';

describe('Scaffold Environment Baseline', () => {
  it('xác minh môi trường test Vitest hoạt động bình thường', () => {
    expect(1 + 1).toBe(2);
  });

  it('xác minh đối tượng toàn cục browser window trong JSDOM', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});
