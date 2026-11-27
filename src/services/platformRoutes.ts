export type AppEnvironment = 'native' | 'desktop-web' | 'mobile-web';

// This is a presentation override, never an authentication or entitlement bypass.
export function getAppEnvironment(native: boolean, compact: boolean, search = ''): AppEnvironment {
  if (native) return 'native';
  if (!compact || new URLSearchParams(search).get('desktop') === '1') return 'desktop-web';
  return 'mobile-web';
}

export function isLearningRoute(path: string): boolean {
  const normalized = path.replace(/\/+$/, '') || '/';
  return ['/app', '/rooms', '/room', '/meet', '/calendar', '/dashboard', '/history', '/stats', '/settings'].includes(normalized)
    || normalized.startsWith('/rooms/') || normalized.startsWith('/room/');
}
