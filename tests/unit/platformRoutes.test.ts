import { describe, expect, it } from 'vitest';
import { getAppEnvironment, isLearningRoute } from '../../src/services/platformRoutes';

describe('Three independent application environments', () => {
  it.each([true, false])('native wins over viewport compact=%s and query', compact => {
    expect(getAppEnvironment(true, compact, '?desktop=1')).toBe('native');
  });
  it('regular Web, including tablet width, uses Desktop', () => {
    expect(getAppEnvironment(false, false)).toBe('desktop-web');
  });
  it('compact Web uses the portal unless explicitly forced to Desktop', () => {
    expect(getAppEnvironment(false, true)).toBe('mobile-web');
    expect(getAppEnvironment(false, true, '?desktop=1')).toBe('desktop-web');
    expect(getAppEnvironment(false, true, '?desktop=0')).toBe('mobile-web');
  });
  it.each(['/app', '/rooms', '/rooms/', '/rooms/invite', '/room/invite', '/meet', '/calendar', '/dashboard', '/stats', '/history', '/settings'])('protects learning route %s', path => {
    expect(isLearningRoute(path)).toBe(true);
  });
  it.each(['/', '/download', '/billing', '/profile', '/login', '/signup', '/account-security', '/account/security', '/privacy', '/terms', '/contact', '/rooms-other'])('keeps public/account route %s outside the portal guard', path => {
    expect(isLearningRoute(path)).toBe(false);
  });
});
