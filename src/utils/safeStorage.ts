/**
 * SafeStorage Utility & Storage Schema Migration
 * 
 * Provides bulletproof localStorage operations with:
 * 1. Automatic in-memory fallback (MemoryStorage) on QuotaExceededError or Incognito/Private mode.
 * 2. Type-safe JSON serialization/deserialization with safeGetJSON & safeSetJSON.
 * 3. Schema migration (STORAGE_SCHEMA_VERSION = 1) purging obsolete mock stores and heavy arrays.
 */

export interface ISafeStorage {
  getItem(key: string, fallback?: string | null): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): void;
  clear(): void;
  safeGetJSON<T>(key: string, fallback: T): T;
  safeSetJSON<T>(key: string, value: T): boolean;
}

export class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

export function isQuotaExceededError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { name?: string; code?: number; number?: number };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    err.number === -2147024882
  );
}

class SafeStorageImpl implements ISafeStorage {
  private memoryFallback = new MemoryStorage();
  private useMemoryOnly = false;

  private isStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  public getItem(key: string, fallback: string | null = null): string | null {
    // 1. Check in-memory fallback first (for keys written/overwritten after fallback activation)
    const memVal = this.memoryFallback.getItem(key);
    if (memVal !== null) return memVal;

    // 2. Fall back to reading from localStorage if accessible
    if (this.isStorageAvailable()) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch {}
    }

    return fallback;
  }

  public setItem(key: string, value: string): boolean {
    const strVal = String(value);
    if (this.useMemoryOnly || !this.isStorageAvailable()) {
      this.memoryFallback.setItem(key, strVal);
      return true;
    }
    try {
      window.localStorage.setItem(key, strVal);
      this.memoryFallback.removeItem(key);
      return true;
    } catch (e) {
      if (isQuotaExceededError(e)) {
        console.warn(`[SafeStorage] QuotaExceededError writing key "${key}". Activating in-memory fallback.`);
        this.memoryFallback.setItem(key, strVal);
        return true;
      }
      // Security error / storage blocked
      this.useMemoryOnly = true;
      this.memoryFallback.setItem(key, strVal);
      return false;
    }
  }

  public removeItem(key: string): void {
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    this.memoryFallback.removeItem(key);
  }

  public clear(): void {
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.clear();
      } catch {}
    }
    this.memoryFallback.clear();
  }

  public safeGetJSON<T>(key: string, fallback: T): T {
    try {
      const raw = this.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  public safeSetJSON<T>(key: string, value: T): boolean {
    try {
      const str = JSON.stringify(value);
      return this.setItem(key, str);
    } catch (err) {
      console.warn(`[SafeStorage] safeSetJSON serialization error for key "${key}":`, err);
      return false;
    }
  }

  public _resetForTest(): void {
    this.useMemoryOnly = false;
    this.memoryFallback.clear();
  }
}

export const safeStorage: ISafeStorage & { _resetForTest?: () => void } = new SafeStorageImpl();

export const STORAGE_SCHEMA_VERSION = 1;

export const OBSOLETE_STORAGE_KEYS = [
  'pomodoro_study_rooms_store',
  'pomodoro_deleted_rooms_store',
  'pomodoro_coupons_store',
  'pomodoro_momo_orders_store',
  'pomodoro_processed_transactions_store',
  'pomodoro_study_users_store',
  'pomodoro_lofi_stream_url'
] as const;

export const OBSOLETE_STORAGE_PREFIXES = [
  'pomodoro_room_part_cnt_',
  'pomodoro_room_study_sec_'
] as const;

export function runStorageSchemaMigration(force = false): void {
  try {
    const currentVer = safeStorage.getItem('pomofocus_storage_schema_version');
    if (!force && currentVer === String(STORAGE_SCHEMA_VERSION)) {
      return;
    }

    // 1. Purge static obsolete keys
    for (const key of OBSOLETE_STORAGE_KEYS) {
      safeStorage.removeItem(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(key);
        } catch {}
      }
    }

    // 2. Purge dynamic prefix keys
    if (typeof window !== 'undefined' && window.localStorage) {
      const allKeys = new Set<string>();
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) allKeys.add(k);
        }
        Object.keys(window.localStorage).forEach((k) => allKeys.add(k));
      } catch {}

      for (const k of allKeys) {
        for (const prefix of OBSOLETE_STORAGE_PREFIXES) {
          if (k.startsWith(prefix)) {
            safeStorage.removeItem(k);
            try {
              window.localStorage.removeItem(k);
            } catch {}
            break;
          }
        }
      }
    }

    // 3. Purge `messages` array from `pomofocus_ai_store` if present in localStorage
    const rawAi = safeStorage.getItem('pomofocus_ai_store');
    if (rawAi) {
      try {
        const parsed = JSON.parse(rawAi);
        let modified = false;
        if (parsed && typeof parsed === 'object') {
          if (parsed.state && typeof parsed.state === 'object' && 'messages' in parsed.state) {
            delete (parsed.state as any).messages;
            modified = true;
          }
          if ('messages' in parsed) {
            delete (parsed as any).messages;
            modified = true;
          }
        }
        if (modified) {
          safeStorage.setItem('pomofocus_ai_store', JSON.stringify(parsed));
        }
      } catch (err) {
        console.warn('[SafeStorage] Could not clean pomofocus_ai_store messages:', err);
      }
    }

    // 4. Update schema version mark
    safeStorage.setItem('pomofocus_storage_schema_version', String(STORAGE_SCHEMA_VERSION));
  } catch (err) {
    console.warn('[SafeStorage] runStorageSchemaMigration error:', err);
  }
}
