export const PRODUCTION_API_ORIGIN = 'https://pomofocus-workspace.vercel.app';

/**
 * Determines whether the frontend runs inside a standalone native runtime (Capacitor APK)
 * that lacks local serverless /api endpoints and must target the production Vercel backend.
 */
export function isNativeApiRuntime(): boolean {
  if (typeof window === 'undefined') return false;

  if (Boolean((window as any).Capacitor?.isNativePlatform?.())) {
    return true;
  }

  // Preserve Vitest/unit-test relative fetch mocks when Capacitor native bridge is not simulated
  const isVitest =
    (typeof process !== 'undefined' && Boolean(process.env?.VITEST)) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test');
  if (isVitest) {
    return false;
  }

  const loc = window.location;
  if (!loc) return false;
  if (loc.protocol === 'capacitor:' || loc.protocol === 'file:' || loc.protocol === 'ionic:') {
    return true;
  }

  // Capacitor Android WebView default origin with androidScheme: 'https' is https://localhost (no port)
  if (loc.protocol === 'https:' && loc.hostname === 'localhost' && !loc.port) {
    return true;
  }

  return false;
}

export function getApiBaseUrl(): string {
  return isNativeApiRuntime() ? PRODUCTION_API_ORIGIN : '';
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}
